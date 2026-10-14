import type { GoalUnit } from '../types/HabitProgress'

export function wholeUnit(unit: GoalUnit) {
  return ['pages', 'chapters', 'repetitions', 'sessions'].includes(unit)
}
export function validMeasurement(
  value: number,
  unit: GoalUnit,
  allowZero = false,
) {
  return (
    Number.isFinite(value) &&
    value >= (allowZero ? 0 : 0.001) &&
    value <= 1_000_000 &&
    Math.abs(value * 1000 - Math.round(value * 1000)) < 0.000001 &&
    (!wholeUnit(unit) || Number.isInteger(value))
  )
}
export function quickAmounts(unit: GoalUnit, target: number) {
  const values = {
    l: [0.25, 0.5],
    ml: [250, 500],
    pages: [5, 10],
    chapters: [1, 2],
    km: [0.5, 1],
    minutes: [5, 10],
    repetitions: [5, 10],
    sessions: [1],
  }[unit]
  const steps = values.filter((value) => value <= target)
  return steps.length ? steps : [target]
}
export function measurementNumber(value: number, language?: string) {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 3 }).format(
    value,
  )
}
