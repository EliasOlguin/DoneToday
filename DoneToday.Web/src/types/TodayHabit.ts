export interface TodayHabit {
  id: number
  name: string
  icon: string
  color?: string
  isCompleted: boolean
  currentStreak: number
  bestStreak: number
}
