import { apiFetch } from './client'

export type Session = { id: number; email: string }
let previousUserId: number | null | undefined

export async function getSession(): Promise<Session | null> {
  const response = await fetch('/api/auth/me', { cache: 'no-store' })
  if (!response.ok && response.status !== 401) throw new Error('request')
  const session: Session | null =
    response.status === 401 ? null : await response.json()
  if (
    previousUserId !== undefined &&
    previousUserId !== (session?.id ?? null)
  ) {
    window.dispatchEvent(new Event('account-changed'))
  }
  previousUserId = session?.id ?? null
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
    if (response.status === 429) throw new Error('rate')
    if (response.status === 503) throw new Error('email')
    throw new Error('invalid')
  }
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}
