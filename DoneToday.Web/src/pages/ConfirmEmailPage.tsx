import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { authPost } from '../api/auth'

export default function ConfirmEmailPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const userId = params.get('userId')
  const code = params.get('code')
  const confirm = useMutation({
    mutationFn: () => authPost('confirm-email', { userId, code }),
  })
  return (
    <section className="mx-auto max-w-md">
      <h1 className="page-title">{t('auth.confirm')}</h1>
      <div className="panel mt-6">
        {confirm.isSuccess ? (
          <div>
            <p role="status">{t('auth.confirmed')}</p>
            <Link className="mt-4 inline-block text-primary" to="/login">
              {t('auth.login')}
            </Link>
          </div>
        ) : !userId || !code ? (
          <p role="alert">{t('auth.confirmError')}</p>
        ) : (
          <button
            className="btn-primary"
            disabled={confirm.isPending}
            onClick={() => confirm.mutate()}
          >
            {confirm.isPending ? t('common.saving') : t('auth.confirm')}
          </button>
        )}
        {confirm.isError && (
          <p role="alert" className="mt-4 text-danger">
            {t(
              confirm.error.message === 'rate'
                ? 'auth.rate'
                : 'auth.confirmError',
            )}
          </p>
        )}
      </div>
    </section>
  )
}
