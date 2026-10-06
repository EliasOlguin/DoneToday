import { Link, NavLink, Outlet } from 'react-router'
import Icon from '../components/ui/Icon'

const navigation = [
  { to: '/today', label: 'Today', icon: 'home' },
  { to: '/habits', label: 'Habits', icon: 'list' },
  { to: '/progress', label: 'Stats', icon: 'chart' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
] as const

export default function AppLayout() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-background text-foreground">
      <header className="flex items-center gap-3 px-6 pb-3 pt-8">
        <Icon name="sun" className="h-7 w-7 text-primary" />
        <Link to="/today" className="text-xl font-bold tracking-tight">
          DoneToday
        </Link>
        <Link
          to="/habits/new"
          aria-label="Create a habit"
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-background hover:opacity-90"
        >
          <Icon name="plus" />
        </Link>
      </header>
      <main className="px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-6">
        <Outlet />
      </main>
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-lg border-t border-muted/10 bg-surface/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur"
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
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
