import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../src/i18n'
import i18n from '../src/i18n'
import NotificationSettings from '../src/components/NotificationSettings'
import {
  getNotificationSettings,
  saveNotificationPreferences,
} from '../src/api/notifications'
import { enablePush } from '../src/lib/push'

vi.mock('../src/api/notifications', () => ({
  getNotificationSettings: vi.fn(),
  saveNotificationPreferences: vi.fn(),
  testPush: vi.fn(),
  removeDevice: vi.fn(),
}))
vi.mock('../src/lib/push', () => ({
  pushStatus: () => 'available',
  enablePush: vi.fn(),
  disablePush: vi.fn(),
  readDeviceId: () => null,
}))

beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
  vi.mocked(getNotificationSettings).mockResolvedValue({
    available: true,
    publicKey: 'public-key',
    timeZoneId: 'Europe/Berlin',
    devices: [],
    preferences: {
      morningEnabled: false,
      morningTime: '09:00:00',
      eveningEnabled: false,
      eveningTime: '20:00:00',
      language: 'en',
    },
  })
})
function mount(guest = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <NotificationSettings userId={1} isGuest={guest} />
    </QueryClientProvider>,
  )
}
test('notification permission is requested only after an explicit activation click', async () => {
  vi.mocked(enablePush).mockResolvedValue(4)
  mount()
  const activate = await screen.findByRole('button', {
    name: 'Enable on this device',
  })
  expect(enablePush).not.toHaveBeenCalled()
  await userEvent.click(activate)
  await waitFor(() => expect(enablePush).toHaveBeenCalledWith('public-key', 1))
})
test('daily schedules are opt-in and save the selected local time and language', async () => {
  vi.mocked(saveNotificationPreferences).mockResolvedValue(undefined)
  mount()
  const morning = await screen.findByLabelText('Start of the day')
  expect((morning as HTMLInputElement).checked).toBe(false)
  await userEvent.click(morning)
  await userEvent.click(
    screen.getByRole('button', { name: 'Save notification settings' }),
  )
  await waitFor(() =>
    expect(saveNotificationPreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        morningEnabled: true,
        eveningEnabled: false,
        morningTime: '09:00:00',
        language: 'en',
      }),
    ),
  )
})
test('guest accounts see an explanation without fetching private notification settings', async () => {
  mount(true)
  expect(
    await screen.findByText('Create an account to enable reminders.'),
  ).toBeTruthy()
  expect(getNotificationSettings).not.toHaveBeenCalled()
})
test('a failed save keeps an error visible and does not claim success', async () => {
  vi.mocked(saveNotificationPreferences).mockRejectedValue(new Error('network'))
  mount()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Save notification settings' }),
  )
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.queryByText('Notification settings saved.')).toBeNull()
})
test('weekly follow-up, quiet hours and pausing are optional and saved together', async () => {
  vi.mocked(saveNotificationPreferences).mockResolvedValue(undefined)
  mount()
  await userEvent.click(await screen.findByLabelText('Weekly summary'))
  await userEvent.click(screen.getByLabelText('Quiet hours'))
  await userEvent.click(
    screen.getByRole('button', { name: 'Save notification settings' }),
  )
  await waitFor(() =>
    expect(saveNotificationPreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        weeklyEnabled: true,
        quietEnabled: true,
        showHabitNames: false,
      }),
    ),
  )
})
