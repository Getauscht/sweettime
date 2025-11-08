/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../../auth/[...nextauth]'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { isUserMemberOfGroup } from '@/lib/auth/groups'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { v4 as uuidv4 } from 'uuid'
import nodemailer from 'nodemailer'

export default withAuth(async function handler(req: NextApiRequest, res: NextApiResponse) {
    const groupId = (req.query.id as string) || (req.query['id[]'] as any)
    if (!groupId || typeof groupId !== 'string') return res.status(400).json({ error: 'Invalid group id' })

    const userId = (req as any).auth?.userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    // only leader or admin can create invites
    const isMember = await isUserMemberOfGroup(userId, groupId)
    const selfMember = isMember ? await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } }) : null
    const isLeader = selfMember?.role === 'LEADER'
    const isAdmin = await hasPermission(userId, PERMISSIONS.ROLES_VIEW as any).catch(() => false)
    if (!isLeader && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

    if (req.method === 'GET') {
        try {
            const invites = await prisma.invite.findMany({ where: { groupId }, orderBy: { createdAt: 'desc' } })
            return res.status(200).json({ invites })
        } catch (err) {
            console.error('Error listing invites:', err)
            return res.status(500).json({ error: 'Failed to list invites' })
        }
    }

    if (req.method === 'POST') {
        try {
            const { email } = req.body as { email: string }
            if (!email) return res.status(400).json({ error: 'email is required' })

            const token = uuidv4()
            const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 days

            const invite = await prisma.invite.create({ data: { email, token, groupId, createdById: userId, expiresAt } })

            // try to send email if SMTP configured
            try {
                if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
                    const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
                    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite?token=${invite.token}&email=${encodeURIComponent(invite.email)}`
                    await transporter.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to: invite.email, subject: `You're invited to join ${invite.groupId}`, text: `You've been invited to join a Scanlation Group. Click to accept: ${inviteUrl}` })
                }
            } catch (mailErr) {
                console.error('Failed sending invite email:', mailErr)
            }

            return res.status(200).json({ invite })
        } catch (err) {
            console.error('Error creating invite:', err)
            return res.status(500).json({ error: 'Failed to create invite' })
        }
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
}, authOptions)
