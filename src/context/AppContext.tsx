import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { seedCustomers, seedJobs, seedPayments, seedProducts, seedProjects, seedSurveys } from '../data'
import type { Customer, Job, Payment, Product, Project, Role, Survey } from '../types'

interface AppState {
  role: Role
  setRole: (role: Role) => void
  customers: Customer[]
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'openProjectCount' | 'balance'>) => Customer
  surveys: Survey[]
  addSurvey: (survey: Survey) => void
  products: Product[]
  updateProduct: (product: Product) => void
  jobs: Job[]
  updateJob: (job: Job) => void
  projects: Project[]
  updateProject: (project: Project) => void
  payments: Payment[]
  updatePayment: (payment: Payment) => void
}

const AppContext = createContext<AppState | undefined>(undefined)

function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : fallback
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useStoredState<Role>('tesisat-pro-role', 'admin')
  const [customers, setCustomers] = useStoredState('tesisat-pro-customers', seedCustomers)
  const [surveys, setSurveys] = useStoredState('tesisat-pro-surveys', seedSurveys)
  const [products, setProducts] = useStoredState('tesisat-pro-products', seedProducts)
  const [jobs, setJobs] = useStoredState('tesisat-pro-jobs', seedJobs)
  const [projects, setProjects] = useStoredState('tesisat-pro-projects', seedProjects)
  const [payments, setPayments] = useStoredState('tesisat-pro-payments', seedPayments)

  const value = useMemo<AppState>(() => ({
    role,
    setRole,
    customers,
    addCustomer: (input) => {
      const customer: Customer = {
        ...input,
        id: `mus-${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 10),
        openProjectCount: 0,
        balance: 0,
      }
      setCustomers((current) => [customer, ...current])
      return customer
    },
    surveys,
    addSurvey: (survey) => setSurveys((current) => [survey, ...current]),
    products,
    updateProduct: (product) => setProducts((current) => current.map((item) => item.id === product.id ? product : item)),
    jobs,
    updateJob: (job) => setJobs((current) => current.map((item) => item.id === job.id ? job : item)),
    projects,
    updateProject: (project) => setProjects((current) => current.map((item) => item.id === project.id ? project : item)),
    payments,
    updatePayment: (payment) => setPayments((current) => current.map((item) => item.id === payment.id ? payment : item)),
  }), [role, setRole, customers, setCustomers, surveys, setSurveys, products, setProducts, jobs, setJobs, projects, setProjects, payments, setPayments])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
