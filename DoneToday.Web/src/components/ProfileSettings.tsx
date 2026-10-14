import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useSession } from '../hooks/useSession'
import { updateProfile, deleteAccount } from '../api/profile'
import { errorText } from '../api/errors'
import type { Session } from '../api/auth'

export default function ProfileSettings({
  showDelete = false,
}: {
  showDelete?: boolean
}) {
  const session = useSession()
  const { t } = useTranslation()
  const [name, setName] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const client = useQueryClient()
  const navigate = useNavigate()
  const save = useMutation({
    mutationFn: () => updateProfile(name ?? session.data?.displayName ?? ''),
    onSuccess: (data) => {
      client.setQueryData<Session>(['session'], (previous) =>
        previous ? { ...previous, ...data } : previous,
      )
      setName(null)
      window.dispatchEvent(new Event('session-updated'))
    },
  })
  const remove = useMutation({
    mutationFn: () => deleteAccount(email, password, code),
    onSuccess: async () => {
      setPassword('')
      setCode('')
      await client.cancelQueries()
      client.clear()
      client.setQueryData(['session'], null)
      window.dispatchEvent(new Event('session-updated'))
      navigate('/login', { replace: true })
    },
  })
  return (
    <>
      {!showDelete && (
        <form
          className="panel mt-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!save.isPending) save.mutate()
          }}
        >
          <h2 className="font-semibold">{t('profile.title')}</h2>
          <p className="mt-1 break-all text-sm text-muted">
            {session.data?.email}
          </p>
          <label
            htmlFor="display-name"
            className="mb-2 mt-4 block text-sm font-medium"
          >
            {t('profile.name')}
          </label>
          <input
            id="display-name"
            className="field"
            autoComplete="nickname"
            maxLength={60}
            disabled={save.isPending}
            value={name ?? session.data?.displayName ?? ''}
            onChange={(event) => {
              setName(event.target.value)
              save.reset()
            }}
          />
          <button
            className="btn-primary mt-3"
            disabled={save.isPending || name === null}
            aria-busy={save.isPending}
          >
            {t('common.save')}
          </button>
          {save.isSuccess && (
            <p role="status" className="mt-3 text-sm text-primary">
              {t('profile.saved')}
            </p>
          )}
          {save.isError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {errorText(save.error)}
            </p>
          )}
        </form>
      )}
      {showDelete && (
        <section className="panel mt-4 border-danger/25">
          <h2 className="font-semibold">{t('profile.deleteTitle')}</h2>
          <p className="mt-2 text-sm text-muted">{t('profile.deleteHelp')}</p>
          {!confirming ? (
            <button
              type="button"
              className="mt-3 min-h-11 text-sm font-semibold text-danger"
              onClick={() => setConfirming(true)}
            >
              {t('profile.deleteTitle')}
            </button>
          ) : (
            <form
              className="mt-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (!remove.isPending) remove.mutate()
              }}
            >
              <p className="mb-3 text-sm font-semibold text-danger">
                {t('profile.irreversible')}
              </p>
              <fieldset disabled={remove.isPending} className="space-y-3">
                <label className="block text-sm" htmlFor="delete-email">
                  {t('profile.confirmEmail')}
                </label>
                <input
                  id="delete-email"
                  type="email"
                  required
                  className="field"
                  autoComplete="off"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                {session.data?.hasPassword && (
                  <>
                    <label className="block text-sm" htmlFor="delete-password">
                      {t('auth.password')}
                    </label>
                    <input
                      id="delete-password"
                      type="password"
                      required
                      className="field"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </>
                )}
                {session.data?.twoFactorEnabled && (
                  <>
                    <label className="block text-sm" htmlFor="delete-code">
                      {t('twoFactor.code')}
                    </label>
                    <input
                      id="delete-code"
                      required
                      className="field"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                    />
                  </>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    aria-busy={remove.isPending}
                    disabled={
                      email.trim().toLowerCase() !==
                      session.data?.email.toLowerCase()
                    }
                    className="min-h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-background disabled:opacity-40"
                  >
                    {t('profile.deleteTitle')}
                  </button>
                  <button
                    type="button"
                    className="min-h-11 px-3 text-primary"
                    onClick={() => {
                      setConfirming(false)
                      setEmail('')
                      setPassword('')
                      setCode('')
                      remove.reset()
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </fieldset>
              {remove.isError && (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {errorText(remove.error)}
                </p>
              )}
            </form>
          )}
        </section>
      )}
    </>
  )
}
