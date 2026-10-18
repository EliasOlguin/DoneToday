import './i18n'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import NetworkActivity from './components/NetworkActivity'
import ThemeProvider from './context/ThemeProvider'
import './index.css'
import { createAppQueryClient } from './api/queryClient'
import SessionSync from './components/SessionSync'
import AppUpdate from './components/AppUpdate'
import UnsavedChangesGuard from './components/UnsavedChangesGuard'

const queryClient = createAppQueryClient()
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <NetworkActivity>
        <SessionSync />
        <AppUpdate />
        <UnsavedChangesGuard />
        <App />
      </NetworkActivity>
    ),
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
