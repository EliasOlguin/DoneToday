import PasswordRequirements from '../components/PasswordRequirements'
import PasswordField from '../components/PasswordField'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { authPost } from '../api/auth'
import { Link } from 'react-router'
import GoogleButton from '../components/GoogleButton'
import Icon from '../components/ui/Icon'

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
    if (register.isPending) return
    setMismatch(password !== confirmation)
    if (password === confirmation) register.mutate()
  }
  const awaitingConfirmation =
    register.isSuccess || register.error?.message === 'email'
  const error = resend.error ?? (resend.isSuccess ? null : register.error)
  return (
    <section
      className="panel mx-auto w-full max-w-md p-6 shadow-sm sm:p-7"
      aria-labelledby="register-title"
    >
      {awaitingConfirmation && (
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon name="mail" className="h-8 w-8" />
        </div>
      )}
      <h1
        id="register-title"
        className="text-center text-3xl font-bold tracking-tight"
      >
        {t(awaitingConfirmation ? 'auth.checkInboxTitle' : 'auth.register')}
      </h1>
      {awaitingConfirmation ? (
        <div className="mt-5 space-y-5 text-center">
          <p role="status" className="text-sm leading-relaxed text-muted">
            {t('auth.checkEmail')}
          </p>
          <p className="break-all rounded-xl bg-elevated px-4 py-3 text-sm font-semibold">
            {email}
          </p>
          <p className="text-xs leading-relaxed text-muted">
            {t('auth.spamHelp')}
          </p>
          <button
            type="button"
            className="btn-primary w-full text-sm"
            aria-busy={resend.isPending}
            disabled={resend.isPending || resend.isSuccess}
            onClick={() => resend.mutate()}
          >
            {resend.isPending ? t('common.processing') : t('auth.resend')}
          </button>
          {resend.isSuccess && (
            <p role="status" className="text-sm text-success">
              {t('auth.sent')}
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="mt-2 text-center text-sm text-muted">
            {t('auth.registerIntro')}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
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
            <PasswordField
              label={t('auth.password')}
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,}"
              aria-describedby="password-help"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordRequirements password={password} />
            <PasswordField
              label={t('auth.repeatPassword')}
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
            {mismatch && (
              <p role="alert" className="text-danger">
                {t('auth.mismatch')}
              </p>
            )}
            <button
              className="btn-primary w-full"
              aria-busy={register.isPending}
              disabled={register.isPending}
            >
              {register.isPending ? t('common.saving') : t('auth.register')}
            </button>
          </form>
          <GoogleButton separator />
        </>
      )}
      <Link
        to="/login"
        className="mt-5 flex min-h-11 items-center justify-center text-sm font-semibold text-primary hover:underline"
      >
        {t('auth.login')}
      </Link>
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
