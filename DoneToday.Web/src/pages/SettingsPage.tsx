import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useContext } from 'react'
import { ThemeContext } from '../context/theme'
import { getArchivedHabits, restoreHabit } from '../api/habits'
import { formatSchedule } from '../lib/format'
import Icon from '../components/ui/Icon'

export default function SettingsPage() {
  const { theme, setTheme } = useContext(ThemeContext)
  const client = useQueryClient()
  const archived = useQuery({
    queryKey: ['habits', 'archived'],
    queryFn: getArchivedHabits,
  })
  const restore = useMutation({
    mutationFn: restoreHabit,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['habits'] }),
        client.invalidateQueries({ queryKey: ['today'] }),
        client.invalidateQueries({ queryKey: ['progress'] }),
      ]),
  })
  return (
    <section aria-labelledby="settings-title">
      <h1 id="settings-title" className="page-title">
        Settings
      </h1>
      <p className="mt-2 text-sm text-muted">Make room for your routines.</p>
      <section className="panel mt-6">
        <h2 className="font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-muted">Choose your preferred theme.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(['dark', 'light'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
              className={`min-h-11 rounded-xl text-sm font-medium ${theme === value ? 'bg-primary text-background' : 'bg-elevated text-muted'}`}
            >
              {value === 'dark' ? 'Dark' : 'Light'}
            </button>
          ))}
        </div>
      </section>
      <section className="panel mt-4">
        <h2 className="font-semibold">Language</h2>
        <p className="mt-2 text-sm text-muted">English</p>
        <p className="mt-1 text-xs text-muted">
          More languages are coming later.
        </p>
      </section>
      <section className="panel mt-4">
        <h2 className="font-semibold">Daily schedule</h2>
        <p className="mt-2 text-sm text-muted">
          Days reset at midnight UTC. Weekly progress starts on Monday.
        </p>
      </section>
      <section className="mt-7" aria-labelledby="archived-title">
        <h2 id="archived-title" className="mb-3 text-lg font-semibold">
          Archived habits
        </h2>
        <p className="mb-4 text-sm text-muted">
          Restore a habit whenever you're ready to return to it.
        </p>
        {archived.isPending ? (
          <p role="status" className="text-muted">
            Loading archived habits...
          </p>
        ) : archived.isError ? (
          <p role="alert" className="text-danger">
            {archived.error.message}
          </p>
        ) : archived.data.length === 0 ? (
          <p className="panel text-sm text-muted">No archived habits.</p>
        ) : (
          <ul className="space-y-3">
            {archived.data.map((habit) => (
              <li key={habit.id} className="panel flex items-center gap-3">
                <Icon
                  name="habit"
                  style={{ color: habit.color ?? 'var(--color-primary)' }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-semibold">
                    {habit.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {formatSchedule(habit.daysOfWeek)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={restore.isPending}
                  onClick={() => restore.mutate(habit.id)}
                  className="min-h-11 rounded-xl px-3 text-sm font-medium text-primary disabled:opacity-50"
                >
                  {restore.isPending && restore.variables === habit.id
                    ? 'Restoring...'
                    : 'Restore'}
                </button>
              </li>
            ))}
          </ul>
        )}
        {restore.isError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {restore.error.message}
          </p>
        )}
        {restore.isSuccess && (
          <p role="status" className="mt-3 text-sm text-success">
            Habit restored.{' '}
            <Link to="/habits" className="underline">
              View habits
            </Link>
          </p>
        )}
      </section>
    </section>
  )
}
