import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TodayHabit } from '../types/TodayHabit'
import {
  celebrationKey,
  claimCelebration,
  completedDayTransition,
} from '../lib/dailyCelebration'
import { Character } from './HabitCharacters'
import './DailyCelebration.css'

export default function DailyCelebration({
  userId,
  day,
}: {
  userId: number
  day: string
}) {
  const client = useQueryClient()
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    let previous = client.getQueryData<TodayHabit[]>(['today'])
    const key = celebrationKey(userId, day)
    return client.getQueryCache().subscribe((event) => {
      if (
        event.query.queryKey.length !== 1 ||
        event.query.queryKey[0] !== 'today'
      )
        return
      if (event.type !== 'updated' || event.action.type !== 'success') return
      const next = event.query.state.data as TodayHabit[] | undefined
      if (!next) return
      const completed = completedDayTransition(previous, next)
      previous = next
      if (!completed) return
      const storage = {
        getItem: (name: string) => window.localStorage.getItem(name),
        setItem: (name: string, value: string) =>
          window.localStorage.setItem(name, value),
      }
      if (!claimCelebration(key, storage)) return
      setOpen(true)
    })
  }, [client, userId, day])

  useEffect(() => {
    if (!open || !dialog.current) return
    const element = dialog.current
    const focused = document.activeElement
    element.showModal()
    return () => {
      element.close()
      if (focused instanceof HTMLElement && focused.isConnected) focused.focus()
    }
  }, [open])

  return (
    <dialog
      ref={dialog}
      className="daily-celebration"
      aria-labelledby="celebration-title"
      aria-describedby="celebration-message"
      onCancel={() => setOpen(false)}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect()
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            setOpen(false)
        }
      }}
    >
      {open && (
        <>
          <button
            autoFocus
            type="button"
            className="celebration-close"
            aria-label={t('common.dismiss')}
            onClick={() => setOpen(false)}
          >
            ×
          </button>
          <div className="celebration-cast" aria-hidden="true">
            {['mint', 'lavender', 'slate'].map((tone) => (
              <div
                key={tone}
                className={`celebration-person habit-tone--${tone}`}
              >
                <Character activity="celebrate" />
              </div>
            ))}
            <span className="celebration-spark">✦</span>
            <span className="celebration-spark celebration-spark--right">
              ✧
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            {t('celebration.label')}
          </p>
          <h2
            id="celebration-title"
            className="mt-3 text-3xl font-bold tracking-tight"
          >
            {t('celebration.title')}
          </h2>
          <p id="celebration-message" className="mt-3 text-sm text-muted">
            {t('celebration.message')}
          </p>
          <button
            type="button"
            className="btn-primary mt-7 w-full"
            onClick={() => setOpen(false)}
          >
            {t('celebration.continue')}
          </button>
        </>
      )}
    </dialog>
  )
}
