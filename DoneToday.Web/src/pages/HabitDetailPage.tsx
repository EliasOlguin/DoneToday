import { resolveHabitIcon } from '../lib/habitIcons'
import { errorText } from '../api/errors'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { useState } from 'react'
import { archiveHabit, getHabitDetail } from '../api/habits'
import { formatDate, formatSchedule } from '../lib/format'
import Icon from '../components/ui/Icon'

export default function HabitDetailPage() {
  const { t } = useTranslation()
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
        {t('errors.habitMissing')}
      </p>
    )
  if (habit.isPending)
    return (
      <p role="status" className="text-muted">
        {t('detail.loading')}
      </p>
    )
  if (habit.isError)
    return (
      <div>
        <p role="alert" className="text-danger">
          {errorText(habit.error)}
        </p>
        <Link to="/habits" className="mt-4 inline-block text-primary">
          {t('common.backHabits')}
        </Link>
      </div>
    )
  const data = habit.data
  return (
    <section aria-labelledby="detail-title">
      <div className="flex items-center justify-between">
        <Link
          to="/habits"
          aria-label={t('common.backHabits')}
          className="flex h-11 w-11 items-center justify-center"
        >
          <Icon name="arrow" className="h-5 w-5 rotate-180" />
        </Link>
        <Link
          to={`/habits/${habitId}/edit`}
          className="flex min-h-11 items-center px-3 text-sm font-medium text-primary"
        >
          {t('common.edit')}
        </Link>
      </div>
      <div className="mb-7 mt-3 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-elevated">
          <Icon
            name={resolveHabitIcon(data.icon)}
            className="h-10 w-10"
            style={{ color: data.color ?? 'var(--color-primary)' }}
          />
        </div>
        <h1 id="detail-title" className="page-title mt-4 break-words">
          {data.name}
        </h1>
        <p className="mt-2 break-words text-sm text-muted">
          {data.description || t('detail.tagline')}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="panel flex items-center gap-3">
          <Icon name="flame" className="h-6 w-6 shrink-0 text-warning" />
          <div>
            <p className="text-xs text-muted">{t('common.currentStreak')}</p>
            <p className="mt-1 text-2xl font-bold">{data.currentStreak}</p>
          </div>
        </div>
        <div className="panel flex items-center gap-3">
          <Icon name="trophy" className="h-6 w-6 shrink-0 text-warning" />
          <div>
            <p className="text-xs text-muted">{t('common.bestStreak')}</p>
            <p className="mt-1 text-2xl font-bold">{data.bestStreak}</p>
          </div>
        </div>
      </div>
      <div className="panel mt-3">
        <h2 className="text-sm font-semibold">{t('common.schedule')}</h2>
        <p className="mt-2 text-sm text-muted">
          {formatSchedule(data.daysOfWeek)}
        </p>
        {data.scheduleEffectiveFrom && (
          <p className="mt-2 text-xs text-muted">
            {t('detail.effective', {
              date: formatDate(data.scheduleEffectiveFrom),
            })}
          </p>
        )}
      </div>
      <div className="panel mt-3">
        <h2 className="text-sm font-semibold">
          {t('detail.completions')}{' '}
          <span className="ml-2 text-muted">{data.completionDates.length}</span>
        </h2>
        {data.completionDates.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t('detail.empty')}</p>
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
        <span>{t('common.statistics')}</span>
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
            {t('detail.archive')}
          </button>
        ) : (
          <div>
            <p className="text-sm">{t('detail.confirm')}</p>
            <p className="mt-2 text-xs text-muted">{t('detail.archiveHelp')}</p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                aria-busy={archive.isPending}
                disabled={archive.isPending}
                onClick={() => archive.mutate()}
                className="min-h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-background disabled:opacity-50"
              >
                {archive.isPending
                  ? t('detail.archiving')
                  : t('detail.archiveAction')}
              </button>
              <button
                type="button"
                disabled={archive.isPending}
                onClick={() => setConfirmArchive(false)}
                className="min-h-11 px-3 text-sm text-muted"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
        {archive.isError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {errorText(archive.error)}
          </p>
        )}
      </div>
    </section>
  )
}
