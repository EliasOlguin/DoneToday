import { useSession } from '../hooks/useSession'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { authPost, getSession } from '../api/auth'
import PasswordField from './PasswordField'
import PasswordRequirements from './PasswordRequirements'
import { useEmailResend } from '../hooks/useEmailResend'

export default function GuestRegistration() {
  const { t } = useTranslation()
  const client = useQueryClient()
  const session = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const resend = useEmailResend(email, 'guest/resend-confirmation')
  const register = useMutation({
    mutationFn: () => authPost('guest/register', { email, password }),
    onSuccess: () => resend.beginCooldown(email),
    onSettled: async () => {
      setPassword('')
      setConfirmation('')
      client.setQueryData(['session'], await getSession())
      await client.invalidateQueries({ queryKey: ['external-connections'] })
    },
  })
  if (
    !session.data?.isGuest &&
    !register.isSuccess &&
    register.error?.message !== 'email'
  )
    return null
  return (
    <form
      className="panel mt-4 space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!register.isPending && password === confirmation) register.mutate()
      }}
    >
      <h2 className="font-semibold">{t('auth.register')}</h2>
      <p className="text-sm text-muted">{t('guest.confirmHelp')}</p>
      {session.data?.isGuest && !register.isSuccess && (
        <>
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
          <PasswordField
            label={t('auth.password')}
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordRequirements password={password} />
          <PasswordField
            label={t('guest.repeatPassword')}
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
          {confirmation && confirmation !== password && (
            <p role="alert" className="text-danger">
              {t('guest.mismatch')}
            </p>
          )}
          <button
            className="btn-primary w-full"
            disabled={register.isPending || password !== confirmation}
          >
            {t('guest.save')}
          </button>
        </>
      )}
      {register.isError && (
        <p role="alert" className="text-danger">
          {t(
            register.error.message === 'email'
              ? 'auth.emailUnavailable'
              : 'guest.failed',
          )}
        </p>
      )}
      {register.isSuccess && (
        <>
          <p role="status">{t('auth.checkEmail')}</p>
          <button
            type="button"
            className="text-primary underline"
            disabled={resend.pending || resend.seconds > 0}
            onClick={resend.send}
          >
            {t('auth.resend')}
          </button>
          {resend.sent && <p role="status">{t('auth.sent')}</p>}
          {resend.error && <p role="alert">{t('guest.failed')}</p>}
        </>
      )}
    </form>
  )
}
