import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, Route, RouterProvider, Routes } from 'react-router'
import type { ReactNode } from 'react'
import '../src/i18n'
import i18n from '../src/i18n'
import { ApiError } from '../src/api/errors'
import HabitProgressControl from '../src/components/HabitProgressControl'
import UnsavedChangesGuard from '../src/components/UnsavedChangesGuard'
import HabitFormPage from '../src/pages/HabitFormPage'
import HabitsPage from '../src/pages/HabitsPage'
import MonthlyProgress from '../src/components/MonthlyProgress'
import NetworkActivity from '../src/components/NetworkActivity'
import { useEmailResend } from '../src/hooks/useEmailResend'
import RegisterPage from '../src/pages/RegisterPage'
import { createHabit, getHabits, recordHabitProgress } from '../src/api/habits'
import { getMonthlyProgress, getQuantityProgress } from '../src/api/progress'
import { authPost } from '../src/api/auth'

vi.mock('../src/api/habits', () => ({
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  getHabitDetail: vi.fn(),
  getHabits: vi.fn(),
  recordHabitProgress: vi.fn(),
}))
vi.mock('../src/api/progress', () => ({
  getMonthlyProgress: vi.fn(),
  getQuantityProgress: vi.fn(),
}))
vi.mock('../src/api/auth', () => ({ authPost: vi.fn() }))
vi.mock('../src/hooks/useSession', () => ({
  useSession: () => ({ data: { id: 1, timeZoneId: 'UTC' } }),
}))
vi.mock('../src/components/GoogleButton', () => ({ default: () => null }))
const progress = {
  date: '2026-10-18',
  target: 2,
  unit: 'l' as const,
  amount: 0,
  revision: 0,
  isScheduled: true,
  entries: [],
}
function client() {
  const result = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })
  result.setQueryData(['session'], { id: 1 })
  return result
}
function mount(element: ReactNode, location = '/', guarded = false) {
  const cache = client()
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <>
            {guarded && <UnsavedChangesGuard />}
            {element}
          </>
        ),
      },
    ],
    { initialEntries: [location] },
  )
  render(
    <QueryClientProvider client={cache}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { cache, router, user: userEvent.setup() }
}
beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
})

describe('U01: quantity recovery and security', () => {
  test('keeps input on failure and retries the identical operation, then updates confirmed cache', async () => {
    vi.mocked(recordHabitProgress)
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce({ ...progress, amount: 0.25, revision: 1 })
    const { user, cache } = mount(
      <HabitProgressControl id={7} name="Water" progress={progress} />,
    )
    cache.setQueryData(['today'], [{ id: 7, progress, isCompleted: false }])
    await user.click(screen.getByRole('button', { name: 'Record amount' }))
    await user.type(screen.getByRole('spinbutton'), '0.25')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('button', { name: 'Try again' })
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe(
      '0.25',
    )
    expect((screen.getByRole('spinbutton') as HTMLInputElement).disabled).toBe(
      true,
    )
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(recordHabitProgress).toHaveBeenCalledTimes(2))
    expect(vi.mocked(recordHabitProgress).mock.calls[1]).toEqual(
      vi.mocked(recordHabitProgress).mock.calls[0],
    )
    await waitFor(() => expect(screen.queryByRole('spinbutton')).toBeNull())
    expect(
      cache.getQueryData<{ progress: typeof progress }[]>(['today'])?.[0]
        .progress.amount,
    ).toBe(0.25)
  })
  test('a conflict preserves input and requires review instead of blind retry', async () => {
    vi.mocked(recordHabitProgress).mockRejectedValueOnce(
      new ApiError('measure.changed'),
    )
    const { user } = mount(
      <HabitProgressControl id={7} name="Water" progress={progress} />,
    )
    await user.click(screen.getByRole('button', { name: 'Record amount' }))
    await user.type(screen.getByRole('spinbutton'), '0.5')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('button', { name: 'Review current total' })
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe(
      '0.5',
    )
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    await user.click(
      screen.getByRole('button', { name: 'Review current total' }),
    )
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('0')
    expect(recordHabitProgress).toHaveBeenCalledTimes(1)
  })
  test('a pending retry cannot be submitted under another account', async () => {
    vi.mocked(recordHabitProgress).mockRejectedValue(new TypeError('offline'))
    const { cache, user } = mount(
      <HabitProgressControl id={7} name="Water" progress={progress} />,
    )
    await user.click(screen.getByRole('button', { name: /250/ }))
    await screen.findByRole('button', { name: 'Try again' })
    cache.setQueryData(['session'], { id: 2 })
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        i18n.t('auth.sessionExpired'),
      ),
    )
    expect(recordHabitProgress).toHaveBeenCalledTimes(1)
  })
})

