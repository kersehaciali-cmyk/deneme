import { useEffect, useState } from 'react'
import { Shell } from './components/Shell'
import { useApp } from './context/AppContext'
import { canAccess } from './lib/domain'
import { Catalog } from './pages/Catalog'
import { Customers } from './pages/Customers'
import { Dashboard } from './pages/Dashboard'
import { Jobs } from './pages/Jobs'
import { Payments } from './pages/Payments'
import { Projects } from './pages/Projects'
import { Reports } from './pages/Reports'
import { Surveys } from './pages/Surveys'
import { Users } from './pages/Users'
import type { PageKey } from './types'

const pages: PageKey[] = ['dashboard', 'users', 'customers', 'surveys', 'jobs', 'projects', 'payments', 'catalog', 'reports']

export default function App() {
  const { role } = useApp()
  const requestedPage = window.location.hash.replace('#/', '') as PageKey
  const initialPage = pages.includes(requestedPage) && canAccess(role, requestedPage) ? requestedPage : 'dashboard'
  const [page, setPage] = useState<PageKey>(initialPage)

  useEffect(() => {
    if (!canAccess(role, page)) setPage('dashboard')
  }, [role, page])

  const navigate = (target: PageKey) => {
    setPage(target)
    window.location.hash = `/${target}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const content = {
    dashboard: <Dashboard onNavigate={navigate} />,
    users: <Users />,
    customers: <Customers />,
    surveys: <Surveys />,
    jobs: <Jobs />,
    projects: <Projects />,
    payments: <Payments />,
    catalog: <Catalog />,
    reports: <Reports />,
  }[page]

  return <Shell page={page} onNavigate={navigate}>{content}</Shell>
}
