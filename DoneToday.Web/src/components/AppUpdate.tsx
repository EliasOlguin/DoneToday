import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { bindUpdateChecks } from '../lib/updateCheck'
import { appVersion } from '../lib/version'

export default function AppUpdate() {
  const { t } = useTranslation()
  const [available, setAvailable] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  useEffect(
    () =>
      bindUpdateChecks(window, appVersion, setAvailable, import.meta.env.PROD),
    [],
  )
  useEffect(() => {
    const mark = (event: Event) => {
      if (event.target instanceof HTMLElement) {
        const form = event.target.closest('form')
        if (form) form.dataset.updateDirty = 'true'
      }
    }
    document.addEventListener('input', mark, true)
    document.addEventListener('change', mark, true)
    return () => {
      document.removeEventListener('input', mark, true)
      document.removeEventListener('change', mark, true)
    }
  }, [])
  if (!available || available === dismissed) return null
  function reload() {
    if (
      document.querySelector(
        '[data-unsaved="true"], form:not([data-unsaved])[data-update-dirty="true"]',
      ) &&
      !confirming
    ) {
      setConfirming(true)
      return
    }
    if (confirming) window.dispatchEvent(new Event('update-discard-confirmed'))
    window.location.reload()
  }
  return (
    <aside
      aria-label={t('update.title')}
      className="fixed left-4 right-4 top-4 z-40 rounded-2xl border border-primary/30 bg-surface p-4 shadow-xl sm:left-auto sm:w-96"
    >
      <p role="status" className="text-sm font-semibold">
        {t('update.available', { version: available })}
      </p>
      <p className="mt-1 text-xs text-muted">{t('update.help')}</p>
      {confirming && (
        <p role="alert" className="mt-3 text-sm text-warning">
          {t('update.unsaved')}
        </p>
      )}
      <div className="mt-3 flex gap-3">
        <button type="button" className="btn-primary" onClick={reload}>
          {t(confirming ? 'update.discard' : 'update.reload')}
        </button>
        <button
          type="button"
          className="min-h-11 px-3 text-sm text-primary"
          onClick={() => {
            if (confirming) setConfirming(false)
            else setDismissed(available)
          }}
        >
          {t(confirming ? 'update.keepEditing' : 'update.later')}
        </button>
      </div>
    </aside>
  )
}
