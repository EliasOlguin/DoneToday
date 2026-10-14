import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSession } from '../hooks/useSession'
import { detectTimeZone, saveTimeZone } from '../api/profile'
import { errorText } from '../api/errors'
import type { Session } from '../api/auth'

export default function TimeZoneSettings() {
  const { t } = useTranslation()
  const session = useSession()
  const client = useQueryClient()
  const current = session.data?.timeZoneId ?? 'UTC'
  const [selection, setSelection] = useState<string | null>(null)
  const selected = selection ?? current
  const detected = detectTimeZone()
  const zones = [
    ...new Set([
      current,
      detected,
      'UTC',
      ...Intl.supportedValuesOf('timeZone'),
    ]),
  ].sort()
  const save = useMutation({
    mutationFn: (zone: string) => saveTimeZone(zone),
    onSuccess: async (preference) => {
      client.setQueryData<Session>(['session'], (previous) =>
        previous ? { ...previous, ...preference } : previous,
      )
      setSelection(null)
      window.dispatchEvent(new Event('session-updated'))
      await Promise.all(
        ['today', 'progress', 'habit'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      )
    },
  })
  return (
    <section className="panel mt-4">
      <h2 className="font-semibold">{t('settings.timeZone')}</h2>
      <p className="mt-1 text-sm text-muted">{t('settings.timeZoneHelp')}</p>
      <label htmlFor="time-zone" className="mt-4 block text-sm font-medium">
        {t('settings.timeZone')}
      </label>
      <select
        id="time-zone"
        value={selected}
        disabled={save.isPending}
        onChange={(event) => {
          setSelection(event.target.value)
          save.reset()
        }}
        className="mt-2 min-h-11 w-full rounded-xl border border-muted/20 bg-surface px-3 text-sm text-foreground"
      >
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replaceAll('_', ' ')}
          </option>
        ))}
      </select>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          aria-busy={save.isPending}
          disabled={save.isPending || selected === current}
          onClick={() => save.mutate(selected)}
        >
          {t('common.save')}
        </button>
        <button
          type="button"
          className="text-sm font-medium text-primary"
          disabled={save.isPending}
          onClick={() => {
            setSelection(detected)
            save.reset()
          }}
        >
          {t('settings.useDeviceTimeZone')}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">{t('settings.timeZoneHistory')}</p>
      {save.isSuccess && (
        <p role="status" className="mt-3 text-sm text-primary">
          {t('settings.timeZoneSaved')}
        </p>
      )}
      {save.isError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {errorText(save.error)}
        </p>
      )}
    </section>
  )
}
