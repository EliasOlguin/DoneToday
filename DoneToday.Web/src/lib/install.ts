export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const dismissalKey = 'donetoday-install-dismissed-until'
const installedKey = 'donetoday-app-installed'
const sevenDays = 7 * 24 * 60 * 60 * 1000

export function createInstallStore(target: Window) {
  const standalone = target.matchMedia('(display-mode: standalone)')
  let dismissedUntil = 0
  let previouslyInstalled = false
  try {
    const saved = Number(target.localStorage.getItem(dismissalKey))
    dismissedUntil = Number.isFinite(saved) ? saved : 0
    previouslyInstalled = target.localStorage.getItem(installedKey) === 'true'
  } catch {
    /* Installation still works without local storage. */
  }
  let state = {
    prompt: null as InstallPromptEvent | null,
    installed:
      previouslyInstalled ||
      standalone.matches ||
      Boolean(
        (target.navigator as Navigator & { standalone?: boolean }).standalone,
      ),
    dismissedUntil,
    suggestionAllowed: dismissedUntil <= Date.now(),
    pending: false,
    error: false,
  }
  const listeners = new Set<() => void>()
  function update(change: Partial<typeof state>) {
    const next = { ...state, ...change }
    state = { ...next, suggestionAllowed: next.dismissedUntil <= Date.now() }
    listeners.forEach((listener) => listener())
  }
  function dismiss() {
    const until = Date.now() + sevenDays
    try {
      target.localStorage.setItem(dismissalKey, String(until))
    } catch {
      /* Keep dismissal for this visit. */
    }
    update({ dismissedUntil: until })
  }
  const beforeInstall = (event: Event) => {
    event.preventDefault()
    // A new prompt means the browser can install it again (e.g. after uninstalling).
    try {
      target.localStorage.removeItem(installedKey)
    } catch {
      /* Update in memory. */
    }
    update({
      prompt: event as InstallPromptEvent,
      error: false,
      installed: false,
    })
  }
  const installed = () => {
    try {
      target.localStorage.setItem(installedKey, 'true')
    } catch {
      /* Update in memory. */
    }
    update({ installed: true, prompt: null, pending: false })
  }
  const displayChanged = () => {
    if (standalone.matches) installed()
  }
  target.addEventListener('beforeinstallprompt', beforeInstall)
  target.addEventListener('appinstalled', installed)
  standalone.addEventListener('change', displayChanged)
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dismiss,
    async install() {
      const event = state.prompt
      if (!event || state.pending || state.installed) return
      update({ pending: true, error: false, prompt: null })
      try {
        await event.prompt()
        const { outcome } = await event.userChoice
        if (outcome === 'accepted') installed()
        else dismiss()
      } catch {
        update({ error: true })
      } finally {
        update({ pending: false })
      }
    },
    destroy() {
      target.removeEventListener('beforeinstallprompt', beforeInstall)
      target.removeEventListener('appinstalled', installed)
      standalone.removeEventListener('change', displayChanged)
      listeners.clear()
    },
  }
}
