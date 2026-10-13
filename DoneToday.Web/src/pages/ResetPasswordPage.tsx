import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authPost } from '../api/auth'
import PasswordRequirements from '../components/PasswordRequirements'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const client = useQueryClient()
  const userId = params.get('userId')
  const code = params.get('code')
  const reset = useMutation({
    mutationFn: () => authPost('reset-password', { userId, code, password }),
    onSuccess: async () => {
      setPassword('')
      setConfirmation('')
      setParams({}, { replace: true })
      await client.cancelQueries()
      client.clear()
      client.setQueryData(['session'], null)
    },
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (reset.isPending) return
    setMismatch(password !== confirmation)
    if (password === confirmation) reset.mutate()
  }
  return (
    <section>
      <h1 className="page-title">{t('auth.resetPassword')}</h1>
      {reset.isSuccess ? (
        <p role="status" className="panel mt-6">
          {t('auth.resetSuccess')}
        </p>
      ) : !userId || !code ? (
        <p role="alert" className="panel mt-6">
          {t('auth.resetInvalid')}
        </p>
      ) : (
        <form className="panel mt-6 space-y-4" onSubmit={submit}>
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
          <PasswordRequirements password={password} />
          <label className="block">
            {t('auth.repeatPassword')}
            <input
              className="field mt-2"
              type="password"
              autoComplete="new-password"
              required
              maxLength={128}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          {mismatch && (
            <p role="alert" className="text-danger">
              {t('auth.mismatch')}
            </p>
          )}
          {reset.isError && (
            <p role="alert" className="text-danger">
              {t(
                reset.error.message === 'rate'
                  ? 'auth.rate'
                  : 'auth.resetInvalid',
              )}
            </p>
          )}
          <button
            className="btn-primary w-full"
            aria-busy={reset.isPending}
            disabled={reset.isPending}
          >
            {t(reset.isPending ? 'auth.loading' : 'auth.resetPassword')}
          </button>
        </form>
      )}
      {!reset.isSuccess && (
        <Link className="mt-5 block text-primary" to="/forgot-password">
          {t('auth.sendReset')}
        </Link>
      )}
      <Link className="mt-5 inline-block text-primary" to="/login">
        {t('auth.login')}
      </Link>
    </section>
  )
}
