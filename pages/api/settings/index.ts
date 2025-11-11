import { prisma } from '@/lib/prisma'
import { NextApiResponse, NextApiRequest } from "next";
import { redis } from '@/lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
        return;
    }

    const cacheKey = 'settings_api_response';

    const cachedResponse = await redis.get(cacheKey);
    if (cachedResponse) { 
        res.json(JSON.parse(cachedResponse));
        return;
    } else {
        const settings = await prisma.settings.findMany();
        res.json({
            "siteName": settings[0]?.siteName || null,
            "faviconUrl": settings[0]?.faviconUrl || null,
            "logoUrl": settings[0]?.logoUrl || null,
        });
        redis.set(cacheKey, JSON.stringify({
            "siteName": settings[0]?.siteName || null,
            "faviconUrl": settings[0]?.faviconUrl || null,
            "logoUrl": settings[0]?.logoUrl || null,
        }));
    }
} 