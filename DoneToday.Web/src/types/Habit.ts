export interface Habit {
  id: number
  name: string
  icon: string
  description: string | null
  color: string | null
  isArchived: boolean
  createdAt: string
  daysOfWeek: number[]
}
