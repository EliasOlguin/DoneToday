import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export default function GoogleButton({
  link = false,
  separator = false,
  verifyDelete = false,
  children,
}: {
  link?: boolean
  separator?: boolean
  verifyDelete?: boolean
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const providers = useQuery({
    queryKey: ['external-providers'],
    queryFn: async () => {
      const response = await fetch('/api/auth/external/providers')
      if (!response.ok) throw new Error('request')
      return response.json() as Promise<{ google: boolean }>
    },
  })
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = event.currentTarget
    setPending(true)
    setError(false)
    try {
      const response = await fetch('/api/auth/csrf', { cache: 'no-store' })
      if (!response.ok) throw new Error('request')
      const { token } = (await response.json()) as { token: string }
      ;(
        form.elements.namedItem(
          '__RequestVerificationToken',
        ) as HTMLInputElement
      ).value = token
      form.submit()
    } catch {
      setError(true)
      setPending(false)
    }
  }
  if (!providers.data?.google) return null
  return (
    <>
      {separator && (
        <div className="mt-6 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-muted/15" />
          <span>{t('auth.or')}</span>
          <span className="h-px flex-1 bg-muted/15" />
        </div>
      )}
      <form
        method="post"
        action={
          verifyDelete
            ? '/api/auth/external/verify-google-delete'
            : link
              ? '/api/auth/external/link-google'
              : '/api/auth/external/google'
        }
        onSubmit={submit}
        className="mt-5 space-y-4"
      >
        <input type="hidden" name="__RequestVerificationToken" />
        {children}
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#dadce0] bg-white px-4 text-sm font-semibold text-[#1f1f1f] hover:bg-[#f8fafc] disabled:opacity-50"
        >
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.73-.06-1.42-.19-2.09H12v3.96h5.92c-.26 1.28-1.04 2.36-2.21 3.09v2.57h3.57c2.08-1.92 3.28-4.74 3.28-7.53Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.57c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.65A11 11 0 0 0 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.3A6.61 6.61 0 0 1 5.5 12c0-.8.14-1.57.34-2.3V7.05H2.18A11 11 0 0 0 1 12c0 1.77.43 3.44 1.18 4.95l3.66-2.65Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.17c1.62 0 3.06.56 4.21 1.64l3.16-3.16A10.56 10.56 0 0 0 12 1a11 11 0 0 0-9.82 6.05L5.84 9.7c.87-2.6 3.3-4.53 6.16-4.53Z"
            />
          </svg>
          {t(
            pending
              ? 'auth.loading'
              : verifyDelete
                ? 'profile.verifyGoogle'
                : link
                  ? 'google.link'
                  : 'google.continue',
          )}
        </button>
        {error && (
          <p role="alert" className="text-danger">
            {t('google.failed')}
          </p>
        )}
      </form>
    </>
  )
}
