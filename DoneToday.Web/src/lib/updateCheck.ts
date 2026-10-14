export function bindUpdateChecks(
  target: Window,
  current: string,
  notify: (version: string) => void,
) {
  let active = true
  let pending = false
  let lastAttempt = -Infinity
  let request: AbortController | null = null
  async function check() {
    if (
      !active ||
      pending ||
      target.document.visibilityState === 'hidden' ||
      target.navigator.onLine === false ||
      Date.now() - lastAttempt < 60_000
    )
      return
    pending = true
    lastAttempt = Date.now()
    request = new AbortController()
    const timeout = target.setTimeout(() => request?.abort(), 5000)
    try {
      const response = await target.fetch('/api/version', {
        cache: 'no-store',
        signal: request.signal,
      })
      if (!response.ok) return
      const data: unknown = await response.json()
      const version =
        data && typeof data === 'object' && 'version' in data
          ? data.version
          : null
      if (
        active &&
        typeof version === 'string' &&
        /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version) &&
        version !== current
      )
        notify(version)
    } catch {
      // A sleeping server, old release or offline connection should not interrupt the app.
    } finally {
      target.clearTimeout(timeout)
      pending = false
    }
  }
  const verify = () => {
    void check()
  }
  const timer = target.setInterval(verify, 180_000)
  target.addEventListener('focus', verify)
  target.addEventListener('online', verify)
  target.document.addEventListener('visibilitychange', verify)
  verify()
  return () => {
    active = false
    request?.abort()
    target.clearInterval(timer)
    target.removeEventListener('focus', verify)
    target.removeEventListener('online', verify)
    target.document.removeEventListener('visibilitychange', verify)
  }
}
