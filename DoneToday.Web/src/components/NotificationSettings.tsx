import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getNotificationSettings,
  saveNotificationPreferences,
  testPush,
  removeDevice,
} from '../api/notifications'
import type {
  NotificationPreferences,
  NotificationSettings as Settings,
} from '../api/notifications'
import { pushStatus, enablePush, disablePush, readDeviceId } from '../lib/push'

export default function NotificationSettings({
  userId,
  isGuest,
}: {
  userId: number
  isGuest: boolean
}) {
  const { t } = useTranslation()
  const settings = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotificationSettings,
    enabled: !isGuest,
  })
  return (
    <section className="panel mt-6" aria-labelledby="notifications-title">
      <h2 id="notifications-title" className="font-semibold">
        {t('notifications.title')}
      </h2>
      {isGuest ? (
        <p className="mt-2 text-sm text-muted">{t('notifications.guest')}</p>
      ) : settings.isPending ? (
        <p role="status">{t('settings.loading')}</p>
      ) : settings.isError ? (
        <p role="alert" className="text-danger">
          {t('notifications.error')}
        </p>
      ) : !settings.data.available ? (
        <p className="mt-2 text-sm text-muted">
          {t('notifications.unavailable')}
        </p>
      ) : (
        <NotificationForm
          key={userId}
          userId={userId}
          settings={settings.data}
        />
      )}
    </section>
  )
}
function NotificationForm({
  userId,
  settings,
}: {
  userId: number
  settings: Settings
}) {
  const { t, i18n } = useTranslation()
  const client = useQueryClient()
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    weeklyEnabled: false,
    weeklyDay: 1,
    weeklyTime: '09:00:00',
    quietEnabled: false,
    quietStart: '22:00:00',
    quietEnd: '08:00:00',
    pausedThrough: null,
    showHabitNames: false,
    ...settings.preferences!,
  })
  const [deviceId, setDeviceId] = useState<number | null>(() =>
    readDeviceId(userId),
  )
  const enabledHere =
    settings.devices?.some((device) => device.id === deviceId) ?? false
  const status = pushStatus()
  const refresh = () =>
    client.invalidateQueries({ queryKey: ['notifications'] })
  const save = useMutation({
    mutationFn: () =>
      saveNotificationPreferences({
        ...preferences,
        language: i18n.resolvedLanguage ?? 'en',
      }),
    onSuccess: refresh,
  })
  const enable = useMutation({
    mutationFn: () => enablePush(settings.publicKey!, userId),
    onSuccess: async (id) => {
      setDeviceId(id)
      await refresh()
    },
  })
  const disable = useMutation({
    mutationFn: () => disablePush(deviceId!, userId),
    onSuccess: async () => {
      setDeviceId(null)
      await refresh()
    },
  })
  const test = useMutation({
    mutationFn: () => testPush(deviceId!, i18n.resolvedLanguage ?? 'en'),
  })
  const remove = useMutation({ mutationFn: removeDevice, onSuccess: refresh })
  const busy =
    enable.isPending || disable.isPending || test.isPending || remove.isPending
  return (
    <>
      <p className="mt-2 text-sm text-muted">{t('notifications.help')}</p>
      <p className="mt-2 text-xs text-muted">
        {t('notifications.zone', { zone: settings.timeZoneId })}
      </p>
      {status !== 'available' && (
        <p className="mt-3 text-sm text-muted">
          {t(
            status === 'denied'
              ? 'notifications.denied'
              : 'notifications.unsupported',
          )}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {!enabledHere ? (
          <button
            type="button"
            className="btn-primary"
            disabled={busy || status !== 'available'}
            onClick={() => enable.mutate()}
          >
            {t('notifications.enable')}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => test.mutate()}
            >
              {t('notifications.test')}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl border border-muted/20 px-4"
              disabled={busy}
              onClick={() => disable.mutate()}
            >
              {t('notifications.disable')}
            </button>
          </>
        )}
      </div>
      {test.isSuccess && (
        <p role="status" className="mt-3 text-sm text-success">
          {t('notifications.testSent')}
        </p>
      )}
      {(enable.isError ||
        disable.isError ||
        test.isError ||
        remove.isError) && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {t('notifications.error')}
        </p>
      )}
      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate()
        }}
      >
        {(['morning', 'evening'] as const).map((kind) => (
          <div key={kind} className="flex flex-wrap items-center gap-3">
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={preferences[`${kind}Enabled`]}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    [`${kind}Enabled`]: event.target.checked,
                  })
                }
              />
              {t(
                kind === 'morning'
                  ? 'notifications.morning'
                  : 'notifications.evening',
              )}
            </label>
            <label className="ml-auto text-sm">
              <span className="sr-only">
                {t(
                  kind === 'morning'
                    ? 'notifications.morningTime'
                    : 'notifications.eveningTime',
                )}
              </span>
              <input
                className="field"
                type="time"
                required
                value={preferences[`${kind}Time`].slice(0, 5)}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    [`${kind}Time`]: event.target.value + ':00',
                  })
                }
              />
            </label>
          </div>
        ))}
        <p className="text-xs text-muted">{t('notifications.rules')}</p>
        <div className="border-t border-muted/15 pt-4">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={preferences.weeklyEnabled ?? false}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  weeklyEnabled: event.target.checked,
                })
              }
            />
            {t('notifications.weekly')}
          </label>
          {preferences.weeklyEnabled && (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="text-sm">
                {t('notifications.weeklyDay')}
                <select
                  className="field mt-2"
                  value={preferences.weeklyDay ?? 1}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      weeklyDay: Number(event.target.value),
                    })
                  }
                >
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                    <option key={day} value={day}>
                      {new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                        weekday: 'long',
                        timeZone: 'UTC',
                      }).format(new Date(Date.UTC(2026, 10, 1 + day, 12)))}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                {t('notifications.weeklyTime')}
                <input
                  type="time"
                  required
                  className="field mt-2"
                  value={(preferences.weeklyTime ?? '09:00:00').slice(0, 5)}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      weeklyTime: event.target.value + ':00',
                    })
                  }
                />
              </label>
            </div>
          )}
          <p className="mt-1 text-xs text-muted">
            {t('notifications.weeklyHelp')}
          </p>
        </div>
        <div className="border-t border-muted/15 pt-4">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={preferences.quietEnabled ?? false}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  quietEnabled: event.target.checked,
                })
              }
            />
            {t('notifications.quiet')}
          </label>
          {preferences.quietEnabled && (
            <div className="mt-2 grid grid-cols-2 gap-3">
              {(['quietStart', 'quietEnd'] as const).map((key) => (
                <label key={key} className="text-sm">
                  {t(
                    key === 'quietStart'
                      ? 'notifications.quietStart'
                      : 'notifications.quietEnd',
                  )}
                  <input
                    type="time"
                    required
                    className="field mt-2"
                    value={(
                      preferences[key] ??
                      (key === 'quietStart' ? '22:00:00' : '08:00:00')
                    ).slice(0, 5)}
                    onChange={(event) =>
                      setPreferences({
                        ...preferences,
                        [key]: event.target.value + ':00',
                      })
                    }
                  />
                </label>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-muted">
            {t('notifications.quietHelp')}
          </p>
        </div>
        <label className="block text-sm">
          {t('notifications.pause')}
          <input
            type="date"
            className="field mt-2"
            value={preferences.pausedThrough ?? ''}
            onChange={(event) =>
              setPreferences({
                ...preferences,
                pausedThrough: event.target.value || null,
              })
            }
          />
          <span className="mt-1 block text-xs text-muted">
            {t('notifications.pauseHelp')}
          </span>
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={preferences.showHabitNames ?? false}
            onChange={(event) =>
              setPreferences({
                ...preferences,
                showHabitNames: event.target.checked,
              })
            }
          />
          {t('notifications.showNames')}
        </label>
        <button className="btn-primary" disabled={save.isPending}>
          {t('notifications.save')}
        </button>
        {save.isError && (
          <p role="alert" className="text-sm text-danger">
            {t('notifications.error')}
          </p>
        )}
        {save.isSuccess && (
          <p role="status" className="text-sm text-success">
            {t('notifications.saved')}
          </p>
        )}
      </form>
      {!!settings.devices?.length && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted">
            {t('notifications.devices', { count: settings.devices.length })}
          </summary>
          <ul className="mt-2 space-y-2">
            {settings.devices.map((device, index) => (
              <li
                key={device.id}
                className="flex items-center justify-between gap-3"
              >
                <span>
                  {t(
                    device.id === deviceId
                      ? 'notifications.thisDevice'
                      : 'notifications.otherDevice',
                    { number: index + 1 },
                  )}
                </span>
                <button
                  type="button"
                  className="min-h-11 text-primary underline"
                  disabled={busy}
                  onClick={() =>
                    device.id === deviceId
                      ? disable.mutate()
                      : remove.mutate(device.id)
                  }
                >
                  {t('notifications.remove')}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  )
}
