import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { authPost } from '../api/auth'
import { Link } from 'react-router'

export default function RegisterPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const register = useMutation({
    mutationFn: () => authPost('register', { email, password }),
    onSuccess: () => {
      setPassword('')
      setConfirmation('')
    },
  })
  const resend = useMutation({
    mutationFn: () => authPost('resend-confirmation', { email }),
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMismatch(password !== confirmation)
    if (password === confirmation) register.mutate()
  }
  const error = register.error ?? resend.error
  const passwordRequirements = [
    { key: 'auth.passwordLength', met: password.length >= 12 },
    { key: 'auth.passwordUppercase', met: /[A-Z]/.test(password) },
    { key: 'auth.passwordLowercase', met: /[a-z]/.test(password) },
    { key: 'auth.passwordNumber', met: /[0-9]/.test(password) },
    { key: 'auth.passwordSpecial', met: /[^A-Za-z0-9]/.test(password) },
  ] as const
  return (
    <section className="mx-auto max-w-md">
      <h1 className="page-title">{t('auth.register')}</h1>
      <Link className="mt-3 inline-block text-primary" to="/login">
        {t('auth.login')}
      </Link>
      {register.isSuccess || register.error?.message === 'email' ? (
        <div className="panel mt-6 space-y-4">
          <p role="status">{t('auth.checkEmail')}</p>
          <button
            className="btn-primary"
            disabled={resend.isPending || resend.isSuccess}
            onClick={() => resend.mutate()}
          >
            {resend.isSuccess ? t('auth.sent') : t('auth.resend')}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="panel mt-6 space-y-4">
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
          <label className="block">
            {t('auth.password')}
            <input
              className="field mt-2"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,}"
              aria-describedby="password-help"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <ul id="password-help" className="space-y-2 text-sm">
            {passwordRequirements.map(({ key, met }) => (
              <li
                key={key}
                className={`flex items-center gap-2 transition-colors ${met ? 'text-success' : 'text-muted'}`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs"
                >
                  {met ? '✓' : '•'}
                </span>
                <span>{t(key)}</span>
                <span className="sr-only">
                  {t(met ? 'auth.requirementMet' : 'auth.requirementPending')}
                </span>
              </li>
            ))}
          </ul>
          <label className="block">
            {t('auth.repeatPassword')}
            <input
              className="field mt-2"
              type="password"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          {mismatch && (
            <p role="alert" className="text-danger">
              {t('auth.mismatch')}
            </p>
          )}
          <button className="btn-primary w-full" disabled={register.isPending}>
            {register.isPending ? t('common.saving') : t('auth.register')}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-4 text-danger">
          {t(
            error.message === 'rate'
              ? 'auth.rate'
              : error.message === 'email'
                ? 'auth.emailUnavailable'
                : 'auth.registerError',
          )}
        </p>
      )}
    </section>
  )
}
