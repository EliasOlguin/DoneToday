import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authPost, getSession } from '../api/auth'

export default function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const client = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const resend = useMutation({
    mutationFn: () => authPost('resend-confirmation', { email }),
  })
  const login = useMutation({
    mutationFn: async () => {
      await authPost('login', { email, password })
      const session = await getSession()
      if (!session) throw new Error('request')
      return session
    },
    onSuccess: async (session) => {
      setPassword('')
      await client.cancelQueries()
      client.clear()
      client.setQueryData(['session'], session)
      const from = (location.state as { from?: string } | null)?.from
      navigate(
        from?.startsWith('/') && !from.startsWith('//') ? from : '/today',
        { replace: true },
      )
    },
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    login.mutate()
  }
  return (
    <section className="mx-auto max-w-md">
      <h1 className="page-title">{t('auth.login')}</h1>
      <form className="panel mt-6 space-y-4" onSubmit={submit}>
        <label className="block">
          {t('auth.email')}
          <input
            className="field mt-2"
            type="email"
            autoComplete="username"
            required
            maxLength={256}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block">
          {t('auth.password')}
          <input
            className="field mt-2"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {login.isError && (
          <p role="alert" className="text-danger">
            {t(
              login.error.message === 'rate' ? 'auth.rate' : 'auth.loginError',
            )}
          </p>
        )}
        <button className="btn-primary w-full" disabled={login.isPending}>
          {login.isPending ? t('auth.loading') : t('auth.login')}
        </button>
      </form>
      <Link className="mt-5 inline-block text-primary" to="/register">
        {t('auth.register')}
      </Link>
      <div className="mt-6 space-y-3">
        <p className="text-sm text-muted">{t('auth.confirmHelp')}</p>
        <button
          type="button"
          className="text-primary underline disabled:opacity-50"
          disabled={!email || resend.isPending || resend.isSuccess}
          onClick={() => resend.mutate()}
        >
          {t('auth.resend')}
        </button>
        {resend.isSuccess && <p role="status">{t('auth.sent')}</p>}
        {resend.isError && (
          <p role="alert" className="text-danger">
            {t(
              resend.error.message === 'rate'
                ? 'auth.rate'
                : 'auth.emailUnavailable',
            )}
          </p>
        )}
      </div>
    </section>
  )
}
