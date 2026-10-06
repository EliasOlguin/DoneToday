import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { getWeeklyProgress } from '../api/progress'
import { formatDate } from '../lib/format'
import WeekProgressCard from '../components/WeekProgressCard'
import Icon from '../components/ui/Icon'

export default function ProgressPage() {
  const progress = useQuery({
    queryKey: ['progress', 'week'],
    queryFn: getWeeklyProgress,
  })
  return (
    <section aria-labelledby="stats-title">
      <h1 id="stats-title" className="page-title">
        Statistics
      </h1>
      <p className="mt-2 text-sm text-muted">Small steps add up.</p>
      <div className="mt-6 inline-flex min-h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-background">
        This week
      </div>
      <div className="mt-4">
        <WeekProgressCard />
      </div>
      {progress.isPending ? (
        <p role="status" className="mt-6 text-muted">
          Loading statistics...
        </p>
      ) : progress.isError ? (
        <div className="panel mt-6">
          <p role="alert" className="text-sm text-danger">
            {progress.error.message}
          </p>
          <button
            type="button"
            onClick={() => void progress.refetch()}
            className="mt-2 min-h-11 text-sm text-primary"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <section className="panel mt-4" aria-labelledby="daily-title">
            <h2 id="daily-title" className="text-sm font-semibold">
              Daily completions
            </h2>
            <p className="mt-1 text-xs text-muted">
              {formatDate(progress.data.startDate)} –{' '}
              {formatDate(progress.data.endDate)} · UTC
            </p>
            <div className="mt-6 grid grid-cols-7 items-end gap-2">
              {progress.data.days.map((day) => {
                const future = day.date > progress.data.endDate
                const rate = day.scheduled
                  ? (day.completed / day.scheduled) * 100
                  : 0
                const label = new Intl.DateTimeFormat('en', {
                  weekday: 'short',
                  timeZone: 'UTC',
                }).format(new Date(`${day.date}T12:00:00Z`))
                return (
                  <div key={day.date} className="text-center">
                    <div
                      className="relative mx-auto h-28 w-full max-w-7 overflow-hidden rounded-t-lg bg-elevated"
                      aria-hidden="true"
                    >
                      <div
                        className="absolute inset-x-0 bottom-0 rounded-t-lg bg-success transition-all"
                        style={{ height: `${rate}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-muted">{label}</p>
                    <p className="mt-1 text-[10px] text-muted">
                      {future ? '—' : `${day.completed}/${day.scheduled}`}
                    </p>
                    <span className="sr-only">
                      {formatDate(day.date)}:{' '}
                      {future
                        ? 'upcoming'
                        : `${day.completed} of ${day.scheduled} scheduled habits completed`}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-4 text-xs text-muted">
              Completed / scheduled. Upcoming days are excluded.
            </p>
          </section>
          <section className="mt-7" aria-labelledby="breakdown-title">
            <h2 id="breakdown-title" className="mb-3 text-lg font-semibold">
              Habit breakdown
            </h2>
            {progress.data.habits.length === 0 ? (
              <p className="panel text-sm text-muted">
                Create your first habit to start tracking progress.
              </p>
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
                        name="habit"
                        style={{ color: habit.color ?? 'var(--color-primary)' }}
                      />
                      <span className="min-w-0 flex-1 break-words text-sm font-semibold">
                        {habit.name}
                      </span>
                      <span className="text-xs text-muted">
                        {habit.completed}/{habit.scheduled}
                      </span>
                      <span className="w-10 text-right text-xs font-semibold text-success">
                        {habit.scheduled
                          ? `${Math.round(habit.completionRate)}%`
                          : '—'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  )
}
