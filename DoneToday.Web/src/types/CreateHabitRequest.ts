import type { GoalUnit } from './HabitProgress'
export interface CreateHabitRequest {
  goalTarget: number | null
  goalUnit: GoalUnit | null
  name: string
  icon: string
  description: string | null
  color: string | null
  daysOfWeek: number[]
}
