import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

export default function EmptyHabitsState({
  first = true,
}: {
  first?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl border border-primary/15 bg-surface p-6">
      <h2 className="text-lg font-semibold">
        {t(first ? 'ux.firstHabitTitle' : 'ux.restDayTitle')}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {t(first ? 'ux.firstHabitHelp' : 'ux.restDayHelp')}
      </p>
      <Link
        to={first ? '/habits/new' : '/habits'}
        className="btn-primary mt-5 inline-flex items-center text-sm"
      >
        {t(first ? 'ux.firstHabitAction' : 'ux.viewHabits')}
      </Link>
      {first && (
        <div
          className="mt-4 flex flex-wrap gap-2"
          aria-label={t('ux.examples')}
        >
          {(['read', 'water', 'walk'] as const).map((template) => (
            <Link
              key={template}
              to={`/habits/new?template=${template}`}
              className="flex min-h-11 items-center rounded-xl bg-elevated px-3 text-xs text-primary"
            >
              {t(`ux.example.${template}`)}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
