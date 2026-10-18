import { apiFetch } from './client'
import { detectTimeZone, saveTimeZone } from './profile'

export type Session = {
  id: number
  email: string
  timeZoneId: string | null
  displayName: string | null
  hasPassword: boolean
  twoFactorEnabled: boolean
}
let previousUserId: number | null | undefined
let previousTimeZone: string | null | undefined

export async function getSession(
  signal?: AbortSignal,
): Promise<Session | null> {
  const response = await fetch('/api/auth/me', { cache: 'no-store', signal })
  if (!response.ok && response.status !== 401) throw new Error('request')
  const session: Session | null =
    response.status === 401 ? null : await response.json()
  if (session && !session.timeZoneId) {
    const preference = await saveTimeZone(detectTimeZone(), true, signal)
    session.timeZoneId = preference.timeZoneId
  }
  const changed =
    previousUserId !== undefined && previousUserId !== (session?.id ?? null)
  const firstAuthenticated = previousUserId === undefined && session !== null
  if (changed) {
    window.dispatchEvent(new Event('account-changed'))
  }
  if (
    !changed &&
    previousTimeZone !== undefined &&
    previousTimeZone !== session?.timeZoneId
  )
    window.dispatchEvent(new Event('time-zone-changed'))
  previousTimeZone = session?.timeZoneId
  previousUserId = session?.id ?? null
  if (changed || firstAuthenticated)
    window.dispatchEvent(new Event('session-updated'))
  return session
}

export async function authPost<T = void>(
  path: string,
  body: object = {},
): Promise<T> {
  const response = await apiFetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    if (response.status === 429)
      throw Object.assign(new Error('rate'), {
        retryAfter: Math.min(
          300,
          Math.max(1, Number(response.headers.get('Retry-After')) || 60),
        ),
      })
    if (response.status === 503) throw new Error('email')
    throw new Error('invalid')
  }
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}
