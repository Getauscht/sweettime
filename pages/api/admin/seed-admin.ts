import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'
import { initializeRBAC } from '@/lib/auth/permissions'
import { z } from 'zod'

/**
 * API para criar um usuário Admin via POST /api/admin/seed-admin
 *
 * Body (optional): {
 *   email?: string,
 *   password?: string,
 *   name?: string
 * }
 *
 * If body is omitted, default credentials are used:
 *   email: process.env.SEED_ADMIN_EMAIL || 'admin@storyverse.com'
 *   password: process.env.SEED_ADMIN_PASSWORD || 'admin123'
 *   name: process.env.SEED_ADMIN_NAME || 'Admin User'
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Safety: prevent accidental admin seeding in production. Require SEED_ADMIN_KEY header when NODE_ENV=production.
    if (process.env.NODE_ENV === 'production') {
        const seedKey = process.env.SEED_ADMIN_KEY
        const provided = (req.headers['x-seed-admin-key'] as string) || ''

        if (!seedKey) {
            return res.status(403).json({ error: 'Forbidden', message: 'Seed endpoint disabled in production' })
        }

        if (!provided || provided !== seedKey) {
            return res.status(403).json({ error: 'Forbidden', message: 'Invalid or missing seed key' })
        }
    }

    try {
        const body = req.body || {}

        const schema = z.object({
            email: z.string().email().optional(),
            password: z.string().min(6).optional(),
            name: z.string().optional(),
        })

        const parsed = schema.safeParse(body)
        if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() })

        const email = (parsed.data.email as string) || process.env.SEED_ADMIN_EMAIL || 'admin@storyverse.com'
        const password = (parsed.data.password as string) || process.env.SEED_ADMIN_PASSWORD || 'admin123'
        const name = (parsed.data.name as string) || process.env.SEED_ADMIN_NAME || 'Admin User'

        // Ensure RBAC roles and permissions exist
        let adminRole = await prisma.role.findFirst({
            where: {
                OR: [{ name: 'admin' }, { name: 'Admin' }],
            },
        })

        if (!adminRole) {
            await initializeRBAC()
            adminRole = await prisma.role.findFirst({
                where: {
                    OR: [{ name: 'admin' }, { name: 'Admin' }],
                },
            })
        }

        if (!adminRole) {
            return res.status(500).json({ error: 'Admin role not found after initializing RBAC.' })
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return res.status(200).json({
                message: 'User already exists',
                user: { id: existingUser.id, email: existingUser.email, name: existingUser.name, roleId: existingUser.roleId },
            })
        }

        // Hash password using project helper
        const hashedPassword = await hashPassword(password)

        // Create admin user (idempotent)
        const user = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                roleId: adminRole.id,
                status: 'active',
                emailVerified: new Date(),
            },
        })

        // Try to log activity (non-fatal)
        try {
            await prisma.activityLog.create({
                data: {
                    action: 'create_admin',
                    entityType: 'User',
                    entityId: user.id,
                    details: `Usuário admin criado: ${user.email}`,
                    performedBy: 'system',
                },
            })
        } catch (e) {
            console.warn('Activity log failed:', e)
        }

        return res.status(201).json({
            message: 'Admin user created successfully',
            user: { id: user.id, email: user.email, name: user.name, role: adminRole.name },
            credentials: { email, password: process.env.SEED_ADMIN_PASSWORD ? 'from_env' : password },
        })
    } catch (error) {
        console.error('Error creating admin:', error)
        return res.status(500).json({ error: 'Failed to create admin user' })
    }
}
