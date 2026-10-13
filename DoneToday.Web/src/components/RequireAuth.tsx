import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useSession } from '../hooks/useSession'

export default function RequireAuth() {
  const session = useSession()
  const client = useQueryClient()
  const location = useLocation()
  const { t } = useTranslation()
  useEffect(() => {
    const expire = async () => {
      await client.cancelQueries()
      client.clear()
      client.setQueryData(['session'], null)
    }
    const resetPrivateData = () => {
      const filter = {
        predicate: (query: { queryKey: readonly unknown[] }) =>
          query.queryKey[0] !== 'session',
      }
      void client.cancelQueries(filter)
      client.removeQueries(filter)
    }
    window.addEventListener('session-expired', expire)
    window.addEventListener('account-changed', resetPrivateData)
    return () => {
      window.removeEventListener('session-expired', expire)
      window.removeEventListener('account-changed', resetPrivateData)
    }
  }, [client])
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
