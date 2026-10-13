import { test } from 'node:test'
import assert from 'node:assert/strict'
import { focusManager, QueryObserver } from '@tanstack/react-query'
import {
  createAppQueryClient,
  isInitialRequest,
} from '../src/api/queryClient.ts'

test('returning to a tab reuses fresh data without another request', async () => {
  const client = createAppQueryClient()
  let calls = 0
  const observer = new QueryObserver(client, {
    queryKey: ['today'],
    queryFn: async () => ++calls,
  })
  client.mount()
  const unsubscribe = observer.subscribe(() => {})
  try {
    await observer.refetch()
    focusManager.setFocused(false)
    focusManager.setFocused(true)
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(calls, 1)
    assert.equal(observer.getCurrentResult().data, 1)
  } finally {
    unsubscribe()
    client.unmount()
    client.clear()
    focusManager.setFocused(undefined)
  }
})

test('stale data refreshes on return without activating blocking loading', async () => {
  const client = createAppQueryClient()
  let finish
  let calls = 0
  const queryFn = () => {
    calls++
    return new Promise((resolve) => {
      finish = resolve
    })
  }
  client.setQueryData(['today'], ['existing habit'])
  const observer = new QueryObserver(client, {
    queryKey: ['today'],
    queryFn,
    staleTime: 0,
    refetchOnMount: false,
  })
  client.mount()
  const unsubscribe = observer.subscribe(() => {})
  try {
    focusManager.setFocused(false)
    focusManager.setFocused(true)
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(calls, 1)
    assert.equal(client.isFetching(), 1)
    assert.equal(client.isFetching({ predicate: isInitialRequest }), 0)
    assert.deepEqual(observer.getCurrentResult().data, ['existing habit'])
    finish(['updated habit'])
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.deepEqual(observer.getCurrentResult().data, ['updated habit'])
  } finally {
    finish?.([])
    unsubscribe()
    client.unmount()
    client.clear()
    focusManager.setFocused(undefined)
  }
})

test('invalidation after saving refreshes data even within the freshness window', async () => {
  const client = createAppQueryClient()
  let calls = 0
  const observer = new QueryObserver(client, {
    queryKey: ['today'],
    queryFn: async () => ++calls,
  })
  const unsubscribe = observer.subscribe(() => {})
  try {
    await observer.refetch()
    await client.invalidateQueries({ queryKey: ['today'] })
    assert.equal(calls, 2)
    assert.equal(observer.getCurrentResult().data, 2)
  } finally {
    unsubscribe()
    client.clear()
  }
})

test('the first request activates blocking loading until data arrives', async () => {
  const client = createAppQueryClient()
  let finish
  const request = client.fetchQuery({
    queryKey: ['today'],
    queryFn: () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  })
  try {
    assert.equal(client.isFetching({ predicate: isInitialRequest }), 1)
    finish([])
    await request
    assert.equal(client.isFetching({ predicate: isInitialRequest }), 0)
  } finally {
    finish?.([])
    client.clear()
  }
})
