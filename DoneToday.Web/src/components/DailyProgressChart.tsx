import { useTranslation } from 'react-i18next'
import type { WeeklyProgress } from '../types/WeeklyProgress'
import { formatDate } from '../lib/format'

export default function DailyProgressChart({
  progress,
}: {
  progress: WeeklyProgress
}) {
  const { t, i18n } = useTranslation()
  return (
    <div className="mt-6 grid grid-cols-7 items-end gap-2">
      {progress.days.map((day) => {
        const future = day.date > progress.endDate
        const rate = day.scheduled
          ? Math.min(100, Math.max(0, (day.completed / day.scheduled) * 100))
          : 0
        const label = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
          weekday: 'short',
          timeZone: 'UTC',
        }).format(new Date(`${day.date}T12:00:00Z`))
        return (
          <div key={day.date} className="text-center">
            <div
              className="relative mx-auto h-28 w-full max-w-7 overflow-hidden rounded-t-lg bg-elevated"
              aria-hidden="true"
            >
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-lg bg-success transition-all"
                style={{ height: `${rate}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted">{label}</p>
            <p className="mt-1 text-[10px] text-muted">
              {future ? '—' : `${day.completed}/${day.scheduled}`}
            </p>
            <span className="sr-only">
              {formatDate(day.date)}:{' '}
              {future
                ? t('stats.upcoming')
                : t('stats.daySummary', {
                    completed: day.completed,
                    total: day.scheduled,
                  })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
