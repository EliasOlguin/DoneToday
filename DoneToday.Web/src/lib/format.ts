import i18n from '../i18n'

export const days = [1, 2, 3, 4, 5, 6, 0].map((value) => ({ value }))

export function formatWeekday(
  value: number,
  width: 'long' | 'short' = 'short',
) {
  return new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    weekday: width,
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2026, 0, 4 + value)))
}

export function formatSchedule(selected: number[]) {
  return selected.length === 7
    ? i18n.t('common.everyDay')
    : days
        .filter((day) => selected.includes(day.value))
        .map((day) => formatWeekday(day.value))
        .join(', ')
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date.length === 10 ? `${date}T12:00:00Z` : date))
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat(i18n.resolvedLanguage, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value / 100)
}
