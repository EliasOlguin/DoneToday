import { errorText } from '../api/errors'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { HabitDetail } from '../types/HabitDetail'
import type { CreateHabitRequest } from '../types/CreateHabitRequest'
import { createHabit, getHabitDetail, updateHabit } from '../api/habits'
import { days, formatWeekday } from '../lib/format'
import Icon from '../components/ui/Icon'
import {
  habitIcons,
  resolveHabitIcon,
  suggestHabitIcon,
} from '../lib/habitIcons'
import type { HabitIconName } from '../lib/habitIcons'
import { goalUnits } from '../types/HabitProgress'
import type { GoalUnit } from '../types/HabitProgress'
import { validMeasurement, wholeUnit } from '../lib/measurements'
import MeasurementText from '../components/MeasurementText'

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
  const [params] = useSearchParams()
  const template = (['read', 'water', 'walk'] as const).find(value => value === params.get('template')) ?? null
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
      key={habitId ?? `new:${template ?? ''}`}
      habit={editing ? habit.data : undefined}
      template={template}
    />
  )
}

function HabitForm({
  habit,
  template,
}: {
  habit?: HabitDetail
  template: 'read' | 'water' | 'walk' | null
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(
    habit?.name ?? (template ? t(`ux.example.${template}`) : ''),
  )
  const formRef = useRef<HTMLFormElement>(null)
  const [description, setDescription] = useState(habit?.description ?? '')
  const [color, setColor] = useState(habit?.color ?? '#b7a5ff')
  const [chosenIcon, setChosenIcon] = useState<HabitIconName | null>(
    habit ? resolveHabitIcon(habit.icon) : null,
  )
  const suggestedIcon = suggestHabitIcon(name)
  const icon = chosenIcon ?? suggestedIcon
  const [measured, setMeasured] = useState(habit?.goalTarget != null)
  const [goalTarget, setGoalTarget] = useState(String(habit?.goalTarget ?? ''))
  const [goalUnit, setGoalUnit] = useState<GoalUnit>(
    habit?.goalUnit ?? 'minutes',
  )
  const [selectedDays, setSelectedDays] = useState<number[]>(
    habit?.daysOfWeek ?? [],
  )
  const [validationError, setValidationError] = useState<
    '' | 'errors.nameRequired' | 'errors.daysRequired' | 'measure.invalid'
  >('')
  const navigate = useNavigate()
  const client = useQueryClient()
  const cancelTo = habit ? `/habits/${habit.id}` : '/habits'
  const save = useMutation({
    meta: { localLoading: true },
    mutationFn: (request: CreateHabitRequest) =>
      habit ? updateHabit(habit.id, request) : createHabit(request),
    onSuccess: async (result) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['habits'] }),
        client.invalidateQueries({ queryKey: ['habit'] }),
        client.invalidateQueries({ queryKey: ['today'] }),
        client.invalidateQueries({ queryKey: ['progress'] }),
      ]).catch(() => {})
      if (formRef.current) formRef.current.dataset.unsaved = 'false'
      navigate(`/habits/${result.id}`, { replace: true })
    },
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (save.isPending) return
    if (!name.trim()) {
      setValidationError('errors.nameRequired')
      document.getElementById('habit-name')?.focus()
      return
    }
    if (selectedDays.length === 0) {
      setValidationError('errors.daysRequired')
      document.getElementById('habit-days')?.focus()
      return
    }
    if (measured && !validMeasurement(Number(goalTarget), goalUnit)) {
      setValidationError('measure.invalid')
      document.getElementById('goal-target')?.focus()
      return
    }
    setValidationError('')
    save.mutate({
      name: name.trim(),
      description: description.trim() || null,
      color,
      icon,
      daysOfWeek: selectedDays,
      goalTarget: measured ? Number(goalTarget) : null,
      goalUnit: measured ? goalUnit : null,
    })
  }
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={submit}
      aria-labelledby="form-title"
      data-unsaved={
        name !== (habit?.name ?? '') ||
        description !== (habit?.description ?? '') ||
        color !== (habit?.color ?? '#b7a5ff') ||
        icon !== (habit ? resolveHabitIcon(habit.icon) : 'habit') ||
        measured !== (habit?.goalTarget != null) ||
        (measured &&
          (Number(goalTarget) !== habit?.goalTarget ||
            goalUnit !== habit?.goalUnit)) ||
        [...selectedDays].sort().join(',') !==
          [...(habit?.daysOfWeek ?? [])].sort().join(',')
      }
    >
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
            aria-invalid={validationError === 'errors.nameRequired'}
            aria-describedby={
              validationError === 'errors.nameRequired'
                ? 'habit-name-error'
                : undefined
            }
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('form.namePlaceholder')}
            className="field"
          />
          {validationError === 'errors.nameRequired' && (
            <p
              role="alert"
              id="habit-name-error"
              className="mt-2 text-sm text-danger"
            >
              {t('errors.nameRequired')}
            </p>
          )}
        </div>
        <fieldset
          id="habit-days"
          tabIndex={-1}
          aria-invalid={validationError === 'errors.daysRequired'}
          aria-describedby={
            validationError === 'errors.daysRequired'
              ? 'habit-days-error'
              : undefined
          }
        >
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
          {validationError === 'errors.daysRequired' && (
            <p
              role="alert"
              id="habit-days-error"
              className="mt-2 text-sm text-danger"
            >
              {t('errors.daysRequired')}
            </p>
          )}
        </fieldset>
        <fieldset className="rounded-2xl border border-muted/15 bg-surface p-4">
          <legend className="px-1 text-sm font-semibold">
            {t('measure.tracking')}
          </legend>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={measured}
              onChange={(event) => {
                setMeasured(event.target.checked)
                if (event.target.checked && !goalTarget) {
                  setGoalUnit(
                    icon === 'water'
                      ? 'l'
                      : icon === 'book'
                        ? 'pages'
                        : icon === 'walk'
                          ? 'km'
                          : 'minutes',
                  )
                  setGoalTarget(
                    icon === 'water' ? '2' : icon === 'walk' ? '3' : '20',
                  )
                }
              }}
              className="h-5 w-5 accent-primary"
            />
            {t('measure.enable')}
          </label>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {t('measure.optionalHelp')}
          </p>
          {measured && (
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="goal-target"
                  className="mb-2 block text-sm font-semibold"
                >
                  {t('measure.dailyGoal')}
                </label>
                <input
                  id="goal-target"
                  aria-invalid={validationError === 'measure.invalid'}
                  aria-describedby={
                    validationError === 'measure.invalid'
                      ? 'goal-target-error'
                      : undefined
                  }
                  type="number"
                  className="field"
                  value={goalTarget}
                  required
                  min={wholeUnit(goalUnit) ? 1 : 0.001}
                  max={1_000_000}
                  step={wholeUnit(goalUnit) ? 1 : 0.001}
                  onChange={(event) => setGoalTarget(event.target.value)}
                />
                {validationError === 'measure.invalid' && (
                  <p
                    role="alert"
                    id="goal-target-error"
                    className="mt-2 text-sm text-danger"
                  >
                    {t(
                      wholeUnit(goalUnit)
                        ? 'ux.wholeTarget'
                        : 'ux.decimalTarget',
                    )}
                  </p>
                )}
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">
                  {t('measure.unitLabel')}
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {goalUnits.map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setGoalUnit(unit)}
                      aria-pressed={goalUnit === unit}
                      className={`min-h-11 rounded-xl border px-2 text-xs ${goalUnit === unit ? 'border-primary bg-primary/10 text-primary' : 'border-muted/20 text-muted'}`}
                    >
                      {t(`measure.unit.${unit}`, { count: 2 })}
                    </button>
                  ))}
                </div>
              </fieldset>
              {validMeasurement(Number(goalTarget), goalUnit) && (
                <div className="rounded-xl bg-elevated p-3 text-sm">
                  <span className="font-semibold">
                    {name.trim() || t('measure.preview')}
                  </span>
                  <p className="mt-1 text-muted">
                    0 /{' '}
                    <MeasurementText
                      value={Number(goalTarget)}
                      unit={goalUnit}
                    />
                  </p>
                  <div className="mt-3 h-1.5 rounded-full bg-primary/10" />
                </div>
              )}
              <p className="text-xs leading-relaxed text-muted">
                {t('measure.autoHelp')}
              </p>
            </div>
          )}
          {habit && (
            <p className="mt-3 text-xs leading-relaxed text-muted">
              {t('measure.editHelp')}
            </p>
          )}
        </fieldset>

        <details className="rounded-2xl border border-muted/15 p-4">
          <summary className="min-h-11 cursor-pointer text-sm font-semibold">
            {t('ux.personalize')}
          </summary>
          <div className="mt-3 space-y-6">
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
              <legend className="mb-2 text-sm font-semibold">
                {t('form.icon')}
              </legend>
              <p className="mb-3 text-xs leading-relaxed text-muted">
                {t('form.iconHelp')}
              </p>
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface p-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-elevated">
                  <Icon name={icon} style={{ color }} className="h-6 w-6" />
                </div>
                <span className="min-w-0 break-words text-sm font-medium">
                  {name.trim() || t('form.namePlaceholder')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {habitIcons.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-label={t(`icons.${option}`)}
                    title={t(`icons.${option}`)}
                    aria-pressed={icon === option}
                    onClick={() => setChosenIcon(option)}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${icon === option ? 'border-primary bg-primary/15 text-primary' : 'border-muted/20 bg-surface text-muted hover:bg-elevated'}`}
                  >
                    <Icon name={option} />
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted">
                  {t('form.iconSuggested', {
                    icon: t(`icons.${suggestedIcon}`),
                  })}
                </span>
                {chosenIcon !== null && (
                  <button
                    type="button"
                    onClick={() => setChosenIcon(null)}
                    className="min-h-11 font-medium text-primary"
                  >
                    {t('form.useSuggestedIcon')}
                  </button>
                )}
              </div>
            </fieldset>
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
          </div>
        </details>
      </fieldset>
      {save.isError && (
        <p role="alert" className="mt-5 text-sm text-danger">
          {errorText(save.error)}
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
