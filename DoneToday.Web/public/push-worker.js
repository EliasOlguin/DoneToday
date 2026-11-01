/* Push only: no API response or authenticated page is cached. */
function safeDestination(value) {
  try {
    const url = new URL(value || '/today', self.location.origin)
    return url.origin === self.location.origin &&
      /^\/(today|habits\/\d+|progress)$/.test(url.pathname)
      ? url.pathname
      : '/today'
  } catch {
    return '/today'
  }
}
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() || {}
  } catch {
    /* Always show a visible fallback. */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'DoneToday', {
      body: data.body || 'DoneToday',
      icon: '/icons/app-192.png',
      badge: '/icons/app-192.png',
      tag: data.tag || 'donetoday',
      data: { url: safeDestination(data.url) },
    }),
  )
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(
    safeDestination(event.notification.data?.url),
    self.location.origin,
  ).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      )
      if (existing) {
        await existing.navigate(url)
        return existing.focus()
      }
      return self.clients.openWindow(url)
    })(),
  )
})
