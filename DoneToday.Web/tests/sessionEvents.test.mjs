import { test } from 'node:test'
import assert from 'node:assert/strict'
import { QueryObserver } from '@tanstack/react-query'
import { createAppQueryClient } from '../src/api/queryClient.ts'
import { bindSessionEvents } from '../src/api/sessionEvents.ts'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

test('a second tab receives only a change signal and verifies its own session', async () => {
  const channels = new Set()
  const messages = []
  class Channel extends EventTarget {
    constructor(name) {
      super()
      this.name = name
      channels.add(this)
    }
    postMessage(data) {
      messages.push(data)
      for (const other of channels)
        if (other !== this && other.name === this.name)
          other.dispatchEvent(new MessageEvent('message', { data }))
    }
    close() {
      channels.delete(this)
    }
  }
  const first = new EventTarget()
  const second = new EventTarget()
  first.BroadcastChannel = Channel
  second.BroadcastChannel = Channel
  const firstClient = createAppQueryClient()
  const secondClient = createAppQueryClient()
  secondClient.setQueryData(['session'], null)
  let requests = 0
  const observer = new QueryObserver(secondClient, {
    queryKey: ['session'],
    queryFn: async () => {
      requests++
      return { id: 7 }
    },
  })
  const unsubscribe = observer.subscribe(() => {})
  const cleanupFirst = bindSessionEvents(firstClient, first)
  const cleanupSecond = bindSessionEvents(secondClient, second)
  try {
    first.dispatchEvent(new Event('session-updated'))
    await tick()
    assert.deepEqual(messages, [{ type: 'session-changed' }])
    assert.equal(requests, 1)
    assert.deepEqual(observer.getCurrentResult().data, { id: 7 })
  } finally {
    cleanupFirst()
    cleanupSecond()
    unsubscribe()
    firstClient.clear()
    secondClient.clear()
  }
  assert.equal(channels.size, 0)
})

test('returning to a window detects another window signing in despite fresh anonymous cache', async () => {
  const client = createAppQueryClient()
  const target = new EventTarget()
  client.setQueryData(['session'], null)
  client.setQueryData(['today'], ['cached habit'])
  let calls = 0
  const observer = new QueryObserver(client, {
    queryKey: ['session'],
    queryFn: async () => {
      calls++
      return { id: 5, email: 'test@example.test' }
    },
  })
  const unsubscribe = observer.subscribe(() => {})
  const cleanup = bindSessionEvents(client, target)
  try {
    target.dispatchEvent(new Event('focus'))
    await tick()
    assert.equal(calls, 1)
    assert.equal(observer.getCurrentResult().data.id, 5)
    assert.equal(client.isFetching(), 0)
    assert.deepEqual(client.getQueryData(['today']), ['cached habit'])
  } finally {
    cleanup()
    unsubscribe()
    client.clear()
  }
})

test('returning to a window detects another window signing out', async () => {
  const client = createAppQueryClient()
  client.setQueryData(['session'], { id: 5, email: 'test@example.test' })
  const target = new EventTarget()
  const observer = new QueryObserver(client, {
    queryKey: ['session'],
    queryFn: async () => null,
  })
  const unsubscribe = observer.subscribe(() => {})
  const cleanup = bindSessionEvents(client, target)
  try {
    target.dispatchEvent(new Event('focus'))
    await tick()
    assert.equal(observer.getCurrentResult().data, null)
  } finally {
    cleanup()
    unsubscribe()
    client.clear()
  }
})

test('browser Back restoring a cached page revalidates the session', async () => {
  const client = createAppQueryClient()
  client.setQueryData(['session'], null)
  let calls = 0
  const target = new EventTarget()
  const observer = new QueryObserver(client, {
    queryKey: ['session'],
    queryFn: async () => ++calls,
  })
  const unsubscribe = observer.subscribe(() => {})
  const cleanup = bindSessionEvents(client, target)
  try {
    const initial = new Event('pageshow')
    initial.persisted = false
    target.dispatchEvent(initial)
    await tick()
    assert.equal(calls, 0)
    const restored = new Event('pageshow')
    restored.persisted = true
    target.dispatchEvent(restored)
    await tick()
    assert.equal(calls, 1)
  } finally {
    cleanup()
    unsubscribe()
    client.clear()
  }
})

test('changing accounts clears private cached data on every screen', () => {
  const client = createAppQueryClient()
  const target = new EventTarget()
  client.setQueryData(['session'], { id: 5 })
  client.setQueryData(['today'], ['old user habits'])
  client.setQueryData(['progress', 'week'], { completed: 3 })
  const cleanup = bindSessionEvents(client, target)
  try {
    target.dispatchEvent(new Event('account-changed'))
    assert.equal(client.getQueryData(['today']), undefined)
    assert.equal(client.getQueryData(['progress', 'week']), undefined)
    assert.deepEqual(client.getQueryData(['session']), { id: 5 })
  } finally {
    cleanup()
    client.clear()
  }
})

test('session expiry removes private data and marks the session anonymous', async () => {
  const client = createAppQueryClient()
  const target = new EventTarget()
  client.setQueryData(['session'], { id: 5 })
  client.setQueryData(['today'], ['old habits'])
  const cleanup = bindSessionEvents(client, target)
  try {
    target.dispatchEvent(new Event('session-expired'))
    await tick()
    assert.equal(client.getQueryData(['session']), null)
    assert.equal(client.getQueryData(['today']), undefined)
  } finally {
    cleanup()
    client.clear()
  }
})

test('repeated focus events do not cancel or duplicate a pending session request', async () => {
  const client = createAppQueryClient()
  const target = new EventTarget()
  client.setQueryData(['session'], null)
  let calls = 0
  let finish
  const observer = new QueryObserver(client, {
    queryKey: ['session'],
    queryFn: () => {
      calls++
      return new Promise((resolve) => {
        finish = resolve
      })
    },
  })
  const unsubscribe = observer.subscribe(() => {})
  const cleanup = bindSessionEvents(client, target)
  try {
    target.dispatchEvent(new Event('focus'))
    target.dispatchEvent(new Event('focus'))
    assert.equal(calls, 1)
    finish(null)
    await tick()
    cleanup()
    target.dispatchEvent(new Event('focus'))
    await tick()
    assert.equal(calls, 1)
  } finally {
    finish?.(null)
    cleanup()
    unsubscribe()
    client.clear()
  }
})
