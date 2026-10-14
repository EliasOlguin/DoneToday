import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  completedDayTransition,
  celebrationKey,
  claimCelebration,
} from '../src/lib/dailyCelebration.ts'
const pending = [
  { id: 1, isCompleted: true },
  { id: 2, isCompleted: false },
]
const done = pending.map((habit) => ({ ...habit, isCompleted: true }))
test('celebrates the last completion, including quantity-based habits', () => {
  assert.equal(completedDayTransition(pending, done), true)
  assert.equal(completedDayTransition(pending, pending), false)
})
test('does not celebrate initial loads, refetches, empty days or removed habits', () => {
  assert.equal(completedDayTransition(undefined, done), false)
  assert.equal(completedDayTransition(done, done), false)
  assert.equal(completedDayTransition([], []), false)
  assert.equal(completedDayTransition(pending, [done[0]]), false)
  assert.equal(
    completedDayTransition(pending, [{ id: 3, isCompleted: true }, done[0]]),
    false,
  )
})
test('daily celebration persistence is isolated per account and local calendar day', () => {
  assert.notEqual(
    celebrationKey(1, '2026-10-14'),
    celebrationKey(2, '2026-10-14'),
  )
  assert.notEqual(
    celebrationKey(1, '2026-10-14'),
    celebrationKey(1, '2026-10-15'),
  )
})

test('claims only once, respects saved celebrations and survives unavailable storage', () => {
  const saved = new Map([['already-seen', '1']])
  const storage = {
    getItem: (key) => saved.get(key),
    setItem: (key, value) => saved.set(key, value),
  }
  assert.equal(claimCelebration('already-seen', storage), false)
  assert.equal(claimCelebration('new-day', storage), true)
  assert.equal(saved.get('new-day'), '1')
  assert.equal(claimCelebration('new-day', storage), false)
  const blocked = {
    getItem() {
      throw new Error('Blocked')
    },
    setItem() {
      throw new Error('Blocked')
    },
  }
  assert.equal(claimCelebration('blocked-day', blocked), true)
  assert.equal(claimCelebration('blocked-day', blocked), false)
})
