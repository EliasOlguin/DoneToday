import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getHabitReminder,
  saveHabitReminder,
  snoozeHabit,
} from '../api/notifications'
import type { HabitReminderSettings as Settings } from '../api/notifications'

export default function HabitReminderSettings({
  habitId,
}: {
  habitId: number
}) {
  const { t } = useTranslation()
  const settings = useQuery({
    queryKey: ['habit-reminder', habitId],
    queryFn: () => getHabitReminder(habitId),
  })
  return (
    <section className="panel mt-5" aria-labelledby="habit-reminder-title">
      <h2 id="habit-reminder-title" className="font-semibold">
        {t('notifications.habitTitle')}
      </h2>
      {settings.isPending ? (
        <p role="status">{t('settings.loading')}</p>
      ) : settings.isError ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t('notifications.error')}
        </p>
      ) : !settings.data.available ? (
        <p className="mt-2 text-sm text-muted">
          {t('notifications.unavailable')}
        </p>
      ) : (
        <ReminderForm
          key={habitId}
          habitId={habitId}
          settings={settings.data}
        />
      )}
    </section>
  )
}
function ReminderForm({
  habitId,
  settings,
}: {
  habitId: number
  settings: Settings
}) {
  const { t, i18n } = useTranslation()
  const client = useQueryClient()
  const [enabled, setEnabled] = useState(settings.enabled ?? false)
  const [time, setTime] = useState(settings.time ?? '18:00:00')
  const refresh = () =>
    client.invalidateQueries({ queryKey: ['habit-reminder', habitId] })
  const save = useMutation({
    mutationFn: () =>
      saveHabitReminder(habitId, {
        enabled,
        time,
        language: i18n.resolvedLanguage ?? 'en',
      }),
    onSuccess: refresh,
  })
  const snooze = useMutation({
    mutationFn: () => snoozeHabit(habitId),
    onSuccess: refresh,
  })
  return (
    <>
      <p className="mt-2 text-sm text-muted">{t('notifications.habitHelp')}</p>
      <p className="mt-2 text-xs text-muted">
        {t('notifications.zone', { zone: settings.timeZoneId })}
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate()
        }}
      >
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          {t('notifications.habitEnable')}
        </label>
        <label className="block text-sm">
          {t('notifications.habitTime')}
          <input
            type="time"
            className="field mt-2"
            required
            value={time.slice(0, 5)}
            onChange={(event) => setTime(event.target.value + ':00')}
          />
        </label>
        <button
          className="btn-primary"
          disabled={save.isPending || snooze.isPending}
        >
          {t('notifications.habitSave')}
        </button>
      </form>
      {settings.enabled && (
        <button
          type="button"
          className="mt-3 min-h-11 text-sm text-primary underline"
          disabled={save.isPending || snooze.isPending || settings.snoozedToday}
          onClick={() => snooze.mutate()}
        >
          {t('notifications.snooze')}
        </button>
      )}
      {snooze.isSuccess && (
        <p role="status" className="mt-2 text-sm text-success">
          {t('notifications.snoozed')}
        </p>
      )}
      {save.isSuccess && (
        <p role="status" className="mt-2 text-sm text-success">
          {t('notifications.saved')}
        </p>
      )}
      {(save.isError || snooze.isError) && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t('notifications.habitError')}
        </p>
      )}
    </>
  )
}
