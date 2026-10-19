import { expect, test, vi } from 'vitest'
import i18n from '../src/i18n'
import { authPost } from '../src/api/auth'
import { apiFetch } from '../src/api/client'

vi.mock('../src/api/client', () => ({ apiFetch: vi.fn() }))

test.each(['es', 'en', 'de'])(
  'sends the selected %s UI language for registration, resend and recovery',
  async (language) => {
    await i18n.changeLanguage(language)
    vi.mocked(apiFetch).mockImplementation(
      async () => new Response(null, { status: 204 }),
    )
    for (const path of [
      'register',
      'guest/register',
      'resend-confirmation',
      'guest/resend-confirmation',
      'forgot-password',
    ]) {
      await authPost(path, { email: 'person@example.test' })
      expect(apiFetch).toHaveBeenLastCalledWith(
        `/api/auth/${path}`,
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-App-Language': language }),
        }),
      )
    }
  },
)
