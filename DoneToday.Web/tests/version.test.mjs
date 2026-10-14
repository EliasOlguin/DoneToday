import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('frontend and lockfile match the release source used by frontend and .NET', () => {
  const version = readFileSync(
    new URL('../../VERSION', import.meta.url),
    'utf8',
  ).trim()
  assert.match(version, /^\d+\.\d+\.\d+$/)
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url)),
  )
  const lock = JSON.parse(
    readFileSync(new URL('../package-lock.json', import.meta.url)),
  )
  assert.equal(pkg.version, version)
  assert.equal(lock.version, version)
  assert.equal(lock.packages[''].version, version)
})
