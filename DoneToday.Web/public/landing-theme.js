// Runs before the stylesheet to apply the saved app theme without a light flash.
;(() => {
  const key = 'donetoday-theme'
  const root = document.documentElement
  const system = window.matchMedia('(prefers-color-scheme: dark)')
  let saved = null
  try {
    saved = localStorage.getItem(key)
  } catch {
    /* Storage is optional. */
  }
  let explicit = saved === 'dark' || saved === 'light'

  function apply(theme) {
    root.dataset.theme = theme
    const dark = theme === 'dark'
    const button = document.querySelector('[data-theme-toggle]')
    if (button) {
      button.hidden = false
      button.setAttribute('aria-pressed', String(dark))
      button.title = dark ? button.dataset.lightLabel : button.dataset.darkLabel
    }
    document.querySelectorAll('[data-dark-preview]').forEach((source) => {
      source.media = dark ? 'all' : 'not all'
      source.closest('a').href = dark
        ? source.srcset
        : source.nextElementSibling.src
    })
    const color = document.querySelector('meta[name="theme-color"]')
    if (color) color.content = dark ? '#111318' : '#f7f7fc'
  }

  apply(explicit ? saved : system.matches ? 'dark' : 'light')
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme)
    // Carry the resolved system theme into the app, which reads this same key.
    document.querySelectorAll('a[href^="/login"]').forEach((link) => {
      link.addEventListener('click', () => {
        try {
          localStorage.setItem(key, root.dataset.theme)
        } catch {
          /* Navigation still works without storage. */
        }
      })
    })
    document
      .querySelector('[data-theme-toggle]')
      ?.addEventListener('click', () => {
        const theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
        explicit = true
        try {
          localStorage.setItem(key, theme)
        } catch {
          /* The button still works. */
        }
        apply(theme)
      })
  })
  system.addEventListener('change', () => {
    if (!explicit) apply(system.matches ? 'dark' : 'light')
  })
  window.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return
    explicit = event.newValue === 'dark' || event.newValue === 'light'
    apply(explicit ? event.newValue : system.matches ? 'dark' : 'light')
  })
})()
