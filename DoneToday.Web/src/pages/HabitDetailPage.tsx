import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { useState } from 'react'
import { archiveHabit, getHabitDetail } from '../api/habits'
import { formatDate, formatSchedule } from '../lib/format'
import Icon from '../components/ui/Icon'

export default function HabitDetailPage() {
  const { id } = useParams()
  const habitId = Number(id)
  const valid = Number.isInteger(habitId) && habitId > 0
  const habit = useQuery({
    queryKey: ['habit', habitId],
    queryFn: () => getHabitDetail(habitId),
    enabled: valid,
  })
  const [confirmArchive, setConfirmArchive] = useState(false)
  const navigate = useNavigate()
  const client = useQueryClient()
  const archive = useMutation({
    mutationFn: () => archiveHabit(habitId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['habits'] }),
        client.invalidateQueries({ queryKey: ['habit'] }),
        client.invalidateQueries({ queryKey: ['today'] }),
        client.invalidateQueries({ queryKey: ['progress'] }),
      ])
      navigate('/habits', { replace: true })
    },
  })
  if (!valid)
    return (
      <p role="alert" className="text-danger">
        Habit not found.
      </p>
    )
  if (habit.isPending)
    return (
      <p role="status" className="text-muted">
        Loading habit...
      </p>
    )
  if (habit.isError)
    return (
      <div>
        <p role="alert" className="text-danger">
          {habit.error.message}
        </p>
        <Link to="/habits" className="mt-4 inline-block text-primary">
          Back to habits
        </Link>
      </div>
    )
  const data = habit.data
  return (
    <section aria-labelledby="detail-title">
      <div className="flex items-center justify-between">
        <Link
          to="/habits"
          aria-label="Back to habits"
          className="flex h-11 w-11 items-center justify-center"
        >
          <Icon name="arrow" className="h-5 w-5 rotate-180" />
        </Link>
        <Link
          to={`/habits/${habitId}/edit`}
          className="flex min-h-11 items-center px-3 text-sm font-medium text-primary"
        >
          Edit
        </Link>
      </div>
      <div className="mb-7 mt-3 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-elevated">
          <Icon
            name="habit"
            className="h-10 w-10"
            style={{ color: data.color ?? 'var(--color-primary)' }}
          />
        </div>
        <h1 id="detail-title" className="page-title mt-4 break-words">
          {data.name}
        </h1>
        <p className="mt-2 break-words text-sm text-muted">
          {data.description || 'Stay consistent. One day at a time.'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="panel flex items-center gap-3">
          <Icon name="flame" className="h-6 w-6 shrink-0 text-warning" />
          <div>
            <p className="text-xs text-muted">Current streak</p>
            <p className="mt-1 text-2xl font-bold">{data.currentStreak}</p>
          </div>
        </div>
        <div className="panel flex items-center gap-3">
          <Icon name="trophy" className="h-6 w-6 shrink-0 text-warning" />
          <div>
            <p className="text-xs text-muted">Best streak</p>
            <p className="mt-1 text-2xl font-bold">{data.bestStreak}</p>
          </div>
        </div>
      </div>
      <div className="panel mt-3">
        <h2 className="text-sm font-semibold">Schedule</h2>
        <p className="mt-2 text-sm text-muted">
          {formatSchedule(data.daysOfWeek)}
        </p>
        {data.scheduleEffectiveFrom && (
          <p className="mt-2 text-xs text-muted">
            Effective from {formatDate(data.scheduleEffectiveFrom)} (UTC)
          </p>
        )}
      </div>
      <div className="panel mt-3">
        <h2 className="text-sm font-semibold">
          Completions{' '}
          <span className="ml-2 text-muted">{data.completionDates.length}</span>
        </h2>
        {data.completionDates.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Your first completion is ahead of you.
          </p>
        ) : (
          <ul className="mt-3 max-h-52 space-y-2 overflow-auto">
            {data.completionDates.map((date) => (
              <li
                key={date}
                className="flex items-center gap-2 text-sm text-muted"
              >
                <Icon name="check" className="h-4 w-4 text-success" />
                {formatDate(date)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link
        to="/progress"
        className="panel mt-3 flex min-h-14 items-center justify-between text-sm font-semibold"
      >
        <span>Statistics</span>
        <Icon name="arrow" />
      </Link>
      <div className="panel mt-3">
        {!confirmArchive ? (
          <button
            type="button"
            onClick={() => setConfirmArchive(true)}
            className="flex min-h-11 items-center gap-3 text-sm text-danger"
          >
            <Icon name="archive" />
            Archive habit
          </button>
        ) : (
          <div>
            <p className="text-sm">Archive this habit?</p>
            <p className="mt-2 text-xs text-muted">
              It will leave Today and Habits. You can restore it from Settings.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                disabled={archive.isPending}
                onClick={() => archive.mutate()}
                className="min-h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-background disabled:opacity-50"
              >
                {archive.isPending ? 'Archiving...' : 'Archive'}
              </button>
              <button
                type="button"
                disabled={archive.isPending}
                onClick={() => setConfirmArchive(false)}
                className="min-h-11 px-3 text-sm text-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {archive.isError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {archive.error.message}
          </p>
        )}
      </div>
    </section>
  )
}
