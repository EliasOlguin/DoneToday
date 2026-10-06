import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { HabitDetail } from '../types/HabitDetail'
import type { CreateHabitRequest } from '../types/CreateHabitRequest'
import { createHabit, getHabitDetail, updateHabit } from '../api/habits'
import { days } from '../lib/format'

const colors = [
  { color: '#8bd8bd', label: 'Mint' },
  { color: '#9acaff', label: 'Blue' },
  { color: '#b7a5ff', label: 'Lavender' },
  { color: '#f19494', label: 'Rose' },
  { color: '#f5c26b', label: 'Peach' },
  { color: '#f5df8b', label: 'Yellow' },
]

export default function HabitFormPage() {
  const { id } = useParams()
  const habitId = id ? Number(id) : undefined
  const editing = id !== undefined
  const valid = !editing || (Number.isInteger(habitId) && habitId! > 0)
  const habit = useQuery({
    queryKey: ['habit', habitId],
    queryFn: () => getHabitDetail(habitId!),
    enabled: editing && valid,
  })
  if (!valid)
    return (
      <p role="alert" className="text-danger">
        Habit not found.{' '}
        <Link to="/habits" className="underline">
          Back to habits
        </Link>
      </p>
    )
  if (editing && habit.isPending)
    return (
      <p role="status" className="text-muted">
        Loading habit...
      </p>
    )
  if (editing && habit.isError)
    return (
      <p role="alert" className="text-danger">
        {habit.error.message}
      </p>
    )
  return (
    <HabitForm
      key={habitId ?? 'new'}
      habit={editing ? habit.data : undefined}
    />
  )
}

function HabitForm({ habit }: { habit?: HabitDetail }) {
  const [name, setName] = useState(habit?.name ?? '')
  const [description, setDescription] = useState(habit?.description ?? '')
  const [color, setColor] = useState(habit?.color ?? '#b7a5ff')
  const [selectedDays, setSelectedDays] = useState<number[]>(
    habit?.daysOfWeek ?? [],
  )
  const [validationError, setValidationError] = useState('')
  const navigate = useNavigate()
  const client = useQueryClient()
  const cancelTo = habit ? `/habits/${habit.id}` : '/habits'
  const save = useMutation({
    mutationFn: (request: CreateHabitRequest) =>
      habit ? updateHabit(habit.id, request) : createHabit(request),
    onSuccess: async (result) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['habits'] }),
        client.invalidateQueries({ queryKey: ['habit'] }),
        client.invalidateQueries({ queryKey: ['today'] }),
        client.invalidateQueries({ queryKey: ['progress'] }),
      ])
      navigate(`/habits/${result.id}`, { replace: true })
    },
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (save.isPending) return
    if (!name.trim()) {
      setValidationError('Enter a name for your habit.')
      return
    }
    if (selectedDays.length === 0) {
      setValidationError('Choose at least one day.')
      return
    }
    setValidationError('')
    save.mutate({
      name: name.trim(),
      description: description.trim() || null,
      color,
      daysOfWeek: selectedDays,
    })
  }
  return (
    <form onSubmit={submit} aria-labelledby="form-title">
      <div className="mb-7 flex items-center justify-between gap-3">
        <Link
          to={cancelTo}
          className="flex min-h-11 items-center text-sm text-primary"
        >
          Cancel
        </Link>
        <h1 id="form-title" className="text-lg font-semibold">
          {habit ? 'Edit habit' : 'New habit'}
        </h1>
        <button
          type="submit"
          disabled={save.isPending}
          className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-background disabled:opacity-50"
        >
          {save.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
      <fieldset
        disabled={save.isPending}
        className="space-y-6 disabled:opacity-60"
      >
        <div>
          <label
            htmlFor="habit-name"
            className="mb-2 block text-sm font-semibold"
          >
            Name
          </label>
          <input
            id="habit-name"
            autoFocus
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Read for 20 minutes"
            className="field"
          />
        </div>
        <div>
          <label
            htmlFor="habit-description"
            className="mb-2 block text-sm font-semibold"
          >
            Description{' '}
            <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="habit-description"
            maxLength={300}
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What does success look like?"
            className="field resize-y"
          />
        </div>
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">Color</legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((option) => (
              <button
                key={option.color}
                type="button"
                aria-label={option.label}
                aria-pressed={color.toLowerCase() === option.color}
                onClick={() => setColor(option.color)}
                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${color.toLowerCase() === option.color ? 'border-primary' : 'border-transparent'}`}
              >
                <span
                  className="h-8 w-8 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
              </button>
            ))}
          </div>
          <label
            htmlFor="custom-color"
            className="mt-3 flex min-h-11 items-center gap-3 text-xs text-muted"
          >
            <input
              id="custom-color"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-9 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
            />
            Custom color
          </label>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">Schedule</legend>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => (
              <button
                key={day.value}
                type="button"
                aria-label={day.name}
                aria-pressed={selectedDays.includes(day.value)}
                onClick={() =>
                  setSelectedDays((current) =>
                    current.includes(day.value)
                      ? current.filter((value) => value !== day.value)
                      : [...current, day.value],
                  )
                }
                className={`min-h-11 rounded-xl text-xs font-medium ${selectedDays.includes(day.value) ? 'bg-primary text-background' : 'border border-muted/20 bg-surface text-muted'}`}
              >
                {day.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSelectedDays(days.map((day) => day.value))}
            className="mt-2 min-h-11 text-sm text-primary"
          >
            Every day
          </button>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {habit
              ? 'Changes to scheduled days take effect tomorrow (UTC). Your history is preserved.'
              : 'Your schedule starts today (UTC).'}
          </p>
        </fieldset>
      </fieldset>
      {(validationError || save.isError) && (
        <p role="alert" className="mt-5 text-sm text-danger">
          {validationError || save.error?.message}
        </p>
      )}
    </form>
  )
}
