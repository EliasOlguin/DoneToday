import { apiFetch } from './client'
import { ApiError } from './errors'

export function detectTimeZone() {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export async function updateProfile(displayName: string) {
  const response = await apiFetch('/api/profile/name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  })
  if (!response.ok) throw new ApiError('errors.generic')
  return response.json() as Promise<{ displayName: string | null }>
}

export async function deleteAccount(
  email: string,
  password: string,
  authenticatorCode: string,
) {
  const response = await apiFetch('/api/profile/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, authenticatorCode }),
  })
  if (!response.ok) throw new ApiError('profile.deleteError')
}

export async function saveTimeZone(
  timeZoneId: string,
  initializeOnly = false,
  signal?: AbortSignal,
): Promise<{ timeZoneId: string }> {
  const response = await apiFetch('/api/profile/time-zone', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeZoneId, initializeOnly }),
  })
  if (!response.ok) throw new ApiError('errors.generic')
  return response.json()
}
