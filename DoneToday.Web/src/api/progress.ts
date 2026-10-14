import { apiFetch } from './client'
import { ApiError } from './errors'
import type { WeeklyProgress } from '../types/WeeklyProgress'

export type MonthlyProgress = {
  startDate: string
  today: string
  scheduled: number
  completed: number
  completionRate: number
  days: { date: string; scheduled: number; completed: number }[]
}
export async function getMonthlyProgress(
  year: number,
  month: number,
  habitId?: number,
): Promise<MonthlyProgress> {
  const response = await apiFetch(
    `/api/Progress/month?year=${year}&month=${month}${habitId ? `&habitId=${habitId}` : ''}`,
  )
  if (!response.ok) throw new ApiError('errors.progress')
  return response.json()
}

export async function getWeeklyProgress(
  habitId?: number,
): Promise<WeeklyProgress> {
  const response = await apiFetch(
    `/api/Progress/week${habitId ? `?habitId=${habitId}` : ''}`,
  )
  if (!response.ok) throw new ApiError('errors.progress')
  return response.json()
}
