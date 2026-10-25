import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { acStages, gasStages, heatPumpStages, plumbingStages, seedCustomers, seedJobs, seedPayments, seedProducts, seedProjects, seedSurveys, seedTemplates } from '../data'
import { supabase } from '../lib/supabase'
import { buildApproximateMaterials } from '../lib/materials'
import type { AppUser, Customer, Job, Payment, Product, Project, Role, Survey, SurveyTemplate } from '../types'
import { useAuth } from './AuthContext'

type SyncStatus = 'loading' | 'online' | 'error'
type EntityType = 'customer' | 'survey' | 'template' | 'product' | 'job' | 'project' | 'payment'

export interface BulkUserEntry {
  name: string
  phone: string
  role: Role
  password: string
}

export interface BulkUserResult {
  index: number
  name: string
  ok: boolean
  status?: 'created' | 'updated' | 'error'
  error?: string
}

export interface ProjectResetResult {
  deletedProjects?: number
  deletedJobs?: number
  resetSurveys?: number
  resetCustomers?: number
}

interface AppState {
  role: Role
  currentUser: AppUser
  syncStatus: SyncStatus
  users: AppUser[]
  addUser: (user: Omit<AppUser, 'id'>, password?: string) => Promise<void>
  updateUser: (user: AppUser, password?: string) => Promise<void>
  bulkUpsertUsers: (entries: BulkUserEntry[]) => Promise<BulkUserResult[]>
  resetProjects: () => Promise<ProjectResetResult>
  customers: Customer[]
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'openProjectCount' | 'balance'>) => Customer
  surveys: Survey[]
  addSurvey: (survey: Survey) => void
  updateSurvey: (survey: Survey) => void
  templates: SurveyTemplate[]
  addTemplate: (template: Omit<SurveyTemplate, 'id'>) => void
  updateTemplate: (template: SurveyTemplate) => void
  products: Product[]
  updateProduct: (product: Product) => Promise<void>
  jobs: Job[]
  updateJob: (job: Job) => void
  projects: Project[]
  updateProject: (project: Project) => void
  convertSurveyToProject: (surveyId: string, masterId: string, applicationDate: string) => Project | undefined
  payments: Payment[]
  updatePayment: (payment: Payment) => void
}

const AppContext = createContext<AppState | undefined>(undefined)

async function functionErrorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : 'Sunucu işlemi tamamlanamadı.'
  const response = (error as { context?: unknown })?.context
  if (!(response instanceof Response)) return fallback
  if (response.status === 404) return 'Kullanıcı oluşturma servisi Supabase üzerinde yayınlanmamış. Yönetici kurulumu tamamlamalıdır.'
  if (response.status === 401) return 'Oturum doğrulanamadı. Çıkış yapıp yeniden giriş yapın.'
  try {
    const payload = await response.clone().json() as { error?: string; message?: string }
    return payload.error ?? payload.message ?? fallback
  } catch {
    return fallback
  }
}

interface CloudRecord {
  entity_type: EntityType
  entity_id: string
  data: unknown
}

const seedCollections: Record<EntityType, Array<{ id: string }>> = {
  customer: seedCustomers,
  survey: seedSurveys,
  template: seedTemplates,
  product: seedProducts,
  job: seedJobs,
  project: seedProjects,
  payment: seedPayments,
}

