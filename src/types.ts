export type Role = 'admin' | 'usta' | 'proje' | 'musteri'
export type PageKey = 'dashboard' | 'customers' | 'surveys' | 'jobs' | 'projects' | 'payments' | 'catalog' | 'reports'
export type SurveyType = 'Doğalgaz' | 'Sıhhi Tesisat' | 'Isı Pompası'

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
  width: number
  length: number
}

export interface SurveyLine {
  id: string
  roomId: string
  productId: string
  quantity: number
}

export interface Survey {
  id: string
  customerId: string
  type: SurveyType
  status: 'Taslak' | 'Fiyatlandırıldı' | 'Teklif Gönderildi' | 'Onaylandı'
  rooms: Room[]
  lines: SurveyLine[]
  total: number
  createdAt: string
  owner: string
}

export interface Product {
  id: string
  code: string
  name: string
  category: SurveyType | 'Genel'
  unit: string
  cost: number
  sale: number
}

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface Job {
  id: string
  customerId: string
  title: string
  assignee: string
  appointment: string
  status: 'Planlandı' | 'Hazırlanıyor' | 'Hazır' | 'Yolda' | 'Başladı' | 'Tamamlandı'
  checklist: ChecklistItem[]
}

export interface Project {
  id: string
  customerId: string
  type: SurveyType
  currentStage: number
  stages: string[]
  owner: string
  dueDate: string
}

export interface Payment {
  id: string
  customerId: string
  description: string
  amount: number
  paid: number
  dueDate: string
  status: 'Ödendi' | 'Kısmi' | 'Bekliyor' | 'Gecikti'
}
