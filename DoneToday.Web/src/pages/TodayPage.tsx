import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getTodayHabits } from '../api/today'
import { completeHabit, undoHabitCompletion } from '../api/habits'
import { Link } from 'react-router'
import Icon from '../components/ui/Icon'
import WeekProgressCard from '../components/WeekProgressCard'

export default function TodayPage() {
  const {
    data: habits,
    isPending,
    isError,
  } = useQuery({ queryKey: ['today'], queryFn: getTodayHabits })
  const queryClient = useQueryClient()
  const completionMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: number; isCompleted: boolean }) =>
      isCompleted ? undoHabitCompletion(id) : completeHabit(id),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['today'] }),
        queryClient.invalidateQueries({ queryKey: ['progress'] }),
        queryClient.invalidateQueries({ queryKey: ['habit'] }),
      ]),
  })
  const hour = new Date().getHours()
  const greeting =
    hour < 12
      ? 'Good morning!'
      : hour < 18
        ? 'Good afternoon!'
        : 'Good evening!'
  const date = new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date())
  return (
    <section aria-labelledby="today-title">
      <p className="text-sm text-muted">
        {date} <span className="text-xs">· UTC</span>
      </p>
      <h1
        id="today-title"
        className="mt-1 text-[28px] font-bold tracking-tight"
      >
        {greeting}
      </h1>
      <p className="mt-2 text-sm text-muted">Small steps. Big life.</p>
      <div className="mt-6">
        <WeekProgressCard />
      </div>
      <div className="mb-3 mt-7 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          Today
        </h2>
        {habits && (
          <span className="text-xs text-muted">
            {habits.filter((h) => h.isCompleted).length}/{habits.length} done
          </span>
        )}
      </div>
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
          No habits scheduled for today.
        </p>
      ) : (
        <ul className="space-y-3">
          {habits.map((habit) => (
            <li
              key={habit.id}
              className={`rounded-2xl border p-4 ${habit.isCompleted ? 'border-success/15 bg-success/10' : 'border-muted/10 bg-surface'}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-elevated">
                  <Icon
                    name="habit"
                    className="h-6 w-6"
                    style={{ color: habit.color ?? '#b7a5ff' }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-semibold">
                    <Link
                      to={`/habits/${habit.id}`}
                      className="hover:text-primary"
                    >
                      {habit.name}
                    </Link>
                  </h3>
                  <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted">
                    <Icon name="flame" className="h-3.5 w-3.5 text-warning" />
                    Streak: {habit.currentStreak}
                    <span className="ml-2">Best: {habit.bestStreak}</span>
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`${habit.isCompleted ? 'Undo completion for' : 'Complete'} ${habit.name}`}
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
                    {completionMutation.error.message}
                  </p>
                )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
