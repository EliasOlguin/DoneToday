import { Link, Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'
import { languages } from '../i18n'

export default function AuthLayout() {
  const { t, i18n } = useTranslation()
  return (
    <div className="mx-auto min-h-dvh max-w-lg px-5 py-8 text-foreground">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link to="/today" className="text-xl font-bold text-primary">
          DoneToday
        </Link>
        <select
          aria-label={t('settings.language')}
          className="field max-w-36"
          value={i18n.resolvedLanguage ?? 'en'}
          onChange={(e) => void i18n.changeLanguage(e.target.value)}
        >
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
