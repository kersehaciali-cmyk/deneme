import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { acStages, gasStages, heatPumpStages, plumbingStages, seedCustomers, seedJobs, seedPayments, seedProducts, seedProjects, seedSurveys, seedTemplates, seedUsers } from '../data'
import type { AppUser, Customer, Job, Payment, Product, Project, Role, Survey, SurveyTemplate } from '../types'

interface AppState {
  role: Role
  setRole: (role: Role) => void
  users: AppUser[]
  addUser: (user: Omit<AppUser, 'id'>) => void
  updateUser: (user: AppUser) => void
  customers: Customer[]
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'openProjectCount' | 'balance'>) => Customer
  surveys: Survey[]
  addSurvey: (survey: Survey) => void
  updateSurvey: (survey: Survey) => void
  templates: SurveyTemplate[]
  addTemplate: (template: Omit<SurveyTemplate, 'id'>) => void
  updateTemplate: (template: SurveyTemplate) => void
  products: Product[]
  updateProduct: (product: Product) => void
  jobs: Job[]
  updateJob: (job: Job) => void
  projects: Project[]
  updateProject: (project: Project) => void
  convertSurveyToProject: (surveyId: string, masterId: string, applicationDate: string) => Project | undefined
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
  const [role, setRole] = useStoredState<Role>('tesisat-pro-v2-role', 'admin')
  const [users, setUsers] = useStoredState('tesisat-pro-v2-users', seedUsers)
  const [customers, setCustomers] = useStoredState('tesisat-pro-v2-customers', seedCustomers)
  const [surveys, setSurveys] = useStoredState('tesisat-pro-v2-surveys', seedSurveys)
  const [templates, setTemplates] = useStoredState('tesisat-pro-v2-templates', seedTemplates)
  const [products, setProducts] = useStoredState('tesisat-pro-v2-products', seedProducts)
  const [jobs, setJobs] = useStoredState('tesisat-pro-v2-jobs', seedJobs)
  const [projects, setProjects] = useStoredState('tesisat-pro-v2-projects', seedProjects)
  const [payments, setPayments] = useStoredState('tesisat-pro-v2-payments', seedPayments)

  const value = useMemo<AppState>(() => ({
    role,
    setRole,
    users,
    addUser: (user) => setUsers((current) => [{ ...user, id: `usr-${Date.now()}` }, ...current]),
    updateUser: (user) => setUsers((current) => current.map((item) => item.id === user.id ? user : item)),
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
    updateSurvey: (survey) => setSurveys((current) => current.map((item) => item.id === survey.id ? survey : item)),
    templates,
    addTemplate: (template) => setTemplates((current) => [...current, { ...template, id: `tpl-${Date.now()}` }]),
    updateTemplate: (template) => setTemplates((current) => current.map((item) => item.id === template.id ? template : item)),
    products,
    updateProduct: (product) => setProducts((current) => current.map((item) => {
      if (item.id !== product.id) return item
      if (item.cost === product.cost && item.sale === product.sale) return product
      return {
        ...product,
        priceHistory: [
          ...(item.priceHistory ?? []),
          { id: `${product.id}-${Date.now()}`, date: new Date().toISOString().slice(0, 10), cost: product.cost, sale: product.sale },
        ],
      }
    })),
    jobs,
    updateJob: (job) => setJobs((current) => current.map((item) => item.id === job.id ? job : item)),
    projects,
    updateProject: (project) => setProjects((current) => current.map((item) => item.id === project.id ? project : item)),
    convertSurveyToProject: (surveyId, masterId, applicationDate) => {
      const survey = surveys.find((item) => item.id === surveyId)
      if (!survey) return undefined
      const master = users.find((user) => user.id === masterId)
      const manager = users.find((user) => user.role === 'proje' && user.active)
      const stages = survey.type === 'Doğalgaz' ? gasStages : survey.type === 'Isı Pompası' ? heatPumpStages : survey.type === 'Klima' ? acStages : plumbingStages
      const due = new Date(`${applicationDate}T12:00:00`)
      due.setDate(due.getDate() + 30)
      const materials = survey.lines.map((line) => {
        const product = products.find((item) => item.id === line.productId)
        return { id: `mat-${line.id}`, productId: line.productId, label: product ? `${product.name}${product.variant ? ` · ${product.variant}` : ''}` : line.productId, quantity: line.quantity, unit: product?.unit ?? 'adet', prepared: false }
      })
      const project: Project = {
        id: `PRJ-${100 + projects.length}`,
        customerId: survey.customerId,
        surveyId,
        type: survey.type,
        currentStage: 0,
        stages,
        owner: manager?.name ?? 'Proje Takipçisi',
        dueDate: due.toISOString().slice(0, 10),
        assignedMasterId: masterId,
        applicationDate,
        materials,
        attachments: [],
        adminApproved: false,
      }
      setProjects((current) => [project, ...current])
      setSurveys((current) => current.map((item) => item.id === surveyId ? { ...item, status: 'Projeye Dönüştü' } : item))
      setCustomers((current) => current.map((customer) => customer.id === survey.customerId ? { ...customer, openProjectCount: customer.openProjectCount + 1 } : customer))
      const job: Job = {
        id: `IS-${300 + jobs.length}`,
        customerId: survey.customerId,
        title: `${survey.type} uygulaması`,
        assignee: master?.name ?? 'Atanmadı',
        appointment: applicationDate,
        status: 'Planlandı',
        checklist: materials.map((material) => ({ id: `check-${material.id}`, label: `${material.label} · ${material.quantity} ${material.unit}`, done: false })),
      }
      setJobs((current) => [job, ...current])
      return project
    },
    payments,
    updatePayment: (payment) => setPayments((current) => current.map((item) => item.id === payment.id ? payment : item)),
  }), [role, setRole, users, setUsers, customers, setCustomers, surveys, setSurveys, templates, setTemplates, products, setProducts, jobs, setJobs, projects, setProjects, payments, setPayments])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
