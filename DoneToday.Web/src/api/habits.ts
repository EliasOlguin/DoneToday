import type { Habit } from '../types/Habit'
import type { HabitDetail } from '../types/HabitDetail'
import type { CreateHabitRequest } from '../types/CreateHabitRequest'

async function ensureSuccess(
  response: Response,
  fallback: string,
): Promise<void> {
  if (response.ok) return
  if (response.status === 404)
    throw new Error('Habit not found. It may have been archived.')
  const body = await response.text()
  try {
    const problem = JSON.parse(body) as { errors?: Record<string, string[]> }
    if (problem.errors)
      throw new Error(Object.values(problem.errors).flat().join(' '))
  } catch (error) {
    if (error instanceof Error && !(error instanceof SyntaxError)) throw error
  }
  throw new Error(fallback)
}

export async function completeHabit(id: number): Promise<void> {
  const response = await fetch(`/api/Habits/${id}/complete`, { method: 'POST' })
  await ensureSuccess(
    response,
    response.status === 409
      ? 'This habit is already completed today. Refresh and try again.'
      : 'Could not complete the habit.',
  )
}
export async function undoHabitCompletion(id: number): Promise<void> {
  const response = await fetch(`/api/Habits/${id}/complete`, {
    method: 'DELETE',
  })
  await ensureSuccess(response, 'Could not undo the habit completion.')
}
export async function getHabits(): Promise<Habit[]> {
  const response = await fetch('/api/Habits')
  await ensureSuccess(response, 'Could not load your habits.')
  return response.json()
}
export async function getArchivedHabits(): Promise<Habit[]> {
  const response = await fetch('/api/Habits/archived')
  await ensureSuccess(response, 'Could not load archived habits.')
  return response.json()
}
export async function getHabitDetail(id: number): Promise<HabitDetail> {
  const response = await fetch(`/api/Habits/${id}/detail`)
  await ensureSuccess(response, 'Could not load this habit.')
  return response.json()
}
export async function createHabit(request: CreateHabitRequest): Promise<Habit> {
  const response = await fetch('/api/Habits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  await ensureSuccess(response, 'Could not create the habit.')
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
  await ensureSuccess(response, 'Could not update the habit.')
  return response.json()
}
export async function archiveHabit(id: number): Promise<void> {
  const response = await fetch(`/api/Habits/${id}/archive`, { method: 'PATCH' })
  await ensureSuccess(response, 'Could not archive the habit.')
}
export async function restoreHabit(id: number): Promise<void> {
  const response = await fetch(`/api/Habits/${id}/restore`, { method: 'PATCH' })
  await ensureSuccess(response, 'Could not restore the habit.')
}
