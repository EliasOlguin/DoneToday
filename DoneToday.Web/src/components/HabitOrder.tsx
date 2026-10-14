import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { saveHabitOrder } from '../api/habits'
import type { Habit } from '../types/Habit'
import Icon from './ui/Icon'
import { resolveHabitIcon } from '../lib/habitIcons'
import { errorText } from '../api/errors'

export default function HabitOrder({
  habits,
  close,
}: {
  habits: Habit[]
  close: () => void
}) {
  const { t } = useTranslation()
  const [order, setOrder] = useState(habits)
  const [announcement, setAnnouncement] = useState('')
  const [dragging, setDragging] = useState<number | null>(null)
  const client = useQueryClient()
  const save = useMutation({
    mutationFn: () => saveHabitOrder(order.map((h) => h.id)),
    onSuccess: async () => {
      await Promise.all(
        ['habits', 'today'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      )
      close()
    },
  })
  function move(id: number, target: number) {
    setOrder((current) => {
      const from = current.findIndex((h) => h.id === id)
      if (from < 0 || target < 0 || target >= current.length || from === target)
        return current
      const result = [...current]
      const [habit] = result.splice(from, 1)
      result.splice(target, 0, habit)
      return result
    })
  }
  return (
    <section className="panel mt-5" aria-label={t('order.title')}>
      <h2 className="font-semibold">{t('order.title')}</h2>
      <p className="mt-2 text-sm text-muted">{t('order.help')}</p>
      <ul className="mt-4 space-y-2">
        {order.map((habit, index) => (
          <li
            key={habit.id}
            data-order-id={habit.id}
            className={`flex items-center gap-2 rounded-xl border p-2 ${dragging === habit.id ? 'border-primary bg-primary/10' : 'border-muted/20 bg-surface'}`}
          >
            <button
              type="button"
              disabled={save.isPending}
              aria-label={t('order.drag', { name: habit.name })}
              className="flex h-11 w-11 shrink-0 touch-none items-center justify-center rounded-lg text-muted"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId)
                setDragging(habit.id)
              }}
              onPointerMove={(event) => {
                if (dragging !== habit.id) return
                const target = document
                  .elementFromPoint(event.clientX, event.clientY)
                  ?.closest('[data-order-id]')
                const id = Number(target?.getAttribute('data-order-id'))
                const index = order.findIndex((h) => h.id === id)
                if (index >= 0) move(habit.id, index)
              }}
              onPointerUp={(event) => {
                const target = document
                  .elementFromPoint(event.clientX, event.clientY)
                  ?.closest('[data-order-id]')
                const index = order.findIndex(
                  (h) => h.id === Number(target?.getAttribute('data-order-id')),
                )
                if (index >= 0) move(habit.id, index)
                setDragging(null)
                setAnnouncement(t('order.moved', { name: habit.name }))
              }}
              onPointerCancel={() => setDragging(null)}
            >
              <span aria-hidden="true">⠿</span>
            </button>
            <Icon
              name={resolveHabitIcon(habit.icon)}
              style={{ color: habit.color ?? 'var(--color-primary)' }}
            />
            <span className="min-w-0 flex-1 break-words text-sm">
              {habit.name}
            </span>
            <button
              type="button"
              disabled={index === 0 || save.isPending}
              aria-label={t('order.up', { name: habit.name })}
              onClick={() => {
                move(habit.id, index - 1)
                setAnnouncement(t('order.moved', { name: habit.name }))
              }}
              className="h-11 w-11 shrink-0 rounded-lg text-primary disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={index === order.length - 1 || save.isPending}
              aria-label={t('order.down', { name: habit.name })}
              onClick={() => {
                move(habit.id, index + 1)
                setAnnouncement(t('order.moved', { name: habit.name }))
              }}
              className="h-11 w-11 shrink-0 rounded-lg text-primary disabled:opacity-30"
            >
              ↓
            </button>
          </li>
        ))}
      </ul>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {save.isError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {errorText(save.error)}
        </p>
      )}
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={save.isPending}
          aria-busy={save.isPending}
          onClick={() => save.mutate()}
        >
          {t('common.save')}
        </button>
        <button
          type="button"
          className="min-h-11 px-3 text-primary"
          disabled={save.isPending}
          onClick={close}
        >
          {t('common.cancel')}
        </button>
      </div>
    </section>
  )
}
