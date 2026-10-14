import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeContext } from '../context/theme'
import Icon from './ui/Icon'

export default function ThemeToggle() {
  const { theme, setTheme } = useContext(ThemeContext)
  const { t } = useTranslation()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const label = `${t('settings.appearance')}: ${t(`settings.${nextTheme}`)}`

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(nextTheme)}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-muted/20 bg-surface text-foreground transition-colors hover:border-primary/40 hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Icon name={nextTheme === 'light' ? 'sun' : 'moon'} />
    </button>
  )
}
