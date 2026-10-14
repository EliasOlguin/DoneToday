export const habitIcons = [
  'habit',
  'book',
  'water',
  'walk',
  'moon',
  'leaf',
  'code',
  'heart',
  'music',
  'food',
  'sun',
] as const
export type HabitIconName = (typeof habitIcons)[number]

export function resolveHabitIcon(value?: string | null): HabitIconName {
  return habitIcons.includes(value as HabitIconName)
    ? (value as HabitIconName)
    : 'habit'
}

const suggestions: [HabitIconName, RegExp][] = [
  [
    'water',
    /\b(water|drink|hydrate|hydration|agua|beber|hidratar\w*|wasser|trinken)\b/u,
  ],
  [
    'book',
    /\b(read\w*|book\w*|study|leer|lectura|libro\w*|estudi\w*|lesen|buch\w*|lernen)\b/u,
  ],
  [
    'walk',
    /\b(walk\w*|run\w*|steps?|caminar|caminata|pasos|correr|spazieren\w*|laufen|schritte)\b/u,
  ],
  ['moon', /\b(sleep\w*|bed|dormir|sueno|descans\w*|schlafen|schlaf)\b/u],
  [
    'leaf',
    /\b(meditat\w*|yoga|mindful\w*|meditar|meditacion|respirar|meditieren)\b/u,
  ],
  ['code', /\b(code|coding|program\w*|codigo|programmieren)\b/u],
  [
    'music',
    /\b(music\w*|guitar\w*|piano|sing\w*|musica|cantar|musik|singen)\b/u,
  ],
  [
    'food',
    /\b(cook\w*|eat\w*|food|vegetables?|fruit|cocinar|comer|comida|fruta\w*|verdura\w*|kochen|essen|obst|gemuse)\b/u,
  ],
  ['heart', /\b(health\w*|salud|medicin\w*|vitamin\w*|gesund\w*)\b/u],
  [
    'habit',
    /\b(gym|workout|exercise|train\w*|gimnasio|ejercicio\w*|entren\w*|sport|fitness)\b/u,
  ],
  ['sun', /\b(morning|sun|sunlight|sunshine|manana|sol|morgen|sonne)\b/u],
]

export function suggestHabitIcon(name: string): HabitIconName {
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return (
    suggestions.find(([, pattern]) => pattern.test(normalized))?.[0] ?? 'habit'
  )
}
