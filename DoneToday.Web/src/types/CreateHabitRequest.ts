export interface CreateHabitRequest {
  name: string
  description: string | null
  color: string | null
  daysOfWeek: number[]
}
