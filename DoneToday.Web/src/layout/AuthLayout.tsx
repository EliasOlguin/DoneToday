import { Link, Outlet, useLocation } from 'react-router'
import LanguageSelector from '../components/LanguageSelector'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'
import HabitCharacters from '../components/HabitCharacters'
import { useTranslation } from 'react-i18next'

export default function AuthLayout() {
  const { t } = useTranslation()
  const pathname = useLocation().pathname
  const loginPage = ['/login', '/register', '/confirm-email'].includes(pathname)
  return (
    <div
      className={`mx-auto flex min-h-dvh flex-col px-5 py-6 text-foreground ${loginPage ? 'auth-habits-layout max-w-6xl sm:px-8' : 'max-w-lg'}`}
    >
      <header
        className={`flex flex-wrap items-center justify-between gap-3 ${loginPage ? '' : 'mb-6'}`}
      >
        <Link
          to="/today"
          className="flex items-center gap-3 text-xl font-bold text-foreground"
        >
          <Logo />
          DoneToday
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <LanguageSelector />
        </div>
      </header>
      <main className={loginPage ? 'auth-habits-stage' : undefined}>
        {loginPage ? (
          <>
            <HabitCharacters />
            <aside className="auth-habits-story">
              <div className="auth-habits-copy">
                <p className="auth-habits-eyebrow">{t('auth.habitsEyebrow')}</p>
                <h2 className="auth-habits-title">{t('auth.habitsTitle')}</h2>
                <p className="auth-habits-description">
                  {t('auth.habitsDescription')}
                </p>
              </div>
              <HabitCharacters />
            </aside>
            <div className="auth-habits-form">
              <Outlet />
            </div>
          </>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  )
}
