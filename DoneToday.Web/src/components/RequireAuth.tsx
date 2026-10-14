import { Navigate, Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useSession } from '../hooks/useSession'

export default function RequireAuth() {
  const session = useSession()

  const location = useLocation()
  const { t } = useTranslation()
  if (session.isPending)
    return (
      <p className="p-6" role="status">
        {t('auth.loading')}
      </p>
    )
  if (session.isError)
    return (
      <div className="p-6">
        <p role="alert">{t('errors.network')}</p>
        <button
          className="btn-primary mt-4"
          onClick={() => void session.refetch()}
        >
          {t('common.retry')}
        </button>
      </div>
    )
  if (!session.data)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
