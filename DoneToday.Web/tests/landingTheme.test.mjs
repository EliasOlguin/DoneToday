import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'

const script = readFileSync(
  new URL('../public/landing-theme.js', import.meta.url),
  'utf8',
)
const html =
  '<meta name="theme-color"><button data-theme-toggle data-dark-label="Modo oscuro" data-light-label="Modo claro" aria-pressed="false" hidden></button><a><picture><source data-dark-preview srcset="/dark.webp"><img src="/light.webp"></picture></a><a href="/login?lng=es">Entrar</a>'

async function setup({ saved, dark = false, blocked = false } = {}) {
  const dom = new JSDOM(html, {
    url: 'https://donetoday.example/es/',
    runScripts: 'outside-only',
  })
  const { window } = dom
  const system = new window.EventTarget()
  system.matches = dark
  window.matchMedia = () => system
  if (saved) window.localStorage.setItem('donetoday-theme', saved)
  if (blocked)
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage blocked')
      },
    })
  const ready = new Promise((resolve) =>
    window.document.addEventListener('DOMContentLoaded', resolve, {
      once: true,
    }),
  )
  window.eval(script)
  const firstTheme = window.document.documentElement.dataset.theme
  await ready
  return {
    window,
    system,
    firstTheme,
    button: window.document.querySelector('button'),
    document: window.document,
  }
}

test('applies the saved app theme immediately, and toggles the screenshot and persisted preference', async () => {
  const { window, firstTheme, button, document } = await setup({
    saved: 'dark',
  })
  assert.equal(firstTheme, 'dark')
  assert.equal(button.hidden, false)
  assert.equal(button.getAttribute('aria-pressed'), 'true')
  assert.equal(document.querySelector('source').media, 'all')
  assert.equal(document.querySelector('a').pathname, '/dark.webp')
  button.click()
  assert.equal(document.documentElement.dataset.theme, 'light')
  assert.equal(window.localStorage.getItem('donetoday-theme'), 'light')
  assert.equal(document.querySelector('source').media, 'not all')
  assert.equal(document.querySelector('a').pathname, '/light.webp')
  assert.equal(button.getAttribute('aria-pressed'), 'false')
  window.close()
})

test('follows the system until a visitor chooses a theme, and syncs choices from another tab', async () => {
  const { window, system, document, button } = await setup({ dark: true })
  assert.equal(document.documentElement.dataset.theme, 'dark')
  system.matches = false
  system.dispatchEvent(new window.Event('change'))
  assert.equal(document.documentElement.dataset.theme, 'light')
  button.click()
  system.dispatchEvent(new window.Event('change'))
  assert.equal(document.documentElement.dataset.theme, 'dark')
  window.dispatchEvent(
    new window.StorageEvent('storage', {
      key: 'donetoday-theme',
      newValue: 'light',
    }),
  )
  assert.equal(document.documentElement.dataset.theme, 'light')
  window.close()
})

test('the theme button remains usable when browser storage is unavailable', async () => {
  const { window, firstTheme, button, document } = await setup({
    dark: true,
    blocked: true,
  })
  assert.equal(firstTheme, 'dark')
  button.click()
  assert.equal(document.documentElement.dataset.theme, 'light')
  assert.equal(document.querySelector('meta').content, '#f7f7fc')
  window.close()
})

test('opening the app carries the resolved system theme into its shared preference', async () => {
  const { window, document } = await setup({ dark: true })
  assert.equal(window.localStorage.getItem('donetoday-theme'), null)
  const login = document.querySelector('a[href^="/login"]')
  login.addEventListener('click', (event) => event.preventDefault())
  login.click()
  assert.equal(window.localStorage.getItem('donetoday-theme'), 'dark')
  window.close()
})
