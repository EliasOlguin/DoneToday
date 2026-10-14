export interface CreateHabitRequest {
  name: string
  icon: string
  description: string | null
  color: string | null
  daysOfWeek: number[]
}
