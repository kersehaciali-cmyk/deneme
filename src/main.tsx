import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthBoundary } from './components/AuthScreen'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthBoundary>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthBoundary>
    </AuthProvider>
  </StrictMode>,
)
