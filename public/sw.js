self.addEventListener('push', function(event) {
  try {
    const data = event.data ? event.data.json() : {}
    const title = data.title || 'Sweettime'
    const body = data.body || ''
    const options = {
      body,
      data: data.data || {},
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    }
    event.waitUntil(self.registration.showNotification(title, options))
  } catch (e) {
    console.error('Error in push handler', e)
  }
})

self.addEventListener('notificationclick', function(event) {
    event.notification.close()
    const url = event.notification?.data?.url || '/'
    const notificationId = event.notification?.data?.notificationId

    // If we have a notificationId, mark it as read on the server before navigating.
    const markReadPromise = (notificationId && self.registration) ?
        fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ notificationId })
        }).catch((e) => { /* ignore errors */ }) : Promise.resolve()

    event.waitUntil(
        (async () => {
            await markReadPromise

            const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i]
                try {
                    if (client.url === url && 'focus' in client) return client.focus()
                } catch (e) { /* ignore */ }
            }
            if (clients.openWindow) return clients.openWindow(url)
        })()
    )
})
