import { apiFetch } from './client'
import { ApiError } from './errors'

export function detectTimeZone() {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
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
