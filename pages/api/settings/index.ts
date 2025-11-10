import { prisma } from '@/lib/prisma'
import { NextApiResponse, NextApiRequest } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    const settings = await prisma.settings.findMany();
    res.json({
        "siteName": settings[0]?.siteName || null,
        "faviconUrl": settings[0]?.faviconUrl || null,
        "logoUrl": settings[0]?.logoUrl || null,
    });
} 