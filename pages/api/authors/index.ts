import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const authors = await prisma.author.findMany({
            orderBy: {
                name: 'asc',
            },
        });
        return res.status(200).json({ authors });
    } catch (error) {
        console.error('Error fetching authors:', error);
        return res.status(500).json({ error: 'Failed to fetch authors' });
    }
}
