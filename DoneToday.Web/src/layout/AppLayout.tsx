import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import Icon from '../components/ui/Icon'
import LanguageSelector from '../components/LanguageSelector'
import { useSession } from '../hooks/useSession'
import Logo from '../components/Logo'
import InstallApp from '../components/InstallApp'
import HabitCharacters from '../components/HabitCharacters'
import PageTransition from '../components/PageTransition'

const navigation = [
  { to: '/today', label: 'nav.today', icon: 'home' },
  { to: '/habits', label: 'nav.habits', icon: 'list' },
  { to: '/progress', label: 'nav.stats', icon: 'chart' },
  { to: '/settings', label: 'nav.settings', icon: 'settings' },
] as const

export default function AppLayout() {
  const { t } = useTranslation()
  const session = useSession()
  const { pathname } = useLocation()
  const wide = ['/today', '/habits', '/progress'].includes(pathname)
  return (
    <div className="relative isolate min-h-dvh bg-background text-foreground">
      <HabitCharacters background />
      <header className="lg:border-b lg:border-muted/10 lg:bg-surface">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-6 pb-3 pt-8 lg:h-20 lg:max-w-7xl lg:justify-between lg:py-0 lg:px-10">
          <Link
            to="/today"
            className="flex items-center gap-3 text-xl font-bold tracking-tight"
          >
            <Logo />
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
            <LanguageSelector />
            <Link
              to="/settings"
              aria-label={t('auth.account')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-semibold uppercase text-primary"
            >
              {(session.data?.displayName || session.data?.email)?.slice(
                0,
                1,
              ) || <Icon name="user" />}
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
        <PageTransition>
          <Outlet />
        </PageTransition>
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
      {!pathname.startsWith('/settings') && <InstallApp suggestion />}
    </div>
  )
}
