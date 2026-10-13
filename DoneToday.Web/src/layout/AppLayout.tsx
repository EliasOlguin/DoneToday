import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import Icon from '../components/ui/Icon'
import { languages } from '../i18n'
import { useSession } from '../hooks/useSession'

const navigation = [
  { to: '/today', label: 'nav.today', icon: 'home' },
  { to: '/habits', label: 'nav.habits', icon: 'list' },
  { to: '/progress', label: 'nav.stats', icon: 'chart' },
  { to: '/settings', label: 'nav.settings', icon: 'settings' },
] as const

export default function AppLayout() {
  const { t, i18n } = useTranslation()
  const session = useSession()
  const { pathname } = useLocation()
  const wide = ['/today', '/habits', '/progress'].includes(pathname)
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="lg:border-b lg:border-muted/10 lg:bg-surface">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-6 pb-3 pt-8 lg:h-20 lg:max-w-7xl lg:justify-between lg:py-0 lg:px-10">
          <Link
            to="/today"
            className="flex items-center gap-3 text-xl font-bold tracking-tight"
          >
            <Icon name="sun" className="h-7 w-7 text-primary" />
            DoneToday
          </Link>
          <nav
            aria-label={t('nav.main')}
            className="hidden h-full items-center gap-8 lg:flex"
          >
            {navigation.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex h-full items-center border-b-[3px] px-1 text-sm font-semibold ${isActive ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`
                }
              >
                {t(label)}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-5 lg:flex">
            <select
              aria-label={t('settings.language')}
              value={i18n.resolvedLanguage ?? 'en'}
              onChange={(event) => void i18n.changeLanguage(event.target.value)}
              className="min-h-11 rounded-xl bg-transparent px-2 text-sm text-muted"
            >
              {languages.map(({ code, label }) => (
                <option key={code} value={code} lang={code}>
                  {label}
                </option>
              ))}
            </select>
            <Link
              to="/settings"
              aria-label={t('auth.account')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-semibold uppercase text-primary"
            >
              {session.data?.email.slice(0, 1) || <Icon name="user" />}
            </Link>
          </div>
          <Link
            to="/habits/new"
            aria-label={t('common.create')}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-background hover:opacity-90 lg:hidden"
          >
            <Icon name="plus" />
          </Link>
        </div>
      </header>
      <main
        className={`mx-auto max-w-lg px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-10 lg:pt-12 lg:pb-12 ${wide ? 'lg:max-w-7xl' : 'lg:max-w-3xl'}`}
      >
        <Outlet />
      </main>
      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-lg border-t border-muted/10 bg-surface/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-4 gap-2">
          {navigation.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs ${isActive ? 'text-primary' : 'text-muted hover:text-foreground'}`
              }
            >
              <Icon name={icon} />
              <span>{t(label)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
