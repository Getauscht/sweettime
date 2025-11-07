import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push'

export type NotificationCreateInput = {
  userId: string
  type: string
  title: string
  message: string
  link?: string | null
}

export async function createNotificationAndPush(item: NotificationCreateInput) {
  const rec = await prisma.notification.create({ data: item })

  try {
    await sendPushToUser(item.userId, {
      title: item.title,
      body: item.message,
      data: { url: item.link || '/', notificationId: rec.id },
    })
  } catch (err) {
    console.warn('Failed to send push for notification', item.userId, err)
  }
}

export async function createNotificationsAndPushMany(items: NotificationCreateInput[]) {
  if (!items || items.length === 0) return

  // Create notifications one by one so we can obtain their IDs to include
  // in the push payload. Using createMany does not return the created IDs.
  const created: Array<{ id: string; userId: string; link?: string | null; title: string; message: string }> = []

  for (const item of items) {
    try {
      const rec = await prisma.notification.create({ data: item })
      created.push({ id: rec.id, userId: rec.userId, link: rec.link, title: rec.title, message: rec.message })
    } catch (err) {
      console.warn('Failed to create notification record', item, err)
    }
  }

  for (const c of created) {
    try {
      await sendPushToUser(c.userId, {
        title: c.title,
        body: c.message,
        data: { url: c.link || '/', notificationId: c.id },
      })
    } catch (err) {
      console.warn('Failed to send push for notification (many)', c.userId, err)
    }
  }
}

export default {
  createNotificationAndPush,
  createNotificationsAndPushMany,
}
