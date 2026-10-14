import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  validMeasurement,
  quickAmounts,
  measurementNumber,
} from '../src/lib/measurements.ts'

test('measurement validation matches whole and fractional units', () => {
  assert.equal(validMeasurement(1.5, 'l'), true)
  assert.equal(validMeasurement(0.001, 'km'), true)
  assert.equal(validMeasurement(1.5, 'pages'), false)
  assert.equal(validMeasurement(0, 'l'), false)
  assert.equal(validMeasurement(0, 'l', true), true)
  for (const value of [NaN, Infinity, -1, 0.0001, 1_000_001])
    assert.equal(validMeasurement(value, 'l'), false)
})
test('quick additions stay appropriate for small targets and integer units', () => {
  assert.deepEqual(quickAmounts('l', 2), [0.25, 0.5])
  assert.deepEqual(quickAmounts('pages', 1), [1])
  assert.deepEqual(quickAmounts('km', 0.1), [0.1])
  assert.deepEqual(quickAmounts('sessions', 1), [1])
})
test('quantities keep decimals and use the selected language', () => {
  assert.equal(measurementNumber(1.25, 'en'), '1.25')
  assert.equal(measurementNumber(1.25, 'de'), '1,25')
  assert.equal(measurementNumber(0.001, 'es'), '0,001')
})
