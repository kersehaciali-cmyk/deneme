import type { PageKey, Product, Project, Role, SurveyLine } from '../types'

const permissions: Record<Role, PageKey[]> = {
  admin: ['dashboard', 'users', 'customers', 'surveys', 'jobs', 'projects', 'payments', 'catalog', 'reports'],
  usta: ['dashboard', 'customers', 'surveys', 'jobs', 'projects'],
  proje: ['dashboard', 'customers', 'surveys', 'jobs', 'projects'],
  musteri: ['dashboard', 'projects', 'payments'],
}

export function canAccess(role: Role, page: PageKey) {
  return permissions[role].includes(page)
}

export function canViewPrices(role: Role) {
  return role === 'admin' || role === 'musteri'
}

export function calculateSurveyTotals(lines: SurveyLine[], products: Product[]) {
  return lines.reduce(
    (totals, line) => {
      const product = products.find((item) => item.id === line.productId)
      const unitCost = line.unitCost ?? product?.cost
      const unitSale = line.unitSale ?? product?.sale
      if (unitCost === undefined || unitSale === undefined) return totals
      totals.cost += unitCost * line.quantity
      totals.sale += unitSale * line.quantity
      return totals
    },
    { cost: 0, sale: 0 },
  )
}

export function projectProgress(currentStage: number, stageCount: number) {
  if (stageCount <= 1) return 100
  return Math.round((currentStage / (stageCount - 1)) * 100)
}

export function isProjectClosed(project: Project) {
  return project.currentStage >= project.stages.length - 1
}

export function sortProjectsNewestFirst(projects: Project[]) {
  return sortNewestFirst(projects)
}

export function sortNewestFirst<T extends { id: string; createdAt?: string }>(items: T[]) {
  const order = (item: T) => {
    if (item.createdAt) {
      const timestamp = Date.parse(item.createdAt.includes('T') ? item.createdAt : `${item.createdAt}T12:00:00`)
      if (Number.isFinite(timestamp)) return timestamp
    }
    const numericId = item.id.match(/\d+/g)?.join('')
    return Number(numericId ?? 0)
  }
  return [...items].sort((a, b) => order(b) - order(a))
}

export function directionsUrl(latitude?: number, longitude?: number, address?: string) {
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude)
  const destination = hasCoordinates ? `${latitude},${longitude}` : address?.trim()
  return destination ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}` : undefined
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
}

export function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('tr-TR')
}
