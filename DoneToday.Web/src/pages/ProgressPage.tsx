import { resolveHabitIcon } from '../lib/habitIcons'
import { errorText } from '../api/errors'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { getWeeklyProgress } from '../api/progress'
import { formatDate, formatPercent } from '../lib/format'
import WeekProgressCard from '../components/WeekProgressCard'
import Icon from '../components/ui/Icon'
import DailyProgressChart from '../components/DailyProgressChart'
import { useSession } from '../hooks/useSession'
import MonthlyProgress from '../components/MonthlyProgress'
import { useState } from 'react'
import StatisticsHabitSelector from '../components/StatisticsHabitSelector'
import { getHabits } from '../api/habits'

export default function ProgressPage() {
  const { t } = useTranslation()
  const timeZone = useSession().data?.timeZoneId ?? 'UTC'
  const [selected, setSelected] = useState<number | undefined>()
  const habits = useQuery({ queryKey: ['habits'], queryFn: getHabits })
  const habitId =
    habits.data && !habits.data.some((h) => h.id === selected)
      ? undefined
      : selected
  const progress = useQuery({
    queryKey: habitId ? ['progress', 'week', habitId] : ['progress', 'week'],
    queryFn: () => getWeeklyProgress(habitId),
    meta: { localLoading: true },
  })
  return (
    <section aria-labelledby="stats-title">
      <h1 id="stats-title" className="page-title">
        {t('common.statistics')}
      </h1>
      <p className="mt-2 text-sm text-muted">{t('stats.tagline')}</p>
      <div className="mt-5 max-w-md">
        <StatisticsHabitSelector
          habits={habits.data}
          value={habitId}
          onChange={setSelected}
        />
        <p className="mt-2 text-xs text-muted">{t('stats.filterHelp')}</p>
        {habits.isError && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {t('errors.loadHabits')}{' '}
            <button
              type="button"
              className="min-h-11 underline"
              onClick={() => void habits.refetch()}
            >
              {t('common.retry')}
            </button>
          </p>
        )}
      </div>
      <div className="mt-6 inline-flex min-h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-background">
        {t('week.title')}
      </div>
      <div className="mt-4">
        <WeekProgressCard habitId={habitId} localLoading />
      </div>
      {progress.isPending ? (
        <p role="status" className="mt-6 text-muted">
          {t('stats.loading')}
        </p>
      ) : progress.isError ? (
        <div className="panel mt-6">
          <p role="alert" className="text-sm text-danger">
            {errorText(progress.error)}
          </p>
          <button
            type="button"
            onClick={() => void progress.refetch()}
            className="mt-2 min-h-11 text-sm text-primary"
          >
            {t('common.retry')}
          </button>
        </div>
      ) : (
        <>
          <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-7">
            <section className="panel mt-4" aria-labelledby="daily-title">
              <h2 id="daily-title" className="text-sm font-semibold">
                {t('stats.daily')}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {formatDate(progress.data.startDate)} –{' '}
                {formatDate(progress.data.endDate)} ·{' '}
                {timeZone.replaceAll('_', ' ')}
              </p>
              <DailyProgressChart progress={progress.data} />
              <p className="mt-4 text-xs text-muted">{t('stats.legend')}</p>
            </section>
            <section className="mt-7 lg:mt-4" aria-labelledby="breakdown-title">
              <h2 id="breakdown-title" className="mb-3 text-lg font-semibold">
                {t('stats.breakdown')}
              </h2>
              {progress.data.habits.length === 0 ? (
                <p className="panel text-sm text-muted">{t('stats.empty')}</p>
              ) : (
                <ul className="overflow-hidden rounded-2xl border border-muted/10 bg-surface">
                  {progress.data.habits.map((habit) => (
                    <li
                      key={habit.id}
                      className="border-b border-muted/10 last:border-0"
                    >
                      <Link
                        to={`/habits/${habit.id}`}
                        className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-elevated"
                      >
                        <Icon
                          name={resolveHabitIcon(habit.icon)}
                          style={{
                            color: habit.color ?? 'var(--color-primary)',
                          }}
                        />
                        <span className="min-w-0 flex-1 break-words text-sm font-semibold">
                          {habit.name}
                        </span>
                        <span className="text-xs text-muted">
                          {habit.completed}/{habit.scheduled}
                        </span>
                        <span className="w-10 text-right text-xs font-semibold text-success">
                          {habit.scheduled
                            ? formatPercent(habit.completionRate)
                            : '—'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
      <MonthlyProgress habitId={habitId} />
    </section>
  )
}
