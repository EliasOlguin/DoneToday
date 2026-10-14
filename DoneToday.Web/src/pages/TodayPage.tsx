import { resolveHabitIcon } from '../lib/habitIcons'
import { errorText } from '../api/errors'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getTodayHabits } from '../api/today'
import { completeHabit, undoHabitCompletion } from '../api/habits'
import { Link } from 'react-router'
import Icon from '../components/ui/Icon'
import WeekProgressCard from '../components/WeekProgressCard'
import { getWeeklyProgress } from '../api/progress'
import { formatPercent } from '../lib/format'
import { useSession } from '../hooks/useSession'
import { useNow } from '../hooks/useNow'
import { useState } from 'react'

export default function TodayPage() {
  const { t, i18n } = useTranslation()
  const session = useSession()
  const timeZone = session.data?.timeZoneId ?? 'UTC'
  const now = useNow()
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const [undo, setUndo] = useState<{
    id: number
    name: string
    day: string
  } | null>(null)
  const {
    data: habits,
    isPending,
    isError,
  } = useQuery({ queryKey: ['today'], queryFn: getTodayHabits })
  const week = useQuery({
    queryKey: ['progress', 'week'],
    queryFn: getWeeklyProgress,
  })
  const completed = habits?.filter((habit) => habit.isCompleted).length
  const metrics = [
    {
      label: 'nav.today',
      icon: 'check',
      value: habits ? `${completed} / ${habits.length}` : '—',
    },
    {
      label: 'week.title',
      icon: 'chart',
      value: week.data
        ? `${week.data.completed} / ${week.data.scheduled}`
        : '—',
    },
    {
      label: 'today.completionRate',
      icon: 'trophy',
      value: week.data?.scheduled
        ? formatPercent(week.data.completionRate)
        : '—',
    },
  ] as const
  const queryClient = useQueryClient()
  const completionMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: number; isCompleted: boolean }) =>
      isCompleted ? undoHabitCompletion(id) : completeHabit(id),
    onSuccess: async (_, variables) => {
      if (variables.isCompleted) setUndo(null)
      else
        setUndo({
          id: variables.id,
          name: habits?.find((h) => h.id === variables.id)?.name ?? '',
          day: localDay,
        })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['today'] }),
        queryClient.invalidateQueries({ queryKey: ['progress'] }),
        queryClient.invalidateQueries({ queryKey: ['habit'] }),
      ])
    },
  })
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(now),
  )
  const greeting =
    hour < 12
      ? t('today.morning')
      : hour < 18
        ? t('today.afternoon')
        : t('today.evening')
  const date = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  }).format(now)
  return (
    <section aria-labelledby="today-title">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-sm text-muted">
            {date}{' '}
            <span className="text-xs">· {timeZone.replaceAll('_', ' ')}</span>
          </p>
          <h1 id="today-title" className="page-title mt-1 lg:text-5xl">
            {greeting}
          </h1>
          {session.data?.displayName && (
            <p className="mt-1 text-lg font-medium">
              {session.data.displayName}
            </p>
          )}
          <p className="mt-2 text-sm text-muted">{t('today.tagline')}</p>
        </div>
        <Link
          to="/habits/new"
          className="btn-primary hidden shrink-0 items-center gap-2 text-sm lg:inline-flex"
        >
          <Icon name="plus" />
          {t('common.create')}
        </Link>
      </div>
      <dl className="mt-9 hidden grid-cols-3 rounded-2xl border border-muted/10 bg-surface p-6 lg:grid">
        {metrics.map(({ label, icon, value }) => (
          <div
            key={label}
            className="flex items-center gap-4 border-r border-muted/10 px-6 first:pl-0 last:border-0"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon name={icon} className="h-6 w-6" />
            </div>
            <div>
              <dt className="text-sm text-muted">{t(label)}</dt>
              <dd className="mt-1 text-2xl font-bold">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
      <div className="mt-6 grid gap-6 lg:mt-9 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] lg:items-start lg:gap-7">
        <aside className="order-first min-w-0 lg:order-last">
          <WeekProgressCard expanded />
        </aside>
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between lg:mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted lg:text-xl lg:tracking-normal lg:normal-case lg:text-foreground">
              {t('today.habits')}
            </h2>
            {habits && (
              <span className="text-xs text-muted">
                {t('today.done', {
                  count: habits.filter((h) => h.isCompleted).length,
                  completed: habits.filter((h) => h.isCompleted).length,
                  total: habits.length,
                })}
              </span>
            )}
          </div>
          {isPending ? (
            <p role="status" className="text-sm text-muted">
              {t('habits.loading')}
            </p>
          ) : isError ? (
            <p role="alert" className="text-sm text-danger">
              {t('errors.loadHabits')}
            </p>
          ) : habits.length === 0 ? (
            <p className="rounded-2xl bg-surface p-5 text-sm text-muted">
              {t('today.empty')}
            </p>
          ) : (
            <ul className="space-y-3">
              {habits.map((habit) => (
                <li
                  key={habit.id}
                  className={`rounded-2xl border p-4 lg:p-5 ${habit.isCompleted ? 'border-success/15 bg-success/10 lg:border-muted/10 lg:bg-surface' : 'border-muted/10 bg-surface'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-elevated">
                      <Icon
                        name={resolveHabitIcon(habit.icon)}
                        className="h-6 w-6"
                        style={{ color: habit.color ?? '#b7a5ff' }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-sm font-semibold lg:text-base">
                        <Link
                          to={`/habits/${habit.id}`}
                          className="hover:text-primary"
                        >
                          {habit.name}
                        </Link>
                      </h3>
                      <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted">
                        <Icon
                          name="flame"
                          className="h-3.5 w-3.5 text-warning"
                        />
                        {t('today.streak', { count: habit.currentStreak })}
                        <span className="ml-2">
                          {t('today.best', { count: habit.bestStreak })}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={t(
                        habit.isCompleted ? 'today.undo' : 'today.complete',
                        { name: habit.name },
                      )}
                      aria-pressed={habit.isCompleted}
                      disabled={completionMutation.isPending}
                      onClick={() =>
                        completionMutation.mutate({
                          id: habit.id,
                          isCompleted: habit.isCompleted,
                        })
                      }
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full border ${habit.isCompleted ? 'border-success bg-success text-background' : 'border-muted/50'}`}
                      >
                        {completionMutation.isPending &&
                        completionMutation.variables?.id === habit.id ? (
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : habit.isCompleted ? (
                          <Icon name="check" className="h-4 w-4" />
                        ) : null}
                      </span>
                    </button>
                  </div>
                  {completionMutation.isError &&
                    completionMutation.variables?.id === habit.id && (
                      <p role="alert" className="mt-2 text-sm text-danger">
                        {errorText(completionMutation.error)}
                      </p>
                    )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {undo && undo.day === localDay && (
        <div className="fixed bottom-24 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-muted/20 bg-surface p-4 shadow-xl lg:bottom-6">
          <p role="status" className="min-w-0 flex-1 break-words text-sm">
            {t('today.completedNotice', { name: undo.name })}
          </p>
          <button
            type="button"
            className="min-h-11 shrink-0 px-2 text-sm font-semibold text-primary"
            disabled={completionMutation.isPending}
            onClick={() =>
              completionMutation.mutate({ id: undo.id, isCompleted: true })
            }
          >
            {t('today.undoAction')}
          </button>
          <button
            type="button"
            className="h-11 w-8 shrink-0 text-muted"
            aria-label={t('common.dismiss')}
            onClick={() => setUndo(null)}
          >
            ×
          </button>
        </div>
      )}
    </section>
  )
}
