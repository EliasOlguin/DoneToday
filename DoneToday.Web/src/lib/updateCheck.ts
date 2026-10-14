function parseVersion(value: string) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?$/.exec(value)
  return match
    ? { core: match.slice(1, 4).map(BigInt), pre: match[4]?.split('.') }
    : null
}

export function isNewerRelease(current: string, candidate: string) {
  const from = parseVersion(current)
  const to = parseVersion(candidate)
  if (!from || !to) return false
  for (let i = 0; i < 3; i++) {
    if (from.core[i] !== to.core[i]) return to.core[i] > from.core[i]
  }
  if (!from.pre || !to.pre) return Boolean(from.pre && !to.pre)
  for (let i = 0; i < Math.max(from.pre.length, to.pre.length); i++) {
    const a = from.pre[i],
      b = to.pre[i]
    if (a === b) continue
    if (a === undefined || b === undefined) return a === undefined
    const aNumeric = /^\d+$/.test(a),
      bNumeric = /^\d+$/.test(b)
    if (aNumeric && bNumeric) {
      if (BigInt(a) !== BigInt(b)) return BigInt(b) > BigInt(a)
      continue
    }
    if (aNumeric !== bNumeric) return aNumeric
    return b > a
  }
  return false
}

export function bindUpdateChecks(
  target: Window,
  current: string,
  notify: (version: string) => void,
  enabled = true,
) {
  if (!enabled) return () => {}
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
        isNewerRelease(current, version)
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
