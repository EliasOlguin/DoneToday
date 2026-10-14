import type { CSSProperties } from 'react'

const paths = {
  book: 'M12 5v16M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z',
  water: 'M12 3C9 8 5 12 5 16a7 7 0 0 0 14 0c0-4-4-8-7-13Zm-3 13c0 2 1 3 3 3',
  walk: 'M15 4a1 1 0 1 0 0 .1M8 21l4-7m-1-7 4 2 3 3h3M11 7l-3 5H4m7-5 2 7 4 7',
  leaf: 'M20 3C8 3 3 8 5 15s12 7 15-12ZM4 21l12-12',
  code: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16',
  heart: 'M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 1 10 8 16 7-6 12-12 8-16Z',
  music:
    'M9 18V5l12-2v13M9 9l12-2M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0m12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  food: 'M4 3v6a3 3 0 0 0 6 0V3M7 3v18M17 3c-3 4-3 8 0 9h3M20 3v18',
  moon: 'M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z',
  mail: 'M3 5h18v14H3V5Zm0 1 9 7 9-7',
  shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M5 21v-2a7 7 0 0 1 14 0v2',
  logout: 'M9 4H4v16h5m5-13 5 5-5 5M9 12h10',
  plus: 'M12 5v14M5 12h14',
  settings:
    'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Zm6 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  trophy:
    'M8 3h8v7a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v7m-4 0h8',
  archive: 'M3 3h18v5H3V3Zm2 5v13h14V8m-9 4h4',
  sun: 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17m10-10 1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  home: 'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
  list: 'M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1',
  chart: 'M4 20V10h4v10m4 0V4h4v16m4 0V8h2v12',
  check: 'm5 12 4 4L19 6',
  arrow: 'm9 5 7 7-7 7',
  habit: 'M6 8v8m12-8v8M3 10v4m18-4v4M6 12h12',
  flame:
    'M12 3c2 5-3 6-3 10 0 2 1 3 3 3 2-2 2-3 2-5 3 2 5 4 5 6a7 7 0 0 1-14 0c0-4 3-6 7-14Z',
} as const

export default function Icon({
  name,
  className = 'h-5 w-5',
  style,
}: {
  name: keyof typeof paths
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  )
}
