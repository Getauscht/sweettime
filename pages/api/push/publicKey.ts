import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const key = process.env.VAPID_PUBLIC_KEY || ''
    return res.status(200).json({ publicKey: key })
}
