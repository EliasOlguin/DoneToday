import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { HabitProgress } from '../types/HabitProgress'
import { recordHabitProgress } from '../api/habits'
import { ApiError, errorText } from '../api/errors'
import type { Session } from '../api/auth'
import type { TodayHabit } from '../types/TodayHabit'
import type { HabitDetail } from '../types/HabitDetail'
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
  const session = useSession()
  const timeZone = session.data?.timeZoneId ?? 'UTC'
  type Attempt = {
    amount: number
    correction: boolean
    operationId: string
    date: string
    expectedRevision?: number
    accountId: number
  }
  const attempt = useRef<Attempt | null>(null)
  const [reviewRequired, setReviewRequired] = useState(false)
  const client = useQueryClient()
  const refresh = () =>
    Promise.all(
      [['today'], ['habit'], ['progress']].map((queryKey) =>
        client.invalidateQueries({ queryKey }),
      ),
    )
  const save = useMutation({
    meta: { localLoading: true },
    mutationFn: ({ accountId, correction, ...request }: Attempt) => {
      if (client.getQueryData<Session | null>(['session'])?.id !== accountId)
        throw new ApiError('auth.sessionExpired')
      return recordHabitProgress(id, request, correction)
    },
    onSuccess: async (saved, request) => {
      if (
        client.getQueryData<Session | null>(['session'])?.id !==
        request.accountId
      )
        return
      client.setQueryData<TodayHabit[]>(['today'], (old) =>
        old?.map((habit) =>
          habit.id === id &&
          habit.progress?.date === saved.date &&
          habit.progress.revision <= saved.revision
            ? {
                ...habit,
                progress: saved,
                isCompleted: saved.amount >= saved.target,
              }
            : habit,
        ),
      )
      client.setQueryData<HabitDetail>(['habit', id], (old) =>
        old?.progress?.date === saved.date &&
        old.progress.revision <= saved.revision
          ? { ...old, progress: saved }
          : old,
      )
      attempt.current = null
      setReviewRequired(false)
      setMode(null)
      setValue('')
      await refresh().catch(() => {})
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.key === 'measure.changed')
        setReviewRequired(true)
      await refresh().catch(() => {})
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
    if (attempt.current || !session.data || reviewRequired) return
    const request = {
      amount,
      correction,
      operationId: crypto.randomUUID(),
      date: progress.date,
      expectedRevision: correction ? revision : undefined,
      accountId: session.data.id,
    }
    attempt.current = request
    save.mutate(request)
  }
  return (
    <div
      className="mt-3"
      data-unsaved={save.isPending || save.isError || value !== ''}
      aria-label={t('measure.progressFor', { name })}
    >
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
            disabled={save.isPending || save.isError}
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
                  disabled={save.isPending || save.isError}
                  onChange={(event) => setValue(event.target.value)}
                />
                <button
                  type="submit"
                  disabled={save.isPending || save.isError || value === ''}
                  aria-busy={save.isPending}
                  className="btn-primary text-xs"
                >
                  {t('common.save')}
                </button>
                <button
                  type="button"
                  disabled={save.isPending || save.isError}
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
      {save.isError && (
        <div className="mt-3 rounded-xl border border-danger/20 p-3">
          <p className="text-xs text-muted">
            {t(reviewRequired ? 'ux.quantityConflict' : 'ux.quantityUncertain')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {!reviewRequired && (
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={() => {
                  if (attempt.current) save.mutate(attempt.current)
                }}
              >
                {t('common.retry')}
              </button>
            )}
            <button
              type="button"
              className="min-h-11 px-2 text-xs text-primary"
              onClick={() => {
                attempt.current = null
                setReviewRequired(false)
                save.reset()
                setMode('correct')
                setValue(String(progress.amount))
                setRevision(progress.revision)
                setInvalid(false)
              }}
            >
              {t('ux.reviewTotal')}
            </button>
          </div>
        </div>
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
