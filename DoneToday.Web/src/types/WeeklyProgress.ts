export interface WeeklyProgress {
  scheduled: number
  completed: number
  completionRate: number
  startDate: string
  endDate: string
  days: { date: string; scheduled: number; completed: number }[]
  habits: {
    id: number
    name: string
    color: string | null
    scheduled: number
    completed: number
    completionRate: number
  }[]
}
