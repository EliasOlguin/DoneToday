import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import TodayPage from '../src/pages/TodayPage'
import i18n from '../src/i18n'

const demo = vi.hoisted(() => ({
  name: 'Lelu' as string | null,
  instant: '2026-10-20T18:00:00Z',
}))
vi.mock('../src/hooks/useSession', () => ({
  useSession: () => ({
    data: { id: 1, displayName: demo.name, timeZoneId: 'Europe/Berlin' },
  }),
}))
vi.mock('../src/hooks/useNow', () => ({ useNow: () => new Date(demo.instant) }))
vi.mock('../src/api/today', () => ({ getTodayHabits: async () => [] }))
vi.mock('../src/api/habits', () => ({
  getHabits: async () => [],
  completeHabit: vi.fn(),
  undoHabitCompletion: vi.fn(),
}))
vi.mock('../src/api/progress', () => ({
  getWeeklyProgress: async () => ({
    scheduled: 0,
    completed: 0,
    completionRate: 0,
    days: [],
  }),
}))

beforeEach(() => {
  demo.name = 'Lelu'
  demo.instant = '2026-10-20T18:00:00Z'
})

async function mount(language = 'en') {
  await i18n.changeLanguage(language)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const router = createMemoryRouter(
    [
      { path: '/today', element: <TodayPage /> },
      { path: '/habits/new', element: <h1>New habit form</h1> },
    ],
    { initialEntries: ['/today'] },
  )
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

test.each([
  ['en', 'Good evening, Lelu!'],
  ['es', '¡Buenas noches, Lelu!'],
  ['de', 'Guten Abend, Lelu!'],
])(
  'personalizes the %s greeting and preserves the create-habit action',
  async (language, greeting) => {
    const router = await mount(language)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(greeting)
    const header = screen.getByRole('heading', { level: 1 }).closest('header')!
    expect(header.querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-10-20',
    )
    expect(header.textContent).toContain('Europe/Berlin')
    await userEvent.click(
      screen.getByRole('link', { name: i18n.t('common.create') }),
    )
    expect(router.state.location.pathname).toBe('/habits/new')
  },
)

test.each([null, '   '])(
  'uses the original greeting when no usable display name is available (%s)',
  async (name) => {
    demo.name = name
    await mount()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Good evening!',
    )
  },
)

test.each([
  ['2026-10-20T09:59:00Z', 'Good morning, Lelu!'],
  ['2026-10-20T10:00:00Z', 'Good afternoon, Lelu!'],
  ['2026-10-20T16:00:00Z', 'Good evening, Lelu!'],
])(
  'uses the account time zone to select the greeting at %s',
  async (instant, greeting) => {
    demo.instant = instant
    await mount()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(greeting)
  },
)
