import { useQuery } from '@tanstack/react-query'
import { getHabits } from '../api/habits'
import { Link } from 'react-router'
import Icon from '../components/ui/Icon'

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function HabitsPage() {
  const {
    data: habits,
    isPending,
    isError,
  } = useQuery({ queryKey: ['habits'], queryFn: getHabits })
  return (
    <section aria-labelledby="habits-title">
      <h1 id="habits-title" className="text-[28px] font-bold tracking-tight">
        Habits
      </h1>
      <p className="mt-2 text-sm text-muted">
        Build routines that work for you.
      </p>
      <div className="mt-6">
        {isPending ? (
          <p role="status" className="text-sm text-muted">
            Loading your habits...
          </p>
        ) : isError ? (
          <p role="alert" className="text-sm text-danger">
            Could not load your habits. Please try again later.
          </p>
        ) : habits.length === 0 ? (
          <p className="rounded-2xl bg-surface p-5 text-sm text-muted">
            You haven't created any habits yet.
          </p>
        ) : (
          <ul className="space-y-3">
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
                      name="habit"
                      className="h-6 w-6"
                      style={{ color: habit.color ?? '#b7a5ff' }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-sm font-semibold">
                      {habit.name}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {habit.daysOfWeek.length === 7
                        ? 'Every day'
                        : [...habit.daysOfWeek]
                            .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
                            .map((day) => dayNames[day])
                            .join(', ')}
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
