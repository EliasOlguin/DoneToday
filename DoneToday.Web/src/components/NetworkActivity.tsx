import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export default function NetworkActivity() {
  const fetching = useIsFetching()
  const mutating = useIsMutating()
  const { t } = useTranslation()

  if (!fetching && !mutating) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="h-1 overflow-hidden bg-primary/20" aria-hidden="true">
        <div className="network-progress h-full w-1/3 bg-primary" />
      </div>
      <p
        role="status"
        className="mx-auto mt-2 w-fit rounded-full border border-primary/20 bg-surface px-4 py-2 text-xs font-medium text-foreground shadow-lg"
      >
        {t(mutating ? 'common.processing' : 'auth.loading')}
      </p>
    </div>
  )
}
