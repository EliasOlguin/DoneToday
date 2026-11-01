import { apiFetch } from './client'

export type NotificationPreferences = {
  morningEnabled: boolean
  morningTime: string
  eveningEnabled: boolean
  eveningTime: string
  language: string
  weeklyEnabled?: boolean
  weeklyDay?: number
  weeklyTime?: string
  quietEnabled?: boolean
  quietStart?: string
  quietEnd?: string
  pausedThrough?: string | null
  showHabitNames?: boolean
}
export type NotificationSettings = {
  available: boolean
  publicKey?: string
  timeZoneId?: string
  preferences?: NotificationPreferences
  devices?: { id: number; createdAt: string }[]
}
async function request<T>(path: string, body?: object): Promise<T> {
  const response = await apiFetch(
    `/api/notifications${path}`,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  )
  if (!response.ok) throw new Error('notifications')
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>)
}
export const getNotificationSettings = () => request<NotificationSettings>('')
export const saveNotificationPreferences = (
  preferences: NotificationPreferences,
) => request<void>('/preferences', preferences)
export const subscribeDevice = (subscription: {
  endpoint: string
  p256dh: string
  auth: string
}) => request<{ id: number }>('/devices', subscription)
export const removeDevice = (id: number) =>
  request<void>(`/devices/${id}/remove`, {})
export const testPush = (id: number, language: string) =>
  request<void>(`/devices/${id}/test`, { language })
export type HabitReminderSettings = {
  available: boolean
  enabled?: boolean
  time?: string
  timeZoneId?: string
  snoozedUntil?: string | null
  snoozedToday?: boolean
}
export const getHabitReminder = (id: number) =>
  request<HabitReminderSettings>(`/habits/${id}`)
export const saveHabitReminder = (
  id: number,
  settings: { enabled: boolean; time: string; language: string },
) => request<void>(`/habits/${id}`, settings)
export const snoozeHabit = (id: number) =>
  request<void>(`/habits/${id}/snooze`, {})
