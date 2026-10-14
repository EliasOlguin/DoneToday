import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  getDailyMotivation,
  motivationKeys,
} from '../src/lib/dailyMotivation.ts'

test('all 70 daily messages have distinct, nonempty translations in every language', () => {
  assert.equal(motivationKeys.length, 70)
  assert.equal(new Set(motivationKeys).size, 70)
  for (const language of ['en', 'es', 'de']) {
    const catalog = JSON.parse(
      readFileSync(
        new URL(`../src/i18n/locales/${language}.json`, import.meta.url),
        'utf8',
      ),
    )
    assert.equal(
      Object.keys(catalog).filter((key) => /^motivation\.\d{2}$/.test(key))
        .length,
      70,
    )
    assert.equal(new Set(motivationKeys.map((key) => catalog[key])).size, 70)
    motivationKeys.forEach((key) =>
      assert.ok(catalog[key]?.trim(), `${language}: ${key}`),
    )
  }
})

test('the same local day keeps the message, including revisits and different UTC dates', () => {
  const before = getDailyMotivation(
    new Date('2026-10-14T22:30:00Z'),
    'America/Argentina/Buenos_Aires',
  )
  const after = getDailyMotivation(
    new Date('2026-10-15T01:30:00Z'),
    'America/Argentina/Buenos_Aires',
  )
  assert.deepEqual(before, after)
})

test('saved time zones change the message at their own midnight', () => {
  const now = new Date('2026-10-14T22:30:00Z')
  assert.notEqual(
    getDailyMotivation(now, 'Europe/Berlin').textKey,
    getDailyMotivation(now, 'America/Argentina/Buenos_Aires').textKey,
  )
  assert.notEqual(
    getDailyMotivation(new Date('2026-10-14T21:59:59Z'), 'Europe/Berlin')
      .textKey,
    getDailyMotivation(new Date('2026-10-14T22:00:00Z'), 'Europe/Berlin')
      .textKey,
  )
})

test('the rotation covers all 70 messages before repeating and supports earlier dates', () => {
  const start = Date.UTC(2026, 9, 14, 12)
  const keys = Array.from(
    { length: 70 },
    (_, i) =>
      getDailyMotivation(new Date(start + i * 86_400_000), 'UTC').textKey,
  )
  assert.equal(new Set(keys).size, 70)
  assert.equal(
    getDailyMotivation(new Date(start + 70 * 86_400_000), 'UTC').textKey,
    keys[0],
  )
  assert.ok(
    motivationKeys.includes(
      getDailyMotivation(new Date('2025-01-01T12:00:00Z'), 'UTC').textKey,
    ),
  )
})

test('daylight-saving changes keep one message for the entire local day', () => {
  for (const day of ['2026-03-29', '2026-10-25']) {
    assert.equal(
      getDailyMotivation(new Date(`${day}T01:15:00Z`), 'Europe/Berlin').textKey,
      getDailyMotivation(new Date(`${day}T02:15:00Z`), 'Europe/Berlin').textKey,
    )
  }
})

test('book excerpts retain their source, while original messages have no borrowed attribution', () => {
  const original = getDailyMotivation(new Date('2026-10-15T12:00:00Z'), 'UTC')
  assert.equal(original.source, undefined)
  const clear = getDailyMotivation(new Date('2026-10-14T12:00:00Z'), 'UTC')
  assert.equal(clear.source.labelKey, 'motivation.sourceAtomicHabits')
  assert.equal(clear.source.url, 'https://jamesclear.com/quote/atomic-habits')
  const seneca = getDailyMotivation(new Date('2026-11-13T12:00:00Z'), 'UTC')
  assert.equal(seneca.source.labelKey, 'motivation.sourceSeneca')
})

test('the ten Atomic Habits reflections are explicitly inspired rather than literal excerpts', () => {
  const start = Date.UTC(2026, 9, 14, 12)
  for (let index = 60; index < 70; index++) {
    const quote = getDailyMotivation(
      new Date(start + index * 86_400_000),
      'UTC',
    )
    assert.equal(quote.source.kind, 'inspired')
    assert.equal(quote.source.labelKey, 'motivation.inspiredAtomicHabits')
    assert.ok(quote.source.url.startsWith('https://jamesclear.com/'))
  }
})
