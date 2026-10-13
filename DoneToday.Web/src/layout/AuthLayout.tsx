import { Link, Outlet, useLocation } from 'react-router'
import LanguageSelector from '../components/LanguageSelector'
import Logo from '../components/Logo'

export default function AuthLayout() {
  const loginPage = useLocation().pathname === '/login'
  return (
    <div
      className={`mx-auto flex min-h-dvh flex-col px-5 py-6 text-foreground ${loginPage ? 'max-w-6xl sm:px-8' : 'max-w-lg'}`}
    >
      <header
        className={`flex items-center justify-between gap-3 ${loginPage ? '' : 'mb-6'}`}
      >
        <Link
          to="/today"
          className="flex items-center gap-3 text-xl font-bold text-foreground"
        >
          <Logo />
          DoneToday
        </Link>
        <LanguageSelector />
      </header>
      <main
        className={
          loginPage
            ? 'flex flex-1 items-center justify-center py-4 lg:py-0'
            : undefined
        }
      >
        <Outlet />
      </main>
    </div>
  )
}
