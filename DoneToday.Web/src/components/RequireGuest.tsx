import { Navigate, Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useSession } from '../hooks/useSession'

export default function RequireGuest() {
  const session = useSession({ verifyOnMount: true })
  const { t } = useTranslation()
  if (session.isPending) return null
  if (session.isError)
    return (
      <div className="panel mx-auto max-w-md">
        <p role="alert">{t('errors.network')}</p>
        <button
          type="button"
          className="btn-primary mt-4"
          disabled={session.isFetching}
          onClick={() => void session.refetch()}
        >
          {t('common.retry')}
        </button>
      </div>
    )
  if (session.data) return <Navigate to="/today" replace />
  return <Outlet />
}
