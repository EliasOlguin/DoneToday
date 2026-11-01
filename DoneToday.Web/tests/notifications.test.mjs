import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

test('push worker displays a notification and never opens an external destination', async () => {
  const listeners = new Map()
  const shown = []
  const opened = []
  const self = {
    addEventListener: (name, handler) => listeners.set(name, handler),
    location: { origin: 'https://donetoday.example' },
    registration: { showNotification: async (...args) => shown.push(args) },
    clients: {
      matchAll: async () => [],
      openWindow: async (url) => opened.push(url),
    },
  }
  vm.runInNewContext(
    readFileSync(new URL('../public/push-worker.js', import.meta.url), 'utf8'),
    { self, URL },
  )
  let pending
  listeners.get('push')({
    data: {
      json: () => ({
        title: 'DoneToday',
        body: '3 hábitos',
        url: 'https://evil.example',
        tag: 'morning',
      }),
    },
    waitUntil: (p) => (pending = p),
  })
  await pending
  assert.equal(shown[0][1].body, '3 hábitos')
  assert.equal(shown[0][1].data.url, '/today')
  listeners.get('notificationclick')({
    notification: { data: { url: 'https://evil.example' }, close() {} },
    waitUntil: (p) => (pending = p),
  })
  await pending
  assert.equal(opened[0], 'https://donetoday.example/today')
})
