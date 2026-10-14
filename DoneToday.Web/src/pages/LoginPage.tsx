import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authPost, getSession } from '../api/auth'
import GoogleButton from '../components/GoogleButton'
import PasswordField from '../components/PasswordField'

export default function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [params] = useSearchParams()
  const [twoFactor, setTwoFactor] = useState(params.get('twoFactor') === '1')
  const [code, setCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState(false)
  const client = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const resend = useMutation({
    mutationFn: () => authPost('resend-confirmation', { email }),
  })
  const login = useMutation({
    mutationFn: async () => {
      if (twoFactor) {
        await authPost('two-factor/login', { code, recoveryCode })
      } else {
        const result = await authPost<
          { requiresTwoFactor?: boolean } | undefined
        >('login', { email, password })
        if (result?.requiresTwoFactor) {
          setTwoFactor(true)
          return null
        }
      }
      const session = await getSession()
      if (!session) throw new Error('request')
      return session
    },
    onSuccess: async (session) => {
      setPassword('')
      if (!session) return
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
    if (login.isPending) return
    login.mutate()
  }
  return (
    <section
      className="panel mx-auto w-full max-w-md p-6 shadow-sm sm:p-7"
      aria-labelledby="login-title"
    >
      <h1
        id="login-title"
        className="text-center text-3xl font-bold tracking-tight"
      >
        {t('auth.login')}
      </h1>
      <p className="mt-2 text-center text-sm text-muted">
        {t('today.tagline')}
      </p>
      {params.has('externalError') && (
        <p role="alert" className="mt-4 text-danger">
          {t(
            params.get('externalError') === 'existingAccount'
              ? 'google.existingAccount'
              : 'google.failed',
          )}
        </p>
      )}
      <form className="mt-6 space-y-3" onSubmit={submit}>
        {twoFactor ? (
          <>
            <p className="text-sm text-muted">{t('twoFactor.loginHelp')}</p>
            <label className="block text-sm font-medium">
              {t(recoveryCode ? 'twoFactor.recoveryCode' : 'twoFactor.code')}
              <input
                className="field mt-2"
                autoComplete="one-time-code"
                inputMode={recoveryCode ? 'text' : 'numeric'}
                required
                maxLength={100}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="text-primary underline"
              onClick={() => {
                setRecoveryCode(!recoveryCode)
                setCode('')
                login.reset()
              }}
            >
              {t(
                recoveryCode
                  ? 'twoFactor.useAuthenticator'
                  : 'twoFactor.useRecovery',
              )}
            </button>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium">
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
            <PasswordField
              label={t('auth.password')}
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}
        {!twoFactor && (
          <Link
            className="ml-auto flex min-h-8 w-fit items-center text-xs font-medium text-primary hover:underline"
            to="/forgot-password"
          >
            {t('auth.forgotPassword')}
          </Link>
        )}
        {login.isError && (
          <p role="alert" className="text-danger">
            {t(
              login.error.message === 'rate'
                ? 'auth.rate'
                : twoFactor
                  ? 'twoFactor.loginError'
                  : 'auth.loginError',
            )}
          </p>
        )}
        <button
          className="btn-primary w-full"
          aria-busy={login.isPending}
          disabled={login.isPending}
        >
          {login.isPending ? t('auth.loading') : t('auth.login')}
        </button>
      </form>
      {!twoFactor && <GoogleButton separator />}
      {twoFactor && (
        <button
          type="button"
          className="mx-auto mt-4 block min-h-11 text-sm text-primary underline"
          onClick={() => {
            setTwoFactor(false)
            setCode('')
            setRecoveryCode(false)
            login.reset()
          }}
        >
          {t('twoFactor.restart')}
        </button>
      )}
      {!twoFactor && (
        <Link
          className="mt-5 flex min-h-11 items-center justify-center text-sm font-semibold text-primary hover:underline"
          to="/register"
        >
          {t('auth.register')}
        </Link>
      )}
      {!twoFactor && (
        <details
          open={params.get('confirm') === '1'}
          className="mt-5 border-t border-muted/10 pt-4 text-sm"
        >
          <summary className="cursor-pointer text-muted">
            {t('auth.confirmationHelp')}
          </summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs leading-relaxed text-muted">
              {t('auth.confirmHelp')}
            </p>
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
        </details>
      )}
    </section>
  )
}
