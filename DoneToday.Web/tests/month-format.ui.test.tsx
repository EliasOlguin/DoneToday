import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MonthlyProgress from '../src/components/MonthlyProgress'
import i18n from '../src/i18n'

vi.mock('../src/hooks/useSession', () => ({
  useSession: () => ({ data: { timeZoneId: 'Europe/Berlin' } }),
}))
vi.mock('../src/hooks/useNow', () => ({
  useNow: () => new Date('2026-10-14T08:00:00Z'),
}))
vi.mock('../src/api/progress', () => ({
  getMonthlyProgress: async () => ({
    startDate: '2026-10-01',
    today: '2026-10-14',
    scheduled: 0,
    completed: 0,
    completionRate: 0,
    days: [],
  }),
  getQuantityProgress: async () => ({ habits: [] }),
}))

test.each([
  ['es', 'octubre de 2026'],
  ['en', 'October 2026'],
  ['de', 'Oktober 2026'],
])('keeps native month casing in both %s headings', async (language, label) => {
  await i18n.changeLanguage(language)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  render(
    <QueryClientProvider client={client}>
      <MonthlyProgress />
    </QueryClientProvider>,
  )
  const period = screen.getByRole('heading', { level: 2, name: label })
  const calendar = screen.getByRole('heading', { level: 3 })
  expect(calendar.textContent).toContain(label)
  // CSS capitalization would alter the rendered Spanish connector despite correct textContent.
  expect(period.classList.contains('capitalize')).toBe(false)
  expect(calendar.querySelector('.capitalize')).toBeNull()
  await screen.findByText(i18n.t('month.help'))
  client.clear()
})
