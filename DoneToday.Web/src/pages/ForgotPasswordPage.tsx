import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { authPost } from '../api/auth'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const request = useMutation({
    mutationFn: () => authPost('forgot-password', { email }),
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (request.isPending) return
    request.mutate()
  }
  return (
    <section>
      <h1 className="page-title">{t('auth.forgotPassword')}</h1>
      <div className="panel mt-6">
        {request.isSuccess ? (
          <p role="status">{t('auth.resetSent')}</p>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <p className="text-sm text-muted">{t('auth.resetHelp')}</p>
            <label className="block">
              {t('auth.email')}
              <input
                className="field mt-2"
                type="email"
                autoComplete="email"
                required
                maxLength={256}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button
              className="btn-primary w-full"
              aria-busy={request.isPending}
              disabled={request.isPending}
            >
              {t(request.isPending ? 'auth.loading' : 'auth.sendReset')}
            </button>
            {request.isError && (
              <p role="alert" className="text-danger">
                {t(
                  request.error.message === 'rate'
                    ? 'auth.rate'
                    : 'auth.resetRequestError',
                )}
              </p>
            )}
          </form>
        )}
      </div>
      <Link className="mt-5 inline-block text-primary" to="/login">
        {t('auth.login')}
      </Link>
    </section>
  )
}
