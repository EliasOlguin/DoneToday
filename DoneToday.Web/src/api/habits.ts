import { ApiError } from './errors'
import type { TranslationKey } from './errors'
import type { Habit } from '../types/Habit'
import type { HabitDetail } from '../types/HabitDetail'
import type { CreateHabitRequest } from '../types/CreateHabitRequest'

async function ensureSuccess(
  response: Response,
  fallback: TranslationKey,
): Promise<void> {
  if (response.ok) return
  if (response.status === 404) throw new ApiError('errors.habitMissing')
  if (response.status === 400) throw new ApiError('errors.validation')
  throw new ApiError(fallback)
}

export async function completeHabit(id: number): Promise<void> {
  const response = await fetch(`/api/Habits/${id}/complete`, { method: 'POST' })
  await ensureSuccess(
    response,
    response.status === 409 ? 'errors.alreadyCompleted' : 'errors.complete',
  )
}
export async function undoHabitCompletion(id: number): Promise<void> {
  const response = await fetch(`/api/Habits/${id}/complete`, {
    method: 'DELETE',
  })
  await ensureSuccess(response, 'errors.undo')
}
export async function getHabits(): Promise<Habit[]> {
  const response = await fetch('/api/Habits')
  await ensureSuccess(response, 'errors.loadHabits')
  return response.json()
}
export async function getArchivedHabits(): Promise<Habit[]> {
  const response = await fetch('/api/Habits/archived')
  await ensureSuccess(response, 'errors.loadArchived')
  return response.json()
}
export async function getHabitDetail(id: number): Promise<HabitDetail> {
  const response = await fetch(`/api/Habits/${id}/detail`)
  await ensureSuccess(response, 'errors.loadHabit')
  return response.json()
}
export async function createHabit(request: CreateHabitRequest): Promise<Habit> {
  const response = await fetch('/api/Habits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  await ensureSuccess(response, 'errors.create')
  return response.json()
}
export async function updateHabit(
  id: number,
  request: CreateHabitRequest,
): Promise<Habit> {
  const response = await fetch(`/api/Habits/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  await ensureSuccess(response, 'errors.update')
  return response.json()
}
export async function archiveHabit(id: number): Promise<void> {
  const response = await fetch(`/api/Habits/${id}/archive`, { method: 'PATCH' })
  await ensureSuccess(response, 'errors.archive')
}
export async function restoreHabit(id: number): Promise<void> {
  const response = await fetch(`/api/Habits/${id}/restore`, { method: 'PATCH' })
  await ensureSuccess(response, 'errors.restore')
}
