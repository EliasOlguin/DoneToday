import type { HabitProgress } from './HabitProgress'
export interface TodayHabit {
  progress: HabitProgress | null
  id: number
  name: string
  icon: string
  color?: string
  isCompleted: boolean
  currentStreak: number
  bestStreak: number
}
