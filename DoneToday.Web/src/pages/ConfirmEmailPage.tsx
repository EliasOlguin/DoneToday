import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { useState } from 'react'
import PasswordField from '../components/PasswordField'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authPost, getSession } from '../api/auth'
import Icon from '../components/ui/Icon'

export default function ConfirmEmailPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const userId = params.get('userId')
  const code = params.get('code')
  const guest = params.get('guest') === '1'
  const [password, setPassword] = useState('')
  const client = useQueryClient()
  const confirm = useMutation({
    mutationFn: () => authPost('confirm-email', { userId, code, password }),
    onSuccess: async () => {
      setPassword('')
      client.setQueryData(['session'], await getSession())
      await client.invalidateQueries({ queryKey: ['external-connections'] })
    },
  })
  const invalid = !userId || !code || confirm.error?.message === 'invalid'
  return (
    <section
      className="panel mx-auto w-full max-w-md p-6 text-center shadow-sm sm:p-8"
      aria-labelledby="confirm-title"
    >
      <div
        className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${confirm.isSuccess ? 'bg-success/10 text-success' : invalid ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}
      >
        <Icon name={confirm.isSuccess ? 'check' : 'mail'} className="h-8 w-8" />
      </div>
      <h1 id="confirm-title" className="text-3xl font-bold tracking-tight">
        {t(
          confirm.isSuccess
            ? 'auth.confirmedTitle'
            : invalid
              ? 'auth.confirmInvalidTitle'
              : 'auth.confirm',
        )}
      </h1>
      <div className="mt-5">
        {confirm.isSuccess ? (
          <div>
            <p role="status" className="text-sm leading-relaxed text-muted">
              {t('auth.confirmed')}
            </p>
            <Link
              className="btn-primary mt-6 flex min-h-11 items-center justify-center text-sm"
              to={guest ? '/today' : '/login'}
            >
              {t(guest ? 'nav.today' : 'auth.login')}
            </Link>
          </div>
        ) : invalid ? (
          <div>
            <p role="alert" className="text-sm leading-relaxed text-muted">
              {t(guest ? 'guest.confirmError' : 'auth.confirmError')}
            </p>
            <Link
              to={guest ? '/settings/connections' : '/login?confirm=1'}
              className="btn-primary mt-6 flex min-h-11 items-center justify-center text-sm"
            >
              {t('auth.requestNewLink')}
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm leading-relaxed text-muted">
              {t(guest ? 'guest.confirmHelp' : 'guest.normalConfirmHelp')}
            </p>
            {!guest && (
              <PasswordField
                label={t('auth.password')}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                maxLength={128}
              />
            )}
            <button
              className="btn-primary mt-4 w-full text-sm"
              aria-busy={confirm.isPending}
              disabled={confirm.isPending || (!guest && !password)}
              onClick={() => confirm.mutate()}
            >
              {confirm.isPending ? t('common.saving') : t('auth.confirm')}
            </button>
          </>
        )}
        {confirm.isError && !invalid && (
          <p role="alert" className="mt-4 text-danger">
            {t(
              confirm.error.message === 'rate' ? 'auth.rate' : 'errors.network',
            )}
          </p>
        )}
      </div>
    </section>
  )
}
