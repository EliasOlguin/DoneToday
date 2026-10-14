import type { GoalUnit } from './HabitProgress'
export interface Habit {
  goalTarget: number | null
  goalUnit: GoalUnit | null
  goalEffectiveFrom: string | null
  id: number
  name: string
  icon: string
  description: string | null
  color: string | null
  isArchived: boolean
  createdAt: string
  daysOfWeek: number[]
}
