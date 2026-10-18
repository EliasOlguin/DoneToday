import { useEffect, useRef } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { Session } from '../api/auth'

export default function UnsavedChangesGuard() {
  const client = useQueryClient()
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const allowUpdateUnload = useRef(false)
  useEffect(() => {
    const confirmed = () => {
      allowUpdateUnload.current = true
    }
    window.addEventListener('update-discard-confirmed', confirmed)
    return () =>
      window.removeEventListener('update-discard-confirmed', confirmed)
  }, [])
  const dirty = () =>
    !!client.getQueryData<Session | null>(['session']) &&
    document.querySelector('[data-unsaved="true"]') !== null
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty() &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  )
  useBeforeUnload((event) => {
    if (allowUpdateUnload.current) {
      allowUpdateUnload.current = false
      return
    }
    if (!dirty()) return
    event.preventDefault()
    event.returnValue = ''
  })
  const blocked = blocker.state === 'blocked'
  useEffect(() => {
    if (!blocked || !dialog.current) return
    const element = dialog.current
    const previous = document.activeElement
    element.showModal()
    return () => {
      element.close()
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus()
    }
  }, [blocked])
  return (
    <dialog
      ref={dialog}
      aria-labelledby="unsaved-title"
      aria-describedby="unsaved-help"
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-muted/20 bg-surface p-6 text-foreground shadow-xl backdrop:bg-black/50"
      onCancel={() => blocker.state === 'blocked' && blocker.reset()}
    >
      <h2 id="unsaved-title" className="text-lg font-semibold">
        {t('ux.unsavedTitle')}
      </h2>
      <p id="unsaved-help" className="mt-3 text-sm text-muted">
        {t('ux.unsavedHelp')}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          autoFocus
          type="button"
          className="btn-primary"
          onClick={() => blocker.state === 'blocked' && blocker.reset()}
        >
          {t('ux.stay')}
        </button>
        <button
          type="button"
          className="min-h-11 px-3 text-sm text-danger"
          onClick={() => blocker.state === 'blocked' && blocker.proceed()}
        >
          {t('ux.discard')}
        </button>
      </div>
    </dialog>
  )
}
