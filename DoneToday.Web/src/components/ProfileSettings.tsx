import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useSession } from '../hooks/useSession'
import { updateProfile, deleteAccount } from '../api/profile'
import { errorText } from '../api/errors'
import type { Session } from '../api/auth'
import { apiFetch } from '../api/client'
import GoogleButton from './GoogleButton'

export default function ProfileSettings({
  showDelete = false,
}: {
  showDelete?: boolean
}) {
  const session = useSession()
  const { t } = useTranslation()
  const [name, setName] = useState<string | null>(null)
  const [params] = useSearchParams()
  const [confirming, setConfirming] = useState(params.has('deleteVerified'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const client = useQueryClient()
  const navigate = useNavigate()
  const deleteVerification = useQuery({
    queryKey: ['delete-verification', session.data?.id],
    enabled:
      showDelete && confirming && !!session.data && !session.data.hasPassword,
    staleTime: 0,
    refetchInterval: 30_000,
    meta: { localLoading: true },
    queryFn: async () => {
      const response = await apiFetch('/api/profile/delete-verification')
      if (!response.ok) throw new Error('request')
      return response.json() as Promise<{ verified: boolean }>
    },
  })
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
    onError: () => {
      void deleteVerification.refetch()
    },
  })
  return (
    <>
      {!showDelete && (
        <form
          data-unsaved={
            name !== null && name.trim() !== (session.data?.displayName ?? '')
          }
          className="panel mt-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!save.isPending) save.mutate()
          }}
        >
          <h2 className="font-semibold">{t('profile.title')}</h2>
          <p className="mt-1 break-all text-sm text-muted">
            {session.data?.isGuest ? t('guest.title') : session.data?.email}
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
            <>
              {!session.data?.hasPassword && (
                <div className="mt-4">
                  <p className="text-sm text-muted">
                    {t('profile.verifyGoogleHelp')}
                  </p>
                  {deleteVerification.data?.verified ? (
                    <p role="status" className="mt-2 text-sm text-success">
                      {t('profile.googleVerified')}
                    </p>
                  ) : (
                    <GoogleButton verifyDelete />
                  )}
                  {params.has('externalError') && (
                    <p role="alert" className="mt-2 text-sm text-danger">
                      {t('google.failed')}
                    </p>
                  )}
                </div>
              )}
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
                    maxLength={256}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  {session.data?.hasPassword && (
                    <>
                      <label
                        className="block text-sm"
                        htmlFor="delete-password"
                      >
                        {t('auth.password')}
                      </label>
                      <input
                        id="delete-password"
                        type="password"
                        required
                        className="field"
                        autoComplete="current-password"
                        maxLength={128}
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
                        maxLength={100}
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
                        (!session.data?.hasPassword &&
                          !deleteVerification.data?.verified) ||
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
            </>
          )}
        </section>
      )}
    </>
  )
}
