import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import Icon from './ui/Icon'
import { isInitialRequest } from '../api/queryClient'

export default function NetworkActivity({ children }: { children: ReactNode }) {
  const fetching = useIsFetching({ predicate: isInitialRequest })
  const mutating = useIsMutating()
  const { t } = useTranslation()
  const busy = fetching > 0 || mutating > 0
  const status = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!busy) return
    const previousFocus = document.activeElement
    status.current?.focus({ preventScroll: true })
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true })
      }
    }
  }, [busy])

  return (
    <>
      <div inert={busy} aria-busy={busy}>
        {children}
      </div>
      {busy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 px-6 backdrop-blur-sm">
          <div
            ref={status}
            tabIndex={-1}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="loading-status flex flex-col items-center gap-5 rounded-3xl border border-muted/10 bg-surface px-12 py-10 shadow-xl"
          >
            <div
              className="relative flex h-16 w-16 items-center justify-center"
              aria-hidden="true"
            >
              <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
              <Icon name="sun" className="h-7 w-7 text-primary" />
            </div>
            <p className="text-base font-medium text-foreground">
              {t(mutating ? 'common.processing' : 'auth.loading')}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
