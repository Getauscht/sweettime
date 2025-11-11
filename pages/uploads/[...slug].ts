import { NextApiRequest, NextApiResponse } from 'next'
import path from 'path'
import fs from 'fs'

// Dynamic file server for runtime uploads.
// Serves files from the `uploads/` directory at the project root.
// This avoids relying on the Next.js `public/` static packaging which can
// be static at build time in some deployment setups.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const slug = (req.query.slug as string[]) || []
        if (slug.length === 0) return res.status(400).end('Bad request')

        // Prevent directory traversal
        const rel = path.normalize(slug.join('/'))
        if (rel.includes('..')) return res.status(400).end('Invalid path')

        const absolute = path.join(process.cwd(), 'uploads', rel)

        // Check file exists and is a file
        const stat = await fs.promises.stat(absolute).catch(() => null)
        if (!stat || !stat.isFile()) return res.status(404).end('Not found')

        // Determine content-type from extension (simple mapping)
        const ext = path.extname(absolute).toLowerCase()
        const mime = mimeFromExt(ext)

        res.setHeader('Content-Type', mime)
        // Let caches store these for a short time; uploads may change.
        res.setHeader('Cache-Control', 'public, max-age=60')

        const stream = fs.createReadStream(absolute)
        stream.on('error', () => res.status(500).end('Error reading file'))
        stream.pipe(res)
    } catch (err) {
        console.error('uploads route error:', err)
        res.status(500).end('Server error')
    }
}

function mimeFromExt(ext: string) {
    switch (ext) {
        case '.svg': return 'image/svg+xml'
        case '.png': return 'image/png'
        case '.jpg':
        case '.jpeg': return 'image/jpeg'
        case '.webp': return 'image/webp'
        case '.gif': return 'image/gif'
        case '.ico': return 'image/x-icon'
        default: return 'application/octet-stream'
    }
}
