import { apiFetch } from './client'
import { ApiError } from './errors'
import type { WeeklyProgress } from '../types/WeeklyProgress'

export async function getWeeklyProgress(): Promise<WeeklyProgress> {
  const response = await apiFetch('/api/Progress/week')
  if (!response.ok) throw new ApiError('errors.progress')
  return response.json()
}
