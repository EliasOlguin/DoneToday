import { apiFetch } from './client'
import { ApiError } from './errors'
import type { WeeklyProgress } from '../types/WeeklyProgress'
import type { QuantityProgress } from '../types/HabitProgress'

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

export async function getQuantityProgress(
  habitId?: number,
  year?: number,
  month?: number,
): Promise<QuantityProgress> {
  const params = new URLSearchParams()
  if (habitId !== undefined) params.set('habitId', String(habitId))
  if (year !== undefined && month !== undefined) {
    params.set('year', String(year))
    params.set('month', String(month))
  }
  const response = await apiFetch(`/api/Progress/quantities?${params}`)
  if (!response.ok) throw new ApiError('errors.progress')
  return response.json()
}
