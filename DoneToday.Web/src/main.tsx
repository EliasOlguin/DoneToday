import './i18n'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import NetworkActivity from './components/NetworkActivity'
import ThemeProvider from './context/ThemeProvider'
import './index.css'
import { createAppQueryClient } from './api/queryClient'
import SessionSync from './components/SessionSync'
import AppUpdate from './components/AppUpdate'

const queryClient = createAppQueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <NetworkActivity>
            <SessionSync />
            <AppUpdate />
            <App />
          </NetworkActivity>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
