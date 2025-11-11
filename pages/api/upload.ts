/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm } from 'formidable'
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'
import { authOptions } from './auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS, hasAnyPermission } from '@/lib/auth/permissions'
import { isUserMemberOfGroup } from '@/lib/auth/groups'
import { z } from 'zod'

export const config = {
    api: {
        bodyParser: false,
    },
}

export default withAuth(handler, authOptions)

async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Allowed upload types and accepted mime prefixes
    // Added 'logo' and 'favicon' for admin-managed branding assets
    const allowedTypes = ['cover', 'banner', 'avatar', 'chapter', 'general', 'logo', 'favicon']
    const allowedMimePrefixes = ['image/']

    try {
        const auth = (req as any).auth
        const userId = auth?.userId
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const form = new IncomingForm({
            maxFileSize: 10 * 1024 * 1024, // 10MB
        })

        const [fields, files] = await new Promise<[Record<string, unknown>, Record<string, unknown>]>(
            (resolve, reject) => {
                form.parse(req, (err, fields, files) => {
                    if (err) reject(err)
                    resolve([fields as Record<string, unknown>, files as Record<string, unknown>])
                })
            }
        )

        const rawFile = Array.isArray(files.file) ? files.file[0] : files.file
        if (!rawFile) {
            return res.status(400).json({ error: 'No file uploaded' })
        }

        // Normalize commonly provided properties across formidable versions
        const file: { filepath?: string; filepathAlt?: string; mimetype?: string; mime?: string; originalFilename?: string } = rawFile as any

        const tempPath = (file.filepath || (file as any).path || (file as any).filepathAlt) as string | undefined
        const mimeType = (file.mimetype || (file as any).mime) as string | undefined

        const type = Array.isArray(fields.type) ? (fields.type[0] as string) : (fields.type as string | undefined)
        const webtoonId = Array.isArray(fields.webtoonId) ? (fields.webtoonId[0] as string) : (fields.webtoonId as string | undefined)
        const scanlationGroupIdField = Array.isArray(fields.scanlationGroupId) ? (fields.scanlationGroupId[0] as string) : (fields.scanlationGroupId as string | undefined)

        // Validate 'type'
        const typeSchema = z.string().optional().refine((t) => !t || allowedTypes.includes(t), {
            message: `Invalid type. Allowed: ${allowedTypes.join(', ')}`,
        })

        const typeParse = typeSchema.safeParse(type)
        if (!typeParse.success) {
            // cleanup temp if present
            if (tempPath) await fs.unlink(tempPath).catch(() => undefined)
            return res.status(400).json({ error: typeParse.error.issues[0].message })
        }

        // If this is a branding asset, require settings manage permission
        if (type === 'logo' || type === 'favicon') {
            const canManageSettings = await hasAnyPermission(userId, [PERMISSIONS.SETTINGS_MANAGE])
            if (!canManageSettings) {
                if (tempPath) await fs.unlink(tempPath).catch(() => undefined)
                return res.status(403).json({ error: 'Forbidden: insufficient permissions to upload branding assets' })
            }
        }

        // Validate mime type if available
        if (mimeType) {
            const ok = allowedMimePrefixes.some((p) => mimeType.startsWith(p))
            if (!ok) {
                if (tempPath) await fs.unlink(tempPath).catch(() => undefined)
                return res.status(400).json({ error: 'Unsupported file type' })
            }
        }

        if (!tempPath) {
            return res.status(400).json({ error: 'Uploaded file path missing' })
        }

        // Create uploads directory (runtime) if it doesn't exist
        // We store runtime uploads outside of `public/` so the Next.js build
        // artifact/static packaging does not prevent newly uploaded files
        // from being served without a server restart.
        const uploadDir = path.join(process.cwd(), 'uploads', type || 'general')
        await fs.mkdir(uploadDir, { recursive: true })

        // If this is a chapter upload, ensure the user is a member of the webtoon's group (or has upload/assign permission)
        if (type === 'chapter') {
            const canAssign = await hasAnyPermission(userId, [PERMISSIONS.GROUPS_UPLOAD, PERMISSIONS.GROUPS_ASSIGN])
            if (webtoonId) {
                const webtoon = await prisma.webtoon.findUnique({ where: { id: webtoonId }, include: { webtoonGroups: true } })
                if (!webtoon) {
                    if (tempPath) await fs.unlink(tempPath).catch(() => undefined)
                    return res.status(404).json({ error: 'Webtoon not found' })
                }
                if ((webtoon.webtoonGroups || []).length > 0 && !canAssign) {
                    // require membership in at least one of the groups that claimed this webtoon
                    let allowed = false
                    for (const wg of webtoon.webtoonGroups) {
                        if (await isUserMemberOfGroup(userId, wg.groupId)) { allowed = true; break }
                    }
                    if (!allowed) {
                        if (tempPath) await fs.unlink(tempPath).catch(() => undefined)
                        return res.status(403).json({ error: 'Forbidden: not a member of any group managing this webtoon' })
                    }
                }
            } else if (scanlationGroupIdField) {
                if (!canAssign) {
                    const isMember = await isUserMemberOfGroup(userId, scanlationGroupIdField)
                    if (!isMember) {
                        if (tempPath) await fs.unlink(tempPath).catch(() => undefined)
                        return res.status(403).json({ error: 'Forbidden: not a member of the target group' })
                    }
                }
            } else {
                // No webtoonId or group provided; require assign permission
                if (!canAssign) {
                    if (tempPath) await fs.unlink(tempPath).catch(() => undefined)
                    return res.status(403).json({ error: 'Forbidden: must provide webtoonId or belong to a group to upload chapter assets' })
                }
            }
        }

        // Generate unique filename
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(7)
        const filename = `${timestamp}-${randomString}.webp`
        const outPath = path.join(uploadDir, filename)

        // Convert to WebP and save, ensure cleanup on error
        try {
            // Special handling for banners: enforce a 16:9 output by cropping to cover
            const transformer = sharp(tempPath)

            if (type === 'banner') {
                // Resize & crop to 1600x900 (16:9) to guarantee banner aspect ratio
                await transformer.webp({ quality: 85 }).resize(1600, 900, { fit: 'cover' }).toFile(outPath)
            } else if (type === 'favicon') {
                // Favicons should be small (square). Resize to 64x64.
                await transformer.webp({ quality: 85 }).resize(64, 64, { fit: 'cover' }).toFile(outPath)
            } else if (type === 'logo') {
                // Logos: constrain width to 600px max
                await transformer.webp({ quality: 85 }).resize(600, null, { fit: 'inside', withoutEnlargement: true }).toFile(outPath)
            } else {
                await transformer.webp({ quality: 85 })
                    .resize(type === 'cover' ? 600 : type === 'avatar' ? 400 : 1200, null, {
                        fit: 'inside',
                        withoutEnlargement: true,
                    })
                    .toFile(outPath)
            }

            // Delete temp file
            await fs.unlink(tempPath).catch(() => undefined)

            // We keep returning a site-root URL path under /uploads so existing
            // client code does not need to change. A separate dynamic route
            // will serve files from the runtime `uploads/` folder.
            const url = `/uploads/${type || 'general'}/${filename}`

            return res.status(200).json({
                success: true,
                url,
                path: outPath,
            })
        } catch (err) {
            // On conversion error, ensure temp file removed
            await fs.unlink(tempPath).catch(() => undefined)
            console.error('Error processing upload:', err)
            return res.status(500).json({ error: 'Failed to process uploaded file' })
        }
    } catch (error) {
        console.error('Upload error:', error)
        return res.status(500).json({ error: 'Upload failed' })
    }
}
