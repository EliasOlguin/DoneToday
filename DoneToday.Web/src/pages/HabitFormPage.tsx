import { errorText } from '../api/errors'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { HabitDetail } from '../types/HabitDetail'
import type { CreateHabitRequest } from '../types/CreateHabitRequest'
import { createHabit, getHabitDetail, updateHabit } from '../api/habits'
import { days, formatWeekday } from '../lib/format'

const colors = [
  { color: '#8bd8bd', label: 'colors.mint' },
  { color: '#9acaff', label: 'colors.blue' },
  { color: '#b7a5ff', label: 'colors.lavender' },
  { color: '#f19494', label: 'colors.rose' },
  { color: '#f5c26b', label: 'colors.peach' },
  { color: '#f5df8b', label: 'colors.yellow' },
] as const

export default function HabitFormPage() {
  const { t } = useTranslation()
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
        {t('errors.habitMissing')}{' '}
        <Link to="/habits" className="underline">
          {t('common.backHabits')}
        </Link>
      </p>
    )
  if (editing && habit.isPending)
    return (
      <p role="status" className="text-muted">
        {t('detail.loading')}
      </p>
    )
  if (editing && habit.isError)
    return (
      <p role="alert" className="text-danger">
        {errorText(habit.error)}
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
  const { t } = useTranslation()
  const [name, setName] = useState(habit?.name ?? '')
  const [description, setDescription] = useState(habit?.description ?? '')
  const [color, setColor] = useState(habit?.color ?? '#b7a5ff')
  const [selectedDays, setSelectedDays] = useState<number[]>(
    habit?.daysOfWeek ?? [],
  )
  const [validationError, setValidationError] = useState<
    '' | 'errors.nameRequired' | 'errors.daysRequired'
  >('')
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
      setValidationError('errors.nameRequired')
      return
    }
    if (selectedDays.length === 0) {
      setValidationError('errors.daysRequired')
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
    <form noValidate onSubmit={submit} aria-labelledby="form-title">
      <div className="mb-7 flex items-center justify-between gap-3">
        <Link
          to={cancelTo}
          className="flex min-h-11 items-center text-sm text-primary"
        >
          {t('common.cancel')}
        </Link>
        <h1 id="form-title" className="text-lg font-semibold">
          {habit ? t('form.edit') : t('form.new')}
        </h1>
      </div>
      <fieldset
        aria-busy={save.isPending}
        disabled={save.isPending}
        className="space-y-6 disabled:opacity-60"
      >
        <div>
          <label
            htmlFor="habit-name"
            className="mb-2 block text-sm font-semibold"
          >
            {t('form.name')}
          </label>
          <input
            id="habit-name"
            autoFocus
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('form.namePlaceholder')}
            className="field"
          />
        </div>
        <div>
          <label
            htmlFor="habit-description"
            className="mb-2 block text-sm font-semibold"
          >
            {t('form.description')}{' '}
            <span className="font-normal text-muted">
              {t('common.optional')}
            </span>
          </label>
          <textarea
            id="habit-description"
            maxLength={300}
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('form.descriptionPlaceholder')}
            className="field resize-y"
          />
        </div>
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">
            {t('form.color')}
          </legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((option) => (
              <button
                key={option.color}
                type="button"
                aria-label={t(option.label)}
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
            {t('form.customColor')}
          </label>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">
            {t('common.schedule')}
          </legend>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => (
              <button
                key={day.value}
                type="button"
                aria-label={formatWeekday(day.value, 'long')}
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
                {formatWeekday(day.value, 'short')}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSelectedDays(days.map((day) => day.value))}
            className="mt-2 min-h-11 text-sm text-primary"
          >
            {t('common.everyDay')}
          </button>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {habit ? t('form.scheduleEdit') : t('form.scheduleNew')}
          </p>
        </fieldset>
      </fieldset>
      {(validationError || save.isError) && (
        <p role="alert" className="mt-5 text-sm text-danger">
          {validationError ? t(validationError) : errorText(save.error)}
        </p>
      )}
      <button
        type="submit"
        aria-busy={save.isPending}
        disabled={save.isPending}
        className="btn-primary mt-6 w-full"
      >
        {save.isPending ? t('common.saving') : t('common.save')}
      </button>
    </form>
  )
}
