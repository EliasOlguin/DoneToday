import { apiFetch } from './client'
import { ApiError } from './errors'
import type { TodayHabit } from '../types/TodayHabit'

export async function getTodayHabits(): Promise<TodayHabit[]> {
  const response = await apiFetch('/api/Today')

  if (!response.ok) {
    throw new ApiError('errors.loadToday')
  }

  return response.json()
}
