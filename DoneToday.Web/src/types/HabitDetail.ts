import type { Habit } from './Habit'

export interface HabitDetail extends Habit {
  currentStreak: number
  bestStreak: number
  completionDates: string[]
  scheduleEffectiveFrom: string | null
}
