import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { apiFetch } from '../api/client'
import GoogleButton from '../components/GoogleButton'

export default function ConnectionsPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const connections = useQuery({
    queryKey: ['external-connections'],
    queryFn: async () => {
      const response = await apiFetch('/api/auth/external/connections')
      if (!response.ok) throw new Error('request')
      return response.json() as Promise<{
        google: boolean
        hasPassword: boolean
        twoFactor: boolean
      }>
    },
  })
  return (
    <section>
      <Link className="text-primary" to="/settings">
        {t('nav.settings')}
      </Link>
      <h1 className="page-title mt-4">{t('google.connections')}</h1>
      <p className="mt-2 text-sm text-muted">{t('google.linkHelp')}</p>
      {params.has('externalError') && (
        <p role="alert" className="mt-4 text-danger">
          {t('google.linkFailed')}
        </p>
      )}
      <div className="panel mt-6">
        {connections.isPending ? (
          <p role="status">{t('auth.loading')}</p>
        ) : connections.isError ? (
          <p role="alert">{t('errors.network')}</p>
        ) : connections.data.google ? (
          <p role="status" className="text-success">
            {t('google.linked')}
          </p>
        ) : connections.data.hasPassword ? (
          <GoogleButton link>
            <label className="block">
              {t('auth.password')}
              <input
                name="Password"
                className="field mt-2"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
            {connections.data.twoFactor && (
              <label className="block">
                {t('twoFactor.code')}
                <input
                  name="Code"
                  className="field mt-2"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  required
                  maxLength={100}
                />
              </label>
            )}
          </GoogleButton>
        ) : (
          <p>{t('google.failed')}</p>
        )}
      </div>
    </section>
  )
}
