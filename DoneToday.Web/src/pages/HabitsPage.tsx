import { resolveHabitIcon } from '../lib/habitIcons'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getHabits } from '../api/habits'
import { Link } from 'react-router'
import { formatSchedule } from '../lib/format'
import Icon from '../components/ui/Icon'

export default function HabitsPage() {
  const { t } = useTranslation()
  const {
    data: habits,
    isPending,
    isError,
  } = useQuery({ queryKey: ['habits'], queryFn: getHabits })
  return (
    <section aria-labelledby="habits-title">
      <div className="flex items-center justify-between gap-4">
        <h1 id="habits-title" className="page-title">
          {t('nav.habits')}
        </h1>
        <Link
          to="/habits/new"
          className="btn-primary hidden items-center gap-2 text-sm lg:inline-flex"
        >
          <Icon name="plus" />
          {t('common.create')}
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">{t('habits.tagline')}</p>
      <div className="mt-6">
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
            {t('habits.empty')}
          </p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2 lg:gap-5">
            {habits.map((habit) => (
              <li
                key={habit.id}
                className="rounded-2xl border border-muted/10 bg-surface"
              >
                <Link
                  to={`/habits/${habit.id}`}
                  className="flex items-center gap-3 rounded-2xl p-4 hover:bg-elevated"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-elevated">
                    <Icon
                      name={resolveHabitIcon(habit.icon)}
                      className="h-6 w-6"
                      style={{ color: habit.color ?? '#b7a5ff' }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-sm font-semibold">
                      {habit.name}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {formatSchedule(habit.daysOfWeek)}
                    </p>
                    {habit.description && (
                      <p className="mt-2 break-words text-sm text-muted">
                        {habit.description}
                      </p>
                    )}
                  </div>
                  <Icon name="arrow" className="h-4 w-4 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