const formRoutes = (
  <Routes>
    <Route path="/habits/new" element={<HabitFormPage />} />
    <Route path="/habits" element={<p>Habit list</p>} />
    <Route path="/habits/42" element={<p>Saved habit</p>} />
  </Routes>
)
describe('U02: navigation protection', () => {
  test('asks before discarding, retains form when staying, and allows explicit discard', async () => {
    const { user, router } = mount(formRoutes, '/habits/new', true)
    await user.type(
      screen.getByRole('textbox', { name: 'Name' }),
      'Read tonight',
    )
    await user.click(screen.getByRole('link', { name: 'Cancel' }))
    await screen.findByRole('dialog')
    expect(router.state.location.pathname).toBe('/habits/new')
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(
      (screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value,
    ).toBe('Read tonight')
    const unload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unload)
    expect(unload.defaultPrevented).toBe(true)
    await user.click(screen.getByRole('link', { name: 'Cancel' }))
    await user.click(
      await screen.findByRole('button', { name: 'Discard and leave' }),
    )
    await screen.findByText('Habit list')
  })
  test('saving does not trigger the discard dialog and keeps the existing day picker', async () => {
    vi.mocked(createHabit).mockResolvedValue({ id: 42 } as Awaited<
      ReturnType<typeof createHabit>
    >)
    const { user, router } = mount(formRoutes, '/habits/new', true)
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Read')
    await user.click(screen.getByRole('button', { name: 'Monday' }))
    await user.click(screen.getByRole('button', { name: 'Friday' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Saved habit')
    expect(router.state.location.pathname).toBe('/habits/42')
    expect(vi.mocked(createHabit).mock.calls[0][0].daysOfWeek).toEqual([1, 5])
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  test('confirmed update discard bypasses unload once, then protects edits again', async () => {
    const { user } = mount(formRoutes, '/habits/new', true)
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Read')
    window.dispatchEvent(new Event('update-discard-confirmed'))
    const confirmed = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(confirmed)
    expect(confirmed.defaultPrevented).toBe(false)
    const next = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(next)
    expect(next.defaultPrevented).toBe(true)
  })
  test('clean forms and cleared sessions do not block navigation or persist draft data', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem')
    const { user, cache } = mount(formRoutes, '/habits/new', true)
    const unload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unload)
    expect(unload.defaultPrevented).toBe(false)
    await user.type(
      screen.getByRole('textbox', { name: 'Name' }),
      'Private habit',
    )
    cache.setQueryData(['session'], null)
    await user.click(screen.getByRole('link', { name: 'Cancel' }))
    await screen.findByText('Habit list')
    expect(storage).not.toHaveBeenCalled()
  })
})

describe('U03–U05: first use and creation', () => {
  test('the empty habit list offers an explicit action and safe templates', async () => {
    vi.mocked(getHabits).mockResolvedValue([])
    mount(<HabitsPage />, '/habits')
    expect(
      (
        await screen.findByRole('link', { name: 'Create my first habit' })
      ).getAttribute('href'),
    ).toBe('/habits/new')
    expect(
      screen.getByRole('link', { name: 'Drink water' }).getAttribute('href'),
    ).toBe('/habits/new?template=water')
    expect(createHabit).not.toHaveBeenCalled()
  })
  test('a template only fills a name; days stay explicit and personalization is optional', () => {
    mount(formRoutes, '/habits/new?template=water')
    expect(
      (screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value,
    ).toBe('Drink water')
    expect(
      screen
        .getByRole('button', { name: 'Monday' })
        .getAttribute('aria-pressed'),
    ).toBe('false')
    expect(
      screen.getByText('Personalize (optional)').closest('details')?.open,
    ).toBe(false)
    const name = document.getElementById('habit-name')!,
      days = document.getElementById('habit-days')!
    expect(
      name.compareDocumentPosition(days) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(createHabit).not.toHaveBeenCalled()
  })
  test('invalid names and days are explained beside their fields and receive focus', async () => {
    const { user } = mount(formRoutes, '/habits/new')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(document.activeElement?.id).toBe('habit-name')
    expect(
      screen
        .getByRole('textbox', { name: 'Name' })
        .getAttribute('aria-invalid'),
    ).toBe('true')
    expect(document.getElementById('habit-name-error')?.textContent).toBe(
      i18n.t('errors.nameRequired'),
    )
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Read')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(document.activeElement?.id).toBe('habit-days')
    expect(document.getElementById('habit-days-error')?.textContent).toBe(
      i18n.t('errors.daysRequired'),
    )
    expect(createHabit).not.toHaveBeenCalled()
  })
  test('unrecognized template values are not rendered as names or markup', () => {
    mount(formRoutes, '/habits/new?template=%3Cscript%3Ealert(1)%3C/script%3E')
    expect(
      (screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value,
    ).toBe('')
    expect(document.querySelector('script')).toBeNull()
  })
})

describe('U06: email recovery', () => {
  test('resend re-enables after cooldown, respects retry-after and separates changed emails', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(authPost)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(
          Object.assign(new Error('rate'), { retryAfter: 120 }),
        )
      const cache = client()
      const { result, rerender } = renderHook(
        ({ email }) => useEmailResend(email),
        {
          initialProps: { email: 'one@example.test' },
          wrapper: ({ children }) => (
            <QueryClientProvider client={cache}>{children}</QueryClientProvider>
          ),
        },
      )
      await act(async () => {
        result.current.send()
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(result.current.seconds).toBe(60)
      act(() => result.current.send())
      expect(authPost).toHaveBeenCalledTimes(1)
      await act(() => vi.advanceTimersByTimeAsync(60_000))
      expect(result.current.seconds).toBe(0)
      await act(async () => {
        result.current.send()
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(result.current.seconds).toBe(120)
      rerender({ email: 'two@example.test' })
      expect(result.current.seconds).toBe(0)
      expect(result.current.sent).toBe(false)
      expect(result.current.error).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
  test('the inbox screen lets the person correct the email without preserving passwords', async () => {
    vi.mocked(authPost).mockResolvedValue(undefined)
    const { user } = mount(<RegisterPage />, '/register')
    await user.type(
      screen.getByRole('textbox', { name: 'Email' }),
      'typo@example.test',
    )
    const passwords = screen
      .getAllByLabelText(/Password|Repeat password/i)
      .filter((input) => input.tagName === 'INPUT')
    for (const field of passwords)
      await user.type(field, 'Valid-Password-2026!')
    fireEvent.submit(document.querySelector('form')!)
    await screen.findByRole('button', { name: 'Change email' })
    await user.click(screen.getByRole('button', { name: 'Change email' }))
    expect(
      (screen.getByRole('textbox', { name: 'Email' }) as HTMLInputElement)
        .value,
    ).toBe('typo@example.test')
    expect(document.querySelectorAll('input[type=password]').length).toBe(2)
    for (const password of document.querySelectorAll<HTMLInputElement>(
      'input[type=password]',
    ))
      expect(password.value).toBe('')
  })
})

describe('U07–U08: statistics and local loading', () => {
  test('month selection precedes both quantity summary and calendar, updates both without global blocking', async () => {
    vi.mocked(getMonthlyProgress).mockImplementation(
      async (year, month) =>
        ({
          start: `${year}-${month}`,
          today: '9999-01-01',
          days: [],
          completed: 0,
          scheduled: 0,
          completionRate: 0,
        }) as unknown as Awaited<ReturnType<typeof getMonthlyProgress>>,
    )
    vi.mocked(getQuantityProgress).mockResolvedValue({
      startDate: '2026-10-01',
      endDate: '2026-10-18',
      habits: [
        {
          habitId: 7,
          name: 'Water',
          unit: 'l',
          amount: 1,
          target: 2,
          coverage: 50,
          completedDays: 0,
          scheduledDays: 1,
          days: [],
        },
      ],
    } as Awaited<ReturnType<typeof getQuantityProgress>>)
    const { user } = mount(
      <NetworkActivity>
        <MonthlyProgress habitId={7} />
      </NetworkActivity>,
    )
    await screen.findByText('Water')
    const period = screen.getByRole('group', { name: 'Month to review' })
    expect(
      period.compareDocumentPosition(screen.getByText('Water')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    const help = screen.getByText('How is this calculated?').closest('details')!
    expect(help.open).toBe(false)
    const first = vi.mocked(getMonthlyProgress).mock.calls[0]
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    await waitFor(() => expect(getMonthlyProgress).toHaveBeenCalledTimes(2))
    const previous = new Date(Date.UTC(first[0]!, first[1]! - 2, 1))
    expect(vi.mocked(getMonthlyProgress).mock.calls[1]).toEqual([
      previous.getUTCFullYear(),
      previous.getUTCMonth() + 1,
      7,
    ])
    expect(vi.mocked(getQuantityProgress).mock.calls.at(-1)).toEqual([
      7,
      previous.getUTCFullYear(),
      previous.getUTCMonth() + 1,
    ])
    expect(document.querySelector('[inert]')).toBeNull()
  })
})
