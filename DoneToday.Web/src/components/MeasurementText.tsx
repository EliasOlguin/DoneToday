import { useTranslation } from 'react-i18next'
import type { GoalUnit } from '../types/HabitProgress'
import { measurementNumber } from '../lib/measurements'

export default function MeasurementText({
  value,
  unit,
}: {
  value: number
  unit: GoalUnit
}) {
  const { t, i18n } = useTranslation()
  return (
    <>
      {measurementNumber(value, i18n.resolvedLanguage)}{' '}
      {t(`measure.unit.${unit}`, { count: value })}
    </>
  )
}