function mapProfile(row: Record<string, unknown>): AppUser {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    role: row.role as Role,
    active: Boolean(row.active),
    organizationId: String(row.organization_id ?? ''),
    customerId: row.customer_id ? String(row.customer_id) : undefined,
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const organizationId = profile?.organizationId ?? ''
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading')
  const [users, setUsers] = useState<AppUser[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [templates, setTemplates] = useState<SurveyTemplate[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [payments, setPayments] = useState<Payment[]>([])

  const applyRecords = useCallback((records: CloudRecord[]) => {
    const ofType = <T,>(type: EntityType) => records.filter((record) => record.entity_type === type).map((record) => record.data as T)
    setCustomers(ofType<Customer>('customer'))
    setSurveys(ofType<Survey>('survey'))
    setTemplates(ofType<SurveyTemplate>('template'))
    setProducts(ofType<Product>('product'))
    setJobs(ofType<Job>('job'))
    setProjects(ofType<Project>('project'))
    setPayments(ofType<Payment>('payment'))
  }, [])

  const loadCloudData = useCallback(async () => {
    if (!supabase || !organizationId) return
    setSyncStatus('loading')
    try {
      const recordsQuery = supabase.from('app_records').select('entity_type,entity_id,data').eq('organization_id', organizationId)
      const visibleRecordsQuery = profile?.role === 'usta' || profile?.role === 'proje'
        ? recordsQuery.neq('entity_type', 'payment')
        : recordsQuery
      const [recordsResult, profilesResult] = await Promise.all([
        visibleRecordsQuery,
        supabase.from('profiles').select('id,name,phone,email,role,active,organization_id,customer_id').eq('organization_id', organizationId).order('name'),
      ])
      if (recordsResult.error) throw recordsResult.error
      if (profilesResult.error) throw profilesResult.error
      let records = (recordsResult.data ?? []) as CloudRecord[]
      if (records.length === 0 && profile?.role === 'admin') {
        const seedRows = (Object.entries(seedCollections) as [EntityType, Array<{ id: string }>][]).flatMap(([entityType, items]) => items.map((item) => ({ organization_id: organizationId, entity_type: entityType, entity_id: item.id, data: item })))
        const { error } = await supabase.from('app_records').upsert(seedRows)
        if (error) throw error
        records = seedRows.map(({ entity_type, entity_id, data }) => ({ entity_type, entity_id, data }))
      }
      applyRecords(records)
      setUsers((profilesResult.data ?? []).map((row) => mapProfile(row)))
      setSyncStatus('online')
    } catch {
      setSyncStatus('error')
    }
  }, [applyRecords, organizationId, profile?.role])

  useEffect(() => {
    void loadCloudData()
    if (!supabase || !organizationId) return
    const client = supabase
    const channel = client.channel(`organization-${organizationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_records', filter: `organization_id=eq.${organizationId}` }, () => { void loadCloudData() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `organization_id=eq.${organizationId}` }, () => { void loadCloudData() })
      .subscribe()
    return () => { void client.removeChannel(channel) }
  }, [loadCloudData, organizationId])

  const saveRecord = useCallback((entityType: EntityType, entity: { id: string }) => {
    if (!supabase || !organizationId) return
    setSyncStatus('loading')
    void supabase.from('app_records').upsert({ organization_id: organizationId, entity_type: entityType, entity_id: entity.id, data: entity }).then(({ error }) => setSyncStatus(error ? 'error' : 'online'))
  }, [organizationId])

  const saveRecordAndWait = useCallback(async (entityType: EntityType, entity: { id: string }) => {
    if (!supabase || !organizationId) throw new Error('Bulut bağlantısı bulunamadı.')
    setSyncStatus('loading')
    const { error } = await supabase.from('app_records').upsert({ organization_id: organizationId, entity_type: entityType, entity_id: entity.id, data: entity })
    setSyncStatus(error ? 'error' : 'online')
    if (error) throw error
  }, [organizationId])

  const value = useMemo<AppState>(() => ({
    role: profile?.role ?? 'musteri',
    currentUser: profile!,
    syncStatus,
    users,
    addUser: async (user, password) => {
      if (!supabase) throw new Error('Bulut bağlantısı bulunamadı.')
      const { error } = await supabase.functions.invoke('admin-users', { body: { action: 'create', user, password: password || undefined } })
      if (error) throw new Error(await functionErrorMessage(error))
      await loadCloudData()
    },
    updateUser: async (user, password) => {
      if (!supabase) throw new Error('Bulut bağlantısı bulunamadı.')
      const { error } = await supabase.functions.invoke('admin-users', { body: { action: 'update', user, password: password || undefined } })
      if (error) throw new Error(await functionErrorMessage(error))
      await loadCloudData()
    },
    bulkUpsertUsers: async (entries) => {
      if (!supabase) throw new Error('Bulut bağlantısı bulunamadı.')
      const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'bulkUpsert', users: entries } })
      if (error) throw new Error(await functionErrorMessage(error))
      await loadCloudData()
      const results = (data as { results?: Array<Omit<BulkUserResult, 'ok'> & { status?: 'created' | 'updated' | 'error' }> } | null)?.results ?? []
      return results.map((result) => ({ ...result, ok: result.status !== 'error' }))
    },
    resetProjects: async () => {
      if (!supabase) throw new Error('Bulut bağlantısı bulunamadı.')
      const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'resetProjects', confirmation: 'PROJELERİ SIFIRLA' } })
      if (error) throw new Error(await functionErrorMessage(error))
      await loadCloudData()
      const result = data as { deleted?: { projects?: number; jobs?: number }; reset?: { surveys?: number; customers?: number } } | null
      return {
        deletedProjects: result?.deleted?.projects,
        deletedJobs: result?.deleted?.jobs,
        resetSurveys: result?.reset?.surveys,
        resetCustomers: result?.reset?.customers,
      }
    },
    customers,
    addCustomer: (input) => {
      const customer: Customer = { ...input, id: `mus-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10), openProjectCount: 0, balance: 0 }
      setCustomers((current) => [customer, ...current])
      saveRecord('customer', customer)
      return customer
    },
    surveys,
    addSurvey: (survey) => { setSurveys((current) => [survey, ...current]); saveRecord('survey', survey) },
    updateSurvey: (survey) => { setSurveys((current) => current.map((item) => item.id === survey.id ? survey : item)); saveRecord('survey', survey) },
    templates,
    addTemplate: (input) => {
      const template = { ...input, id: `tpl-${Date.now()}`, createdAt: new Date().toISOString() }
      setTemplates((current) => [template, ...current])
      saveRecord('template', template)
    },
    updateTemplate: (template) => { setTemplates((current) => current.map((item) => item.id === template.id ? template : item)); saveRecord('template', template) },
    products,
    updateProduct: async (product) => {
      const previous = products.find((item) => item.id === product.id)
      const next = previous && (previous.cost !== product.cost || previous.sale !== product.sale)
        ? { ...product, priceHistory: [...(previous.priceHistory ?? []), { id: `${product.id}-${Date.now()}`, date: new Date().toISOString().slice(0, 10), cost: product.cost, sale: product.sale }] }
        : product
      setProducts((current) => current.map((item) => item.id === next.id ? next : item))
      try {
        await saveRecordAndWait('product', next)
      } catch (error) {
        if (previous) setProducts((current) => current.map((item) => item.id === previous.id ? previous : item))
        throw error
      }
    },
    jobs,
    updateJob: (job) => { setJobs((current) => current.map((item) => item.id === job.id ? job : item)); saveRecord('job', job) },
    projects,
    updateProject: (project) => { setProjects((current) => current.map((item) => item.id === project.id ? project : item)); saveRecord('project', project) },
    convertSurveyToProject: (surveyId, masterId, applicationDate) => {
      const survey = surveys.find((item) => item.id === surveyId)
      if (!survey) return undefined
      const master = users.find((user) => user.id === masterId)
      const manager = users.find((user) => user.role === 'proje' && user.active)
      const stages = survey.type === 'Doğalgaz' ? gasStages : survey.type === 'Isı Pompası' ? heatPumpStages : survey.type === 'Klima' ? acStages : plumbingStages
      const due = new Date(`${applicationDate}T12:00:00`)
      due.setDate(due.getDate() + 30)
      const template = templates.find((item) => item.id === survey.templateId)
      const materials = (survey.materials ?? buildApproximateMaterials(survey, template, products)).map((material) => ({ ...material }))
      const project: Project = { id: `PRJ-${Date.now()}`, customerId: survey.customerId, surveyId, type: survey.type, createdAt: new Date().toISOString(), currentStage: 0, stages, owner: manager?.name ?? 'Proje Takipçisi', ownerId: manager?.id, dueDate: due.toISOString().slice(0, 10), assignedMasterId: masterId, applicationDate, materialTemplateId: template?.id, siteAddress: survey.siteAddress, siteContactName: survey.siteContactName, siteContactPhone: survey.siteContactPhone, latitude: survey.latitude, longitude: survey.longitude, materials, attachments: [], adminApproved: false }
      const nextSurvey = { ...survey, status: 'Projeye Dönüştü' as const }
      const customer = customers.find((item) => item.id === survey.customerId)
      const nextCustomer = customer ? { ...customer, openProjectCount: customer.openProjectCount + 1 } : undefined
      const job: Job = { id: `IS-${Date.now()}`, customerId: survey.customerId, projectId: project.id, createdAt: new Date().toISOString(), assignedMasterId: masterId, title: `${survey.type} uygulaması`, assignee: master?.name ?? 'Atanmadı', appointment: applicationDate, status: 'Planlandı', siteAddress: survey.siteAddress, siteContactName: survey.siteContactName, siteContactPhone: survey.siteContactPhone, latitude: survey.latitude, longitude: survey.longitude, checklist: materials.map((material) => ({ id: `check-${material.id}`, label: `${material.label} · ${material.quantity} ${material.unit}`, done: false })) }
      setProjects((current) => [project, ...current]); saveRecord('project', project)
      setSurveys((current) => current.map((item) => item.id === surveyId ? nextSurvey : item)); saveRecord('survey', nextSurvey)
      if (nextCustomer) { setCustomers((current) => current.map((item) => item.id === nextCustomer.id ? nextCustomer : item)); saveRecord('customer', nextCustomer) }
      setJobs((current) => [job, ...current]); saveRecord('job', job)
      return project
    },
    payments,
    updatePayment: (payment) => { setPayments((current) => current.map((item) => item.id === payment.id ? payment : item)); saveRecord('payment', payment) },
  }), [customers, jobs, loadCloudData, payments, products, profile, projects, saveRecord, saveRecordAndWait, surveys, syncStatus, templates, users])

  if (syncStatus === 'loading' && products.length === 0) return <div className="cloud-loading"><span /><strong>Şirket verileri eşitleniyor…</strong></div>
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
