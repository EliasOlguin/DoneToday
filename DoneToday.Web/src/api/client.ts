import { ApiError } from './errors'

export async function apiFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  const method = options.method?.toUpperCase() ?? 'GET'
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = await fetch('/api/auth/csrf', { cache: 'no-store' })
    if (!csrf.ok) throw new ApiError('errors.generic')
    const { token } = (await csrf.json()) as { token: string }
    headers.set('X-CSRF-TOKEN', token)
  }
  const response = await fetch(url, { ...options, headers })
  if (
    response.status === 401 &&
    (!url.startsWith('/api/auth/') ||
      url === '/api/auth/logout' ||
      (url.startsWith('/api/auth/two-factor') &&
        url !== '/api/auth/two-factor/login') ||
      url === '/api/auth/external/connections')
  ) {
    window.dispatchEvent(new Event('session-expired'))
    throw new ApiError('auth.sessionExpired')
  }
  return response
}
