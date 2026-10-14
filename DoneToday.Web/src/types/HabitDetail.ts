import type { Habit } from './Habit'
import type { HabitProgress } from './HabitProgress'

export interface HabitDetail extends Habit {
  progress: HabitProgress | null
  currentStreak: number
  bestStreak: number
  completionDates: string[]
  scheduleEffectiveFrom: string | null
}
