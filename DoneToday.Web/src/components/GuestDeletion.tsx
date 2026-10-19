import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { apiFetch } from '../api/client'

export default function GuestDeletion() {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const client = useQueryClient()
  const navigate = useNavigate()
  const remove = useMutation({
    mutationFn: async () => {
      const response = await apiFetch('/api/profile/guest/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      if (!response.ok) throw new Error('request')
    },
    onSuccess: async () => {
      await client.cancelQueries()
      client.clear()
      client.setQueryData(['session'], null)
      window.dispatchEvent(new Event('session-updated'))
      navigate('/login', { replace: true })
    },
  })
  return (
    <section className="panel mt-4 border-danger/25">
      <h2 className="font-semibold">{t('profile.deleteTitle')}</h2>
      <p className="mt-2 text-sm text-muted">{t('guest.retention')}</p>
      {confirming ? (
        <>
          <p className="mt-3 text-sm text-danger">
            {t('profile.irreversible')}
          </p>
          <button
            type="button"
            className="btn-primary mt-3"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            {t('profile.deleteTitle')}
          </button>
          <button
            type="button"
            className="ml-3 text-primary"
            disabled={remove.isPending}
            onClick={() => setConfirming(false)}
          >
            {t('common.cancel')}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="mt-3 min-h-11 text-danger"
          onClick={() => setConfirming(true)}
        >
          {t('profile.deleteTitle')}
        </button>
      )}
      {remove.isError && (
        <p role="alert" className="mt-3 text-danger">
          {t('profile.deleteError')}
        </p>
      )}
    </section>
  )
}
