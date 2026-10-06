import type { WeeklyProgress } from '../types/WeeklyProgress'

export async function getWeeklyProgress(): Promise<WeeklyProgress> {
  const response = await fetch('/api/Progress/week')
  if (!response.ok) throw new Error('Could not load weekly progress.')
  return response.json()
}
