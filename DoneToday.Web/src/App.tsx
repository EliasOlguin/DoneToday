import { useTranslation } from 'react-i18next'
import { Link, Navigate, Route, Routes } from 'react-router'
import AppLayout from './layout/AppLayout'
import TodayPage from './pages/TodayPage'
import HabitsPage from './pages/HabitsPage'
import HabitFormPage from './pages/HabitFormPage'
import HabitDetailPage from './pages/HabitDetailPage'
import ProgressPage from './pages/ProgressPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const { t } = useTranslation()
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="today" element={<TodayPage />} />
        <Route path="habits" element={<HabitsPage />} />
        <Route path="habits/new" element={<HabitFormPage />} />
        <Route path="habits/:id" element={<HabitDetailPage />} />
        <Route path="habits/:id/edit" element={<HabitFormPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="*"
          element={
            <section>
              <h1 className="page-title">{t('common.notFound')}</h1>
              <Link to="/today" className="mt-4 inline-block text-primary">
                {t('common.backToday')}
              </Link>
            </section>
          }
        />
      </Route>
    </Routes>
  )
}
