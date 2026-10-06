import type { TodayHabit } from '../types/TodayHabit'

export async function getTodayHabits(): Promise<TodayHabit[]> {
  const response = await fetch('/api/Today')

  if (!response.ok) {
    throw new Error('Could not load today’s habits.')
  }

  return response.json()
}