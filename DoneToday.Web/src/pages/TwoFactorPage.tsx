import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { apiFetch } from '../api/client'
import { authPost } from '../api/auth'

type Setup = { sharedKey: string; authenticatorUri: string }
type Codes = { recoveryCodes: string[] }

export default function TwoFactorPage() {
  const { t } = useTranslation()
  const client = useQueryClient()
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState(false)
  const [setup, setSetup] = useState<Setup | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const status = useQuery({
    queryKey: ['two-factor'],
    queryFn: async () => {
      const response = await apiFetch('/api/auth/two-factor')
      if (!response.ok) throw new Error('request')
      return response.json() as Promise<{
        enabled: boolean
        recoveryCodesLeft: number
      }>
    },
  })
  async function action(
    name: 'setup' | 'enable' | 'disable' | 'recovery-codes',
  ) {
    setPending(true)
    setError(false)
    try {
      const result = await authPost<Setup | Codes | undefined>(
        `two-factor/${name}`,
        { password, code, recoveryCode },
      )
      if (name === 'setup') setSetup(result as Setup)
      else {
        setSetup(null)
        setPassword('')
        setCode('')
        setRecoveryCode(false)
        setCodes(
          result && 'recoveryCodes' in result ? result.recoveryCodes : null,
        )
        await client.invalidateQueries({ queryKey: ['two-factor'] })
      }
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void action(setup ? 'enable' : 'setup')
  }
  return (
    <section>
      <Link className="text-primary" to="/settings">
        {t('nav.settings')}
      </Link>
      <h1 className="page-title mt-4">{t('twoFactor.title')}</h1>
      <p className="mt-2 text-sm text-muted">{t('twoFactor.help')}</p>
      {status.isPending ? (
        <p role="status" className="mt-4">
          {t('auth.loading')}
        </p>
      ) : status.isError ? (
        <p role="alert" className="mt-4 text-danger">
          {t('errors.network')}
        </p>
      ) : codes ? (
        <div className="panel mt-6 space-y-4">
          <h2 className="font-semibold">{t('twoFactor.recoveryTitle')}</h2>
          <p>{t('twoFactor.recoveryHelp')}</p>
          <ul className="grid grid-cols-2 gap-3 font-mono text-sm">
            {codes.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
          <button className="btn-primary" onClick={() => setCodes(null)}>
            {t('twoFactor.saved')}
          </button>
        </div>
      ) : (
        <form className="panel mt-6 space-y-4" onSubmit={submit}>
          <p className="font-semibold">
            {t(
              status.data?.enabled ? 'twoFactor.enabled' : 'twoFactor.disabled',
            )}
          </p>
          {status.data?.enabled && (
            <p className="text-sm text-muted">
              {t('twoFactor.codesLeft', {
                count: status.data.recoveryCodesLeft,
              })}
            </p>
          )}
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
          {setup && (
            <div className="space-y-4">
              <p>{t('twoFactor.scan')}</p>
              <div className="mx-auto w-fit rounded-xl bg-white p-4">
                <QRCodeSVG
                  value={setup.authenticatorUri}
                  size={192}
                  level="M"
                />
              </div>
              <p className="text-sm text-muted">{t('twoFactor.manualKey')}</p>
              <code className="block break-all rounded-xl bg-elevated p-3 text-sm">
                {setup.sharedKey}
              </code>
            </div>
          )}
          {(setup || status.data?.enabled) && (
            <label className="block">
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
          )}
          {error && (
            <p role="alert" className="text-danger">
              {t('twoFactor.error')}
            </p>
          )}
          {status.data?.enabled ? (
            <div className="space-y-3">
              <button
                type="button"
                className="btn-primary w-full"
                disabled={pending || !password || !code || recoveryCode}
                onClick={() => void action('recovery-codes')}
              >
                {t('twoFactor.regenerate')}
              </button>
              <button
                type="button"
                className="min-h-11 w-full rounded-xl border border-danger px-4 text-danger disabled:opacity-50"
                disabled={pending || !password || !code}
                onClick={() => void action('disable')}
              >
                {t('twoFactor.disable')}
              </button>
              <button
                type="button"
                className="text-primary underline"
                onClick={() => {
                  setRecoveryCode(!recoveryCode)
                  setCode('')
                }}
              >
                {t(
                  recoveryCode
                    ? 'twoFactor.useAuthenticator'
                    : 'twoFactor.useRecovery',
                )}
              </button>
            </div>
          ) : (
            <button className="btn-primary w-full" disabled={pending}>
              {t(setup ? 'twoFactor.enable' : 'twoFactor.setup')}
            </button>
          )}
        </form>
      )}
    </section>
  )
}
