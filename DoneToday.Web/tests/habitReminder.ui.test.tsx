import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../src/i18n'
import i18n from '../src/i18n'
import HabitReminderSettings from '../src/components/HabitReminderSettings'
import {
  getHabitReminder,
  saveHabitReminder,
  snoozeHabit,
} from '../src/api/notifications'
vi.mock('../src/api/notifications', () => ({
  getHabitReminder: vi.fn(),
  saveHabitReminder: vi.fn(),
  snoozeHabit: vi.fn(),
}))
beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
  vi.mocked(getHabitReminder).mockResolvedValue({
    available: true,
    enabled: false,
    time: '18:00:00',
    timeZoneId: 'Europe/Berlin',
  })
})
function mount() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <HabitReminderSettings habitId={4} />
    </QueryClientProvider>,
  )
}
test('habit reminders are opt-in and save only the current habit', async () => {
  mount()
  const checkbox = await screen.findByLabelText('Remind me about this habit')
  expect((checkbox as HTMLInputElement).checked).toBe(false)
  await userEvent.click(checkbox)
  await userEvent.click(screen.getByRole('button', { name: 'Save reminder' }))
  await waitFor(() =>
    expect(saveHabitReminder).toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        enabled: true,
        time: '18:00:00',
        language: 'en',
      }),
    ),
  )
  expect(snoozeHabit).not.toHaveBeenCalled()
})

test('postponement confirmation survives refreshing the habit reminder', async () => {
  vi.mocked(getHabitReminder)
    .mockResolvedValueOnce({
      available: true,
      enabled: true,
      time: '18:00:00',
      timeZoneId: 'Europe/Berlin',
    })
    .mockResolvedValue({
      available: true,
      enabled: true,
      time: '18:00:00',
      timeZoneId: 'Europe/Berlin',
      snoozedToday: true,
    })
  vi.mocked(snoozeHabit).mockResolvedValue(undefined)
  mount()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Remind me in 30 minutes' }),
  )
  expect(
    await screen.findByText('Reminder postponed by 30 minutes.'),
  ).toBeTruthy()
})
