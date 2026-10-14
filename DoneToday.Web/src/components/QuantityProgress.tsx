import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { getQuantityProgress } from '../api/progress'
import MeasurementText from './MeasurementText'
import { formatDate, formatPercent } from '../lib/format'

export default function QuantityProgress({
  habitId,
  year,
  month,
}: {
  habitId?: number
  year?: number
  month?: number
}) {
  const { t } = useTranslation()
  const result = useQuery({
    queryKey: [
      'progress',
      'quantities',
      year ?? null,
      month ?? null,
      habitId ?? null,
    ],
    queryFn: () => getQuantityProgress(habitId, year, month),
    meta: { localLoading: true },
  })
  if (result.isPending)
    return (
      <p role="status" className="mt-5 text-xs text-muted">
        {t('stats.loading')}
      </p>
    )
  if (result.isError)
    return (
      <div className="panel mt-6">
        <p role="alert" className="text-sm text-danger">
          {t('measure.statsError')}
        </p>
        <button
          type="button"
          className="mt-2 min-h-11 text-sm text-primary"
          onClick={() => void result.refetch()}
        >
          {t('common.retry')}
        </button>
      </div>
    )
  if (!result.data.habits.length) return null
  return (
    <section
      className="panel mt-6"
      aria-label={t(month ? 'measure.monthTitle' : 'measure.weekTitle')}
    >
      <h2 className="text-base font-semibold">
        {t(month ? 'measure.monthTitle' : 'measure.weekTitle')}
      </h2>
      <p className="mt-1 text-xs text-muted">
        {formatDate(result.data.startDate)} – {formatDate(result.data.endDate)}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        {t('measure.statsHelp')}
      </p>
      <ul className="mt-4 divide-y divide-muted/10">
        {result.data.habits.map((habit) => (
          <li
            key={`${habit.habitId}-${habit.unit}`}
            className="py-4 first:pt-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                to={`/habits/${habit.habitId}`}
                className="text-sm font-semibold hover:text-primary"
              >
                {habit.name}
              </Link>
              <span className="text-sm">
                <MeasurementText value={habit.amount} unit={habit.unit} />
                <span className="text-muted">
                  {' '}
                  / <MeasurementText value={habit.target} unit={habit.unit} />
                </span>
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={t('measure.coverageFor', { name: habit.name })}
              aria-valuenow={Math.round(habit.coverage)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-elevated"
            >
              <div
                style={{ width: `${Math.min(100, habit.coverage)}%` }}
                className="h-full rounded-full bg-primary"
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {t('measure.coverage')}: {formatPercent(habit.coverage)} ·{' '}
              {t('measure.goalDays', {
                completed: habit.completedDays,
                scheduled: habit.scheduledDays,
              })}
            </p>
            <details className="mt-2">
              <summary className="min-h-9 cursor-pointer py-2 text-xs text-primary">
                {t('measure.dailyBreakdown')}
              </summary>
              <ul className="space-y-2">
                {habit.days.map((day) => (
                  <li
                    key={day.date}
                    className="flex flex-wrap justify-between gap-2 text-xs text-muted"
                  >
                    <span>{formatDate(day.date)}</span>
                    <span>
                      <MeasurementText value={day.amount} unit={habit.unit} /> /{' '}
                      <MeasurementText value={day.target} unit={habit.unit} />
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </section>
  )
}
