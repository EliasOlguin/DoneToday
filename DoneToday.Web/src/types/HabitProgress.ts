export const goalUnits = [
  'l',
  'ml',
  'pages',
  'chapters',
  'km',
  'minutes',
  'repetitions',
  'sessions',
] as const
export type GoalUnit = (typeof goalUnits)[number]
export type ProgressEntry = {
  id: number
  amount: number
  resultingAmount: number
  isCorrection: boolean
  createdAt: string
}
export type HabitProgress = {
  date: string
  target: number
  unit: GoalUnit
  amount: number
  revision: number
  isScheduled: boolean
  entries: ProgressEntry[]
}
export type QuantityProgress = {
  startDate: string
  endDate: string
  habits: {
    habitId: number
    name: string
    icon: string
    color: string | null
    unit: GoalUnit
    amount: number
    target: number
    completedDays: number
    scheduledDays: number
    coverage: number
    days: { date: string; amount: number; target: number }[]
  }[]
}
