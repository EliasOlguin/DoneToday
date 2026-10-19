import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, Route, Routes } from 'react-router'
import AppLayout from './layout/AppLayout'
import TodayPage from './pages/TodayPage'
const AuthLayout = lazy(() => import('./layout/AuthLayout'))
import RequireAuth from './components/RequireAuth'
const RequireGuest = lazy(() => import('./components/RequireGuest'))

const HabitsPage = lazy(() => import('./pages/HabitsPage'))
const HabitFormPage = lazy(() => import('./pages/HabitFormPage'))
const HabitDetailPage = lazy(() => import('./pages/HabitDetailPage'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ConfirmEmailPage = lazy(() => import('./pages/ConfirmEmailPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const TwoFactorPage = lazy(() => import('./pages/TwoFactorPage'))
const ConnectionsPage = lazy(() => import('./pages/ConnectionsPage'))

export default function App() {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <div role="status" aria-label="Loading" className="p-4">
          ...
        </div>
      }
    >
      <Routes>
        <Route element={<AuthLayout />}>
          <Route element={<RequireGuest />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="register" element={<RegisterPage />} />
          </Route>
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="confirm-email" element={<ConfirmEmailPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/today" replace />} />
            <Route path="today" element={<TodayPage />} />
            <Route path="habits" element={<HabitsPage />} />
            <Route path="habits/new" element={<HabitFormPage />} />
            <Route path="habits/:id" element={<HabitDetailPage />} />
            <Route path="habits/:id/edit" element={<HabitFormPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/security" element={<TwoFactorPage />} />
            <Route path="settings/connections" element={<ConnectionsPage />} />
            <Route
              path="*"
              element={
                <section>
                  <h1 className="page-title">{t('common.notFound')}</h1>
                  <Link to="/today" className="btn-primary mt-4 inline-block">
                    {t('common.backToday')}
                  </Link>
                </section>
              }
            />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
