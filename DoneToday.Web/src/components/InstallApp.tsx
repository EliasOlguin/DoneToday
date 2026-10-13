import { useEffect, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { installStore } from '../lib/installStore'
import Logo from './Logo'

export default function InstallApp({
  suggestion = false,
}: {
  suggestion?: boolean
}) {
  const { t } = useTranslation()
  const state = useSyncExternalStore(
    installStore.subscribe,
    installStore.getSnapshot,
  )
  const [visible, setVisible] = useState(false)
  const [instructions, setInstructions] = useState(false)
  useEffect(() => {
    if (!suggestion || state.installed || !state.suggestionAllowed) return
    const timer = window.setTimeout(() => setVisible(true), 15_000)
    return () => window.clearTimeout(timer)
  }, [suggestion, state.installed, state.suggestionAllowed])

  if (suggestion && (!visible || state.installed || !state.suggestionAllowed))
    return null
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return (
    <section
      aria-label={t('install.title')}
      aria-live={suggestion ? 'polite' : undefined}
      className={
        suggestion
          ? 'fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-20 mx-auto max-h-[calc(100dvh-8rem)] max-w-sm overflow-y-auto rounded-2xl border border-primary/20 bg-surface p-5 shadow-xl lg:inset-x-auto lg:right-6 lg:bottom-6'
          : 'panel mt-4'
      }
    >
      <div className="flex items-center gap-3">
        <Logo className="h-11 w-11" />
        <div>
          <h2 className="font-semibold">{t('install.title')}</h2>
          <p className="mt-1 text-xs text-muted">{t('install.description')}</p>
        </div>
      </div>
      {state.installed ? (
        <p role="status" className="mt-4 text-sm text-success">
          {t('install.installed')}
        </p>
      ) : (
        <>
          {(instructions || state.error) && (
            <p
              className="mt-4 text-sm leading-relaxed text-muted"
              role={state.error ? 'alert' : undefined}
            >
              {t(ios ? 'install.iosHelp' : 'install.browserHelp')}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={state.pending}
              aria-busy={state.pending}
              onClick={() =>
                state.prompt
                  ? void installStore.install()
                  : setInstructions(true)
              }
            >
              {t(
                state.pending
                  ? 'common.processing'
                  : state.prompt
                    ? 'install.action'
                    : 'install.instructions',
              )}
            </button>
            {suggestion && (
              <button
                type="button"
                className="min-h-11 px-2 text-sm text-muted hover:text-foreground"
                disabled={state.pending}
                onClick={installStore.dismiss}
              >
                {t('install.later')}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
