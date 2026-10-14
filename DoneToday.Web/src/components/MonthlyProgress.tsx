import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getMonthlyProgress } from '../api/progress'
import { useSession } from '../hooks/useSession'
import { useNow } from '../hooks/useNow'
import { formatWeekday, days, formatPercent, formatDate } from '../lib/format'
import QuantityProgress from './QuantityProgress'

export default function MonthlyProgress({ habitId }: { habitId?: number }) {
  const { t, i18n } = useTranslation()
  const zone = useSession().data?.timeZoneId ?? 'UTC'
  const now = useNow()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now)
  const current = [
    Number(parts.find((p) => p.type === 'year')!.value),
    Number(parts.find((p) => p.type === 'month')!.value),
  ]
  const [selected, setSelected] = useState<number[] | null>(null)
  const [year, month] = selected ?? current
  const progress = useQuery({
    queryKey: ['progress', 'month', year, month, habitId ?? null],
    queryFn: () => getMonthlyProgress(year, month, habitId),
    meta: { localLoading: true },
  })
  const monthDate = new Date(Date.UTC(year, month - 1, 1))
  const label = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(monthDate)
  const offset = (monthDate.getUTCDay() + 6) % 7
  function change(direction: number) {
    const next = new Date(Date.UTC(year, month - 1 + direction, 1))
    setSelected([next.getUTCFullYear(), next.getUTCMonth() + 1])
  }
  return (
    <>
      <QuantityProgress habitId={habitId} year={year} month={month} />
      <section className="panel mt-6" aria-label={t('month.title')}>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="h-11 w-11 text-primary"
            disabled={year === 1900 && month === 1}
            aria-label={t('month.previous')}
            onClick={() => change(-1)}
          >
            ←
          </button>
          <h2 className="text-center font-semibold capitalize">{label}</h2>
          <button
            type="button"
            className="h-11 w-11 text-primary disabled:opacity-30"
            disabled={year === current[0] && month === current[1]}
            aria-label={t('month.next')}
            onClick={() => change(1)}
          >
            →
          </button>
        </div>
        {progress.isPending ? (
          <p role="status" className="mt-3 text-sm text-muted">
            {t('stats.loading')}
          </p>
        ) : progress.isError ? (
          <div className="mt-3">
            <p role="alert" className="text-sm text-danger">
              {t('errors.progress')}
            </p>
            <button
              className="min-h-11 text-primary"
              type="button"
              onClick={() => void progress.refetch()}
            >
              {t('common.retry')}
            </button>
          </div>
        ) : (
          <>
            <p className="mb-4 mt-2 text-center text-sm text-muted">
              {t('month.summary', {
                completed: progress.data.completed,
                scheduled: progress.data.scheduled,
              })}{' '}
              · {formatPercent(progress.data.completionRate)}
            </p>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((day) => (
                <span
                  key={day.value}
                  className="pb-1 text-center text-xs text-muted"
                >
                  {formatWeekday(day.value)}
                </span>
              ))}
              {Array.from({ length: offset }, (_, index) => (
                <span key={`empty-${index}`} />
              ))}
              {progress.data.days.map((day) => {
                const future = day.date > progress.data.today
                const done =
                  day.scheduled > 0 && day.completed === day.scheduled
                return (
                  <div
                    key={day.date}
                    title={t('month.day', {
                      date: formatDate(day.date),
                      completed: day.completed,
                      scheduled: day.scheduled,
                    })}
                    aria-label={t('month.day', {
                      date: formatDate(day.date),
                      completed: day.completed,
                      scheduled: day.scheduled,
                    })}
                    className={`flex min-h-14 flex-col items-center justify-center rounded-lg border text-xs ${future ? 'border-transparent text-muted/40' : done ? 'border-success/40 bg-success/15 text-foreground' : 'border-muted/10 bg-elevated text-foreground'}`}
                  >
                    <span className="font-semibold">
                      {Number(day.date.slice(-2))}
                    </span>
                    <span className="mt-1 text-[10px]">
                      {!future && day.scheduled > 0
                        ? `${day.completed}/${day.scheduled}`
                        : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              {t(habitId ? 'month.filteredHelp' : 'month.help')}
            </p>
          </>
        )}
      </section>
    </>
  )
}
