export const motivationKeys = [
  'motivation.01',
  'motivation.02',
  'motivation.03',
  'motivation.04',
  'motivation.05',
  'motivation.06',
  'motivation.07',
  'motivation.08',
  'motivation.09',
  'motivation.10',
  'motivation.11',
  'motivation.12',
  'motivation.13',
  'motivation.14',
  'motivation.15',
  'motivation.16',
  'motivation.17',
  'motivation.18',
  'motivation.19',
  'motivation.20',
  'motivation.21',
  'motivation.22',
  'motivation.23',
  'motivation.24',
  'motivation.25',
  'motivation.26',
  'motivation.27',
  'motivation.28',
  'motivation.29',
  'motivation.30',
  'motivation.31',
  'motivation.32',
  'motivation.33',
  'motivation.34',
  'motivation.35',
  'motivation.36',
  'motivation.37',
  'motivation.38',
  'motivation.39',
  'motivation.40',
  'motivation.41',
  'motivation.42',
  'motivation.43',
  'motivation.44',
  'motivation.45',
  'motivation.46',
  'motivation.47',
  'motivation.48',
  'motivation.49',
  'motivation.50',
  'motivation.51',
  'motivation.52',
  'motivation.53',
  'motivation.54',
  'motivation.55',
  'motivation.56',
  'motivation.57',
  'motivation.58',
  'motivation.59',
  'motivation.60',
  'motivation.61',
  'motivation.62',
  'motivation.63',
  'motivation.64',
  'motivation.65',
  'motivation.66',
  'motivation.67',
  'motivation.68',
  'motivation.69',
  'motivation.70',
] as const

type MotivationKey = (typeof motivationKeys)[number]
type BookSource = {
  labelKey:
    | 'motivation.sourceAtomicHabits'
    | 'motivation.sourceSeneca'
    | 'motivation.inspiredAtomicHabits'
  url: string
  kind: 'excerpt' | 'inspired'
}

const bookSources: Partial<Record<MotivationKey, BookSource>> = {
  'motivation.01': {
    labelKey: 'motivation.sourceAtomicHabits',
    url: 'https://jamesclear.com/quote/atomic-habits',
    kind: 'excerpt',
  },
  'motivation.31': {
    labelKey: 'motivation.sourceSeneca',
    url: 'https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_1',
    kind: 'excerpt',
  },
}

// Use calendar dates rather than elapsed local hours so DST cannot skip a quote.
const dayMilliseconds = 86_400_000
const rotationStart = Date.UTC(2026, 9, 14) / dayMilliseconds

export function getDailyMotivation(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  const day =
    Date.UTC(value('year'), value('month') - 1, value('day')) / dayMilliseconds
  const offset = day - rotationStart
  const index =
    ((offset % motivationKeys.length) + motivationKeys.length) %
    motivationKeys.length
  const textKey = motivationKeys[index]
  const source: BookSource | undefined =
    index >= 60
      ? {
          labelKey: 'motivation.inspiredAtomicHabits',
          url:
            index < 65
              ? 'https://jamesclear.com/atomic-habits-summary'
              : 'https://jamesclear.com/quote/atomic-habits',
          kind: 'inspired',
        }
      : bookSources[textKey]
  return { textKey, source }
}
