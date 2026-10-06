import { createContext } from 'react'

export type Theme = 'dark' | 'light'
export const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
}>({ theme: 'dark', setTheme: () => {} })
