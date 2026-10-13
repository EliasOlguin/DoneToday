import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createInstallStore } from '../src/lib/install.ts'

function browser(storage = new Map(), standalone = false) {
  const target = new EventTarget()
  const media = new EventTarget()
  media.matches = standalone
  target.matchMedia = () => media
  target.navigator = {}
  target.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  }
  return target
}

test('captures the browser prompt without installing until explicitly requested', async () => {
  const target = browser()
  const store = createInstallStore(target)
  let calls = 0
  let finish
  const event = new Event('beforeinstallprompt', { cancelable: true })
  event.prompt = async () => {
    calls++
  }
  event.userChoice = new Promise((resolve) => {
    finish = resolve
  })
  target.dispatchEvent(event)
  assert.equal(event.defaultPrevented, true)
  assert.equal(calls, 0)
  assert.equal(store.getSnapshot().prompt, event)
  const request = store.install()
  await store.install()
  assert.equal(calls, 1)
  finish({ outcome: 'accepted' })
  await request
  assert.equal(store.getSnapshot().installed, true)
  assert.equal(store.getSnapshot().pending, false)
  store.destroy()
})

test('postponing survives another visit and suppresses promotion for seven days', () => {
  const storage = new Map()
  const store = createInstallStore(browser(storage))
  const before = Date.now()
  store.dismiss()
  const until = store.getSnapshot().dismissedUntil
  assert.ok(until >= before + 7 * 24 * 60 * 60 * 1000)
  store.destroy()
  const revisit = createInstallStore(browser(storage))
  assert.equal(revisit.getSnapshot().dismissedUntil, until)
  revisit.destroy()
})

test('native dismissal consumes the prompt and postpones another suggestion', async () => {
  const target = browser()
  const store = createInstallStore(target)
  const event = new Event('beforeinstallprompt', { cancelable: true })
  event.prompt = async () => {}
  event.userChoice = Promise.resolve({ outcome: 'dismissed' })
  target.dispatchEvent(event)
  await store.install()
  assert.equal(store.getSnapshot().installed, false)
  assert.equal(store.getSnapshot().prompt, null)
  assert.ok(store.getSnapshot().dismissedUntil > Date.now())
  store.destroy()
})

test('installed and standalone apps suppress promotion; uninstall allows a new prompt', () => {
  const storage = new Map()
  const target = browser(storage)
  const store = createInstallStore(target)
  target.dispatchEvent(new Event('appinstalled'))
  store.destroy()
  const revisitTarget = browser(storage)
  const revisit = createInstallStore(revisitTarget)
  assert.equal(revisit.getSnapshot().installed, true)
  revisitTarget.dispatchEvent(
    new Event('beforeinstallprompt', { cancelable: true }),
  )
  assert.equal(revisit.getSnapshot().installed, false)
  revisit.destroy()
  const standaloneStore = createInstallStore(browser(new Map(), true))
  assert.equal(standaloneStore.getSnapshot().installed, true)
  standaloneStore.destroy()
})

test('failed native installation leaves instructions available rather than a stuck button', async () => {
  const target = browser()
  const store = createInstallStore(target)
  const event = new Event('beforeinstallprompt', { cancelable: true })
  event.prompt = async () => {
    throw new Error('unsupported')
  }
  target.dispatchEvent(event)
  await store.install()
  assert.equal(store.getSnapshot().pending, false)
  assert.equal(store.getSnapshot().error, true)
  assert.equal(store.getSnapshot().prompt, null)
  store.destroy()
})

test('manifest icons exist as PNGs with their declared installation dimensions', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../public/manifest.json', import.meta.url)),
  )
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.start_url, '/')
  for (const icon of manifest.icons) {
    const png = readFileSync(new URL('../public' + icon.src, import.meta.url))
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes)
  }
})
