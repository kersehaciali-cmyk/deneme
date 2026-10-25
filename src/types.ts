export type Role = 'admin' | 'usta' | 'proje' | 'musteri'
export type PageKey = 'dashboard' | 'users' | 'customers' | 'surveys' | 'jobs' | 'projects' | 'payments' | 'catalog' | 'reports'
export type SurveyType = 'Doğalgaz' | 'Sıhhi Tesisat' | 'Isı Pompası' | 'Klima'
export type SurveyStatus = 'Taslak' | 'Fiyatlandırıldı' | 'Teklif Gönderildi' | 'Kabul Edildi' | 'Onaylandı' | 'Siparişe Alındı' | 'Projeye Dönüştü' | 'Reddedildi'

export interface AppUser {
  id: string
  name: string
  phone: string
  email: string
  role: Role
  active: boolean
  organizationId?: string
  customerId?: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  address: string
  district: string
  createdAt: string
  openProjectCount: number
  balance: number
}

export interface Room {
  id: string
  name: string
  radiatorProductId?: string
  radiatorQuantity?: number
}

export interface SurveyLine {
  id: string
  roomId: string
  productId: string
  quantity: number
  unitCost?: number
  unitSale?: number
}

export interface Survey {
  id: string
  customerId: string
  type: SurveyType
  status: SurveyStatus
  rooms: Room[]
  lines: SurveyLine[]
  templateId?: string
  workItemKeys?: string[]
  total: number
  createdAt: string
  owner: string
  siteAddress?: string
  siteContactName?: string
  siteContactPhone?: string
  latitude?: number
  longitude?: number
  attachments?: SurveyAttachment[]
  materials?: ProjectMaterial[]
}

export interface SurveyAttachment {
  id: string
  name: string
  url: string
  description: string
  addedBy: string
  createdAt: string
}

export interface Product {
  id: string
  code: string
  name: string
  category: SurveyType | 'Genel'
  unit: string
  cost: number
  sale: number
  group?: 'Kombi' | 'Radyatör' | 'Isı Pompası' | 'Klima' | 'Malzeme' | 'İşçilik'
  brand?: string
  variant?: string
  priceHistory?: PriceHistoryEntry[]
}

export interface PriceHistoryEntry {
  id: string
  date: string
  cost: number
  sale: number
}

export interface SurveyTemplate {
  id: string
  name: string
  type: SurveyType
  workItemKeys: string[]
  materialItems?: MaterialTemplateItem[]
  createdAt?: string
}

export interface MaterialTemplateItem {
  id: string
  productId?: string
  label: string
  quantity: number
  unit: string
}

export interface WorkItemDefinition {
  key: string
  label: string
  type: SurveyType
  description: string
}

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface Job {
  id: string
  customerId: string
  projectId?: string
  createdAt?: string
  assignedMasterId?: string
  title: string
  assignee: string
  appointment: string
  status: 'Planlandı' | 'Hazırlanıyor' | 'Hazır' | 'Yolda' | 'Başladı' | 'Tamamlandı'
  checklist: ChecklistItem[]
  siteAddress?: string
  siteContactName?: string
  siteContactPhone?: string
  latitude?: number
  longitude?: number
}

export interface Project {
  id: string
  customerId: string
  type: SurveyType
  createdAt?: string
  currentStage: number
  stages: string[]
  owner: string
  ownerId?: string
  dueDate: string
  surveyId?: string
  assignedMasterId?: string
  applicationDate?: string
  materialTemplateId?: string
  materials?: ProjectMaterial[]
  attachments?: ProjectAttachment[]
  adminApproved?: boolean
  siteAddress?: string
  siteContactName?: string
  siteContactPhone?: string
  latitude?: number
  longitude?: number
}

export interface ProjectMaterial {
  id: string
  productId?: string
  label: string
  quantity: number
  unit: string
  prepared: boolean
}

export interface ProjectAttachment {
  id: string
  name: string
  type: 'image' | 'video'
  url: string
  addedBy: string
  createdAt: string
  approved: boolean
  description?: string
  adminComment?: string
}

export interface Payment {
  id: string
  customerId: string
  createdAt?: string
  description: string
  amount: number
  paid: number
  dueDate: string
  status: 'Ödendi' | 'Kısmi' | 'Bekliyor' | 'Gecikti'
}
