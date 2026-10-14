type HabitState = { id: number; isCompleted: boolean }

// A fresh load, an empty day, or deleting a pending habit is not a completion.
export function completedDayTransition(
  previous: HabitState[] | undefined,
  next: HabitState[],
) {
  return (
    !!previous?.length &&
    next.length === previous.length &&
    next.every(
      (habit) =>
        habit.isCompleted && previous.some((old) => old.id === habit.id),
    ) &&
    previous.some((habit) => !habit.isCompleted)
  )
}

export function celebrationKey(userId: number, day: string) {
  return `donetoday:celebrated:${userId}:${day}`
}

const celebratedInMemory = new Set<string>()
export function claimCelebration(
  key: string,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
) {
  if (celebratedInMemory.has(key)) return false
  try {
    if (storage.getItem(key) === '1') return false
    storage.setItem(key, '1')
  } catch {
    /* Storage may be disabled; still guard this app session. */
  }
  celebratedInMemory.add(key)
  return true
}
