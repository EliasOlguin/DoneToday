import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { HabitProgress } from '../types/HabitProgress'
import { recordHabitProgress } from '../api/habits'
import { errorText } from '../api/errors'
import { quickAmounts, validMeasurement, wholeUnit } from '../lib/measurements'
import MeasurementText from './MeasurementText'
import { useSession } from '../hooks/useSession'

export default function HabitProgressControl({
  id,
  progress,
  name,
  history = false,
}: {
  id: number
  progress: HabitProgress
  name: string
  history?: boolean
}) {
  const { t, i18n } = useTranslation()
  const [mode, setMode] = useState<'add' | 'correct' | null>(null)
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [revision, setRevision] = useState(progress.revision)
  const timeZone = useSession().data?.timeZoneId ?? 'UTC'
  const client = useQueryClient()
  const refresh = () =>
    Promise.all(
      [['today'], ['habit'], ['progress']].map((queryKey) =>
        client.invalidateQueries({ queryKey }),
      ),
    )
  const save = useMutation({
    meta: { localLoading: true },
    mutationFn: ({
      amount,
      correction,
      operationId,
    }: {
      amount: number
      correction: boolean
      operationId: string
    }) =>
      recordHabitProgress(
        id,
        {
          amount,
          date: progress.date,
          operationId,
          expectedRevision: correction ? revision : undefined,
        },
        correction,
      ),
    onSuccess: async () => {
      setMode(null)
      setValue('')
      await refresh()
    },
    onError: async () => {
      setMode(null)
      setValue('')
      await refresh()
    },
  })
  const done = progress.amount >= progress.target
  const percent = Math.min(100, (progress.amount / progress.target) * 100)
  function record(amount: number, correction = false) {
    if (!validMeasurement(amount, progress.unit, correction)) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    save.mutate({ amount, correction, operationId: crypto.randomUUID() })
  }
  return (
    <div className="mt-3" aria-label={t('measure.progressFor', { name })}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>
          <span className="font-semibold">
            <MeasurementText value={progress.amount} unit={progress.unit} />
          </span>
          <span className="text-muted">
            {' '}
            / <MeasurementText value={progress.target} unit={progress.unit} />
          </span>
        </p>
        <p className={`text-xs ${done ? 'text-success' : 'text-muted'}`}>
          {done ? (
            t('measure.reached')
          ) : (
            <>
              {t('measure.remaining')}{' '}
              <MeasurementText
                value={Math.max(0, progress.target - progress.amount)}
                unit={progress.unit}
              />
            </>
          )}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={t('measure.progressFor', { name })}
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-elevated"
      >
        <div
          style={{ width: `${percent}%` }}
          className={`h-full rounded-full ${done ? 'bg-success' : 'bg-primary'}`}
        />
      </div>
      {progress.isScheduled ? (
        <>
          <fieldset
            disabled={save.isPending}
            aria-busy={save.isPending}
            className="mt-3 flex flex-wrap items-center gap-2 disabled:opacity-60"
          >
            {quickAmounts(progress.unit, progress.target).map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => record(amount)}
                className="min-h-11 rounded-xl bg-primary/10 px-3 text-xs font-medium text-primary"
              >
                +
                <MeasurementText
                  value={
                    progress.unit === 'l' && amount < 1 ? amount * 1000 : amount
                  }
                  unit={
                    progress.unit === 'l' && amount < 1 ? 'ml' : progress.unit
                  }
                />
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMode('add')
                setValue('')
                setInvalid(false)
              }}
              className="min-h-11 px-2 text-xs text-primary"
            >
              {t('measure.record')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('correct')
                setRevision(progress.revision)
                setValue(String(progress.amount))
                setInvalid(false)
              }}
              className="min-h-11 px-2 text-xs text-muted"
            >
              {t('measure.correct')}
            </button>
          </fieldset>
          {mode && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                if (!save.isPending) record(Number(value), mode === 'correct')
              }}
              data-unsaved={value !== ''}
              className="mt-3 rounded-xl border border-muted/15 p-3"
            >
              <label
                className="block text-xs font-semibold"
                htmlFor={`amount-${id}`}
              >
                {t(
                  mode === 'correct'
                    ? 'measure.totalToday'
                    : 'measure.amountToAdd',
                )}{' '}
                ({t(`measure.unit.${progress.unit}`, { count: 2 })})
              </label>
              <p className="mt-1 text-xs text-muted">
                {t(
                  mode === 'correct'
                    ? 'measure.correctionHelp'
                    : 'measure.addHelp',
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  id={`amount-${id}`}
                  type="number"
                  className="field min-w-0 flex-1"
                  required
                  min={
                    mode === 'correct'
                      ? 0
                      : wholeUnit(progress.unit)
                        ? 1
                        : 0.001
                  }
                  max={1_000_000}
                  step={wholeUnit(progress.unit) ? 1 : 0.001}
                  value={value}
                  disabled={save.isPending}
                  onChange={(event) => setValue(event.target.value)}
                />
                <button
                  type="submit"
                  disabled={save.isPending || value === ''}
                  aria-busy={save.isPending}
                  className="btn-primary text-xs"
                >
                  {t('common.save')}
                </button>
                <button
                  type="button"
                  disabled={save.isPending}
                  onClick={() => {
                    setMode(null)
                    setValue('')
                    setInvalid(false)
                  }}
                  className="min-h-11 px-2 text-xs text-muted"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          )}
        </>
      ) : (
        <p className="mt-3 text-xs text-muted">{t('measure.notScheduled')}</p>
      )}
      {save.isPending && (
        <p role="status" className="mt-2 text-xs text-muted">
          {t('common.saving')}
        </p>
      )}
      {invalid && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {t('measure.invalid')}
        </p>
      )}
      {save.isError && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {errorText(save.error)}
        </p>
      )}
      {history && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">{t('measure.entries')}</h3>
          <p className="mt-1 text-xs text-muted">{t('measure.streakHelp')}</p>
          {progress.entries.length ? (
            <ul className="mt-2 max-h-64 overflow-auto divide-y divide-muted/10">
              {progress.entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 py-3 text-xs"
                >
                  <span className="text-muted">
                    {new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                      timeStyle: 'short',
                      timeZone,
                    }).format(new Date(entry.createdAt))}{' '}
                    ·{' '}
                    {t(
                      entry.isCorrection
                        ? 'measure.correction'
                        : 'measure.entry',
                    )}
                  </span>
                  <span>
                    {entry.isCorrection ? t('measure.total') + ' ' : '+'}
                    <MeasurementText
                      value={
                        entry.isCorrection
                          ? entry.resultingAmount
                          : entry.amount
                      }
                      unit={progress.unit}
                    />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted">{t('measure.noEntries')}</p>
          )}
        </div>
      )}
    </div>
  )
}
