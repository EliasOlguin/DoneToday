import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bindUpdateChecks } from '../src/lib/updateCheck.ts'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
function surface(fetcher) {
  const target = new EventTarget()
  target.document = new EventTarget()
  target.document.visibilityState = 'visible'
  target.navigator = { onLine: true }
  target.fetch = fetcher
  target.setInterval = (callback) => {
    target.interval = callback
    return 1
  }
  target.clearInterval = () => {
    target.interval = null
  }
  target.setTimeout = () => 2
  target.clearTimeout = () => {}
  return target
}
test('detects a changed release with an uncached request, without reloading', async () => {
  const calls = []
  const updates = []
  const target = surface(async (url, options) => {
    calls.push({ url, options })
    return { ok: true, json: async () => ({ version: '1.0.2' }) }
  })
  const stop = bindUpdateChecks(target, '1.0.1', (version) =>
    updates.push(version),
  )
  await tick()
  assert.deepEqual(updates, ['1.0.2'])
  assert.equal(calls[0].url, '/api/version')
  assert.equal(calls[0].options.cache, 'no-store')
  target.dispatchEvent(new Event('focus'))
  await tick()
  assert.equal(calls.length, 1)
  stop()
  assert.equal(target.interval, null)
})
test('same version, old endpoints, malformed responses and network errors remain silent', async () => {
  for (const fetcher of [
    async () => ({ ok: true, json: async () => ({ version: '1.0.1' }) }),
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => ({ version: '<script>' }) }),
    async () => {
      throw new Error('offline')
    },
  ]) {
    const updates = []
    const target = surface(fetcher)
    const stop = bindUpdateChecks(target, '1.0.1', (version) =>
      updates.push(version),
    )
    await tick()
    assert.deepEqual(updates, [])
    stop()
  }
})
test('does not poll in hidden tabs, checks on return and removes listeners on cleanup', async () => {
  let calls = 0
  const target = surface(async () => {
    calls++
    return { ok: false }
  })
  target.document.visibilityState = 'hidden'
  const stop = bindUpdateChecks(target, '1.0.1', () => {})
  target.interval()
  target.dispatchEvent(new Event('focus'))
  await tick()
  assert.equal(calls, 0)
  target.document.visibilityState = 'visible'
  target.document.dispatchEvent(new Event('visibilitychange'))
  await tick()
  assert.equal(calls, 1)
  stop()
  target.dispatchEvent(new Event('focus'))
  await tick()
  assert.equal(calls, 1)
})
test('aborts a pending request and cannot notify after unmount', async () => {
  let finish
  let signal
  const updates = []
  const target = surface((_, options) => {
    signal = options.signal
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  const stop = bindUpdateChecks(target, '1.0.1', (version) =>
    updates.push(version),
  )
  stop()
  assert.equal(signal.aborted, true)
  finish({ ok: true, json: async () => ({ version: '1.0.2' }) })
  await tick()
  assert.deepEqual(updates, [])
})
