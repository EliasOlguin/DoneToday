import { Navigate, Route, Routes } from 'react-router'
import AppLayout from './layout/AppLayout'
import TodayPage from './pages/TodayPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="today" element={<TodayPage />} />
        <Route path="habits" element={<section><h1 className="text-2xl font-bold">Habits</h1><p className="mt-2 text-slate-600">Your habit list is coming soon.</p></section>} />
        <Route path="progress" element={<section><h1 className="text-2xl font-bold">Progress</h1><p className="mt-2 text-slate-600">Your progress overview is coming soon.</p></section>} />
        <Route path="*" element={<h1 className="text-2xl font-bold">Page not found</h1>} />
      </Route>
    </Routes>
  )
}
