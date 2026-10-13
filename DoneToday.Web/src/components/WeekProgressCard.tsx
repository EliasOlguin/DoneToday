import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'

import { formatPercent } from '../lib/format'
import { getWeeklyProgress } from '../api/progress'
import { Link } from 'react-router'
import DailyProgressChart from './DailyProgressChart'
import Icon from './ui/Icon'

export default function WeekProgressCard({
  expanded = false,
}: {
  expanded?: boolean
}) {
  const { t } = useTranslation()
  const { data, isPending, isError } = useQuery({
    queryKey: ['progress', 'week'],
    queryFn: getWeeklyProgress,
  })
  const rate = Math.min(100, Math.max(0, data?.completionRate ?? 0))
  return (
    <section
      aria-label={t('week.label')}
      className={`flex items-center gap-4 rounded-2xl border border-muted/10 bg-surface p-5 ${expanded ? 'lg:flex-col lg:items-stretch lg:gap-0 lg:p-7' : ''}`}
    >
      {expanded && (
        <h2 className="hidden text-xl font-semibold lg:block">
          {t('week.title')}
        </h2>
      )}
      <div
        className={`relative h-12 w-12 shrink-0 ${expanded ? 'lg:mx-auto lg:my-7 lg:h-36 lg:w-36' : ''}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="19"
            fill="none"
            stroke="var(--color-elevated)"
            strokeWidth="5"
          />
          <circle
            cx="24"
            cy="24"
            r="19"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="5"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${rate} 100`}
          />
        </svg>
        {expanded && data && (
          <span className="absolute inset-0 hidden items-center justify-center text-3xl font-bold lg:flex">
            {data.scheduled ? formatPercent(rate) : '—'}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className={`text-sm font-semibold ${expanded ? 'lg:hidden' : ''}`}>
          {t('week.title')}
        </h2>
        <p
          className={`mt-1 text-xs text-muted ${expanded ? 'lg:text-center lg:text-sm' : ''}`}
          role={isError ? 'alert' : undefined}
        >
          {isPending
            ? t('week.loading')
            : isError
              ? t('week.unavailable')
              : t('week.completed', {
                  count: data.completed,
                  completed: data.completed,
                  total: data.scheduled,
                })}
        </p>
      </div>
      {data && (
        <span
          className={`text-lg font-semibold text-primary ${expanded ? 'lg:hidden' : ''}`}
        >
          {formatPercent(rate)}
        </span>
      )}
      {expanded && data && (
        <div className="hidden lg:block">
          <h3 className="mt-7 text-sm font-semibold">{t('stats.daily')}</h3>
          <DailyProgressChart progress={data} />
          <Link
            to="/progress"
            className="mt-7 flex min-h-11 items-center gap-2 border-t border-muted/10 pt-5 text-sm font-semibold text-primary"
          >
            {t('common.statistics')}
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  )
}
