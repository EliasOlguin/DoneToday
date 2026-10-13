import { createInstallStore } from './install'

// Capture the browser event before the user reaches a particular screen.
export const installStore = createInstallStore(window)
if (import.meta.hot) import.meta.hot.dispose(() => installStore.destroy())
