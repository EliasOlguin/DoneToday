import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { ReactNode } from 'react'
import i18n from '../src/i18n'
import ConfirmEmailPage from '../src/pages/ConfirmEmailPage'
import GuestRegistration from '../src/components/GuestRegistration'
import GuestDeletion from '../src/components/GuestDeletion'
import { authPost, getSession } from '../src/api/auth'
import { apiFetch } from '../src/api/client'

vi.mock('../src/api/auth', () => ({ authPost: vi.fn(), getSession: vi.fn() }))
vi.mock('../src/api/client', () => ({ apiFetch: vi.fn() }))
vi.mock('../src/hooks/useSession', () => ({
  useSession: () => ({ data: { id: 1, isGuest: true, hasPassword: false } }),
}))

function mount(element: ReactNode, location = '/') {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(
    [
      { path: '/login', element: <p>Login destination</p> },
      { path: '*', element },
    ],
    { initialEntries: [location] },
  )
  render(
    <QueryClientProvider client={cache}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { cache, user: userEvent.setup() }
}
beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
  vi.mocked(authPost).mockResolvedValue(undefined)
  vi.mocked(getSession).mockResolvedValue(null)
})

test('normal email confirmation waits for explicit action and chosen password', async () => {
  const { user } = mount(
    <ConfirmEmailPage />,
    '/confirm-email?userId=1&code=proof',
  )
  expect(authPost).not.toHaveBeenCalled()
  const confirm = screen.getByRole('button', { name: 'Confirm email' })
  expect((confirm as HTMLButtonElement).disabled).toBe(true)
  await user.type(screen.getByLabelText('Password'), 'ChosenPassword123!')
  await user.click(confirm)
  await waitFor(() =>
    expect(authPost).toHaveBeenCalledWith('confirm-email', {
      userId: '1',
      code: 'proof',
      password: 'ChosenPassword123!',
    }),
  )
})

test('pending guest registration keeps the guest session and offers a bounded resend', async () => {
  vi.mocked(getSession).mockResolvedValue({
    id: 1,
    email: 'internal@guest.invalid',
    displayName: 'HappyOtter',
    timeZoneId: 'UTC',
    hasPassword: false,
    twoFactorEnabled: false,
    isGuest: true,
  })
  const { user, cache } = mount(<GuestRegistration />)
  await user.type(screen.getByLabelText('Email'), 'owner@example.test')
  await user.type(screen.getByLabelText('Password'), 'ChosenPassword123!')
  await user.type(
    screen.getByLabelText('Repeat password'),
    'ChosenPassword123!',
  )
  await user.click(screen.getByRole('button', { name: 'Link my account' }))
  await waitFor(() =>
    expect(authPost).toHaveBeenCalledWith('guest/register', {
      email: 'owner@example.test',
      password: 'ChosenPassword123!',
    }),
  )
  await waitFor(() =>
    expect(cache.getQueryData<{ isGuest: boolean }>(['session'])?.isGuest).toBe(
      true,
    ),
  )
  expect(screen.queryByLabelText('Password')).toBeNull()
  expect(
    (
      screen.getByRole('button', {
        name: 'Resend confirmation',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true)
})

test('guest deletion requires a second explicit action and clears private cache', async () => {
  vi.mocked(apiFetch).mockResolvedValue(new Response(null, { status: 204 }))
  const { user, cache } = mount(<GuestDeletion />)
  cache.setQueryData(['habits'], [{ id: 42 }])
  await user.click(screen.getByRole('button', { name: 'Delete account' }))
  expect(apiFetch).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Delete account' }))
  await screen.findByText('Login destination')
  expect(apiFetch).toHaveBeenCalledWith(
    '/api/profile/guest/delete',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    }),
  )
  expect(cache.getQueryData(['habits'])).toBeUndefined()
  expect(cache.getQueryData(['session'])).toBeNull()
})
