import { NavLink, Outlet } from 'react-router'

const navigation = [
  { to: '/today', label: 'Today' },
  { to: '/habits', label: 'Habits' },
  { to: '/progress', label: 'Progress' },
]

export default function AppLayout() {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <p className="text-xl font-bold">DoneToday</p>

          <nav
            aria-label="Main navigation"
            className="mt-4 grid grid-cols-3 gap-2"
          >
            {navigation.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex min-h-11 items-center justify-center rounded-xl
                   px-3 text-sm font-medium
                   focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-emerald-600 ${
                     isActive
                       ? 'bg-emerald-600 text-white'
                       : 'text-slate-600 hover:bg-slate-100'
                   }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
