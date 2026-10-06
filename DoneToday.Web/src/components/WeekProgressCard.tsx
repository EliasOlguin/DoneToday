import { useQuery } from '@tanstack/react-query'

import { getWeeklyProgress } from '../api/progress'

export default function WeekProgressCard() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['progress', 'week'],
    queryFn: getWeeklyProgress,
  })
  const rate = Math.min(100, Math.max(0, data?.completionRate ?? 0))
  return (
    <section
      aria-label="Weekly progress"
      className="flex items-center gap-4 rounded-2xl border border-muted/10 bg-surface p-5"
    >
      <div className="relative h-12 w-12 shrink-0" aria-hidden="true">
        <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="19"
            fill="none"
            stroke="var(--color-elevated)"
            strokeWidth="5"
          />
          <circle
            cx="24"
            cy="24"
            r="19"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="5"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${rate} 100`}
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold">This week</h2>
        <p
          className="mt-1 text-xs text-muted"
          role={isError ? 'alert' : undefined}
        >
          {isPending
            ? 'Loading progress...'
            : isError
              ? 'Progress unavailable.'
              : `${data.completed} of ${data.scheduled} completed`}
        </p>
      </div>
      {data && (
        <span className="text-lg font-semibold text-primary">
          {Math.round(rate)}%
        </span>
      )}
    </section>
  )
}
