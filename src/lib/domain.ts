import type { PageKey, Product, Role, SurveyLine } from '../types'

const permissions: Record<Role, PageKey[]> = {
  admin: ['dashboard', 'users', 'customers', 'surveys', 'jobs', 'projects', 'payments', 'catalog', 'reports'],
  usta: ['dashboard', 'customers', 'surveys', 'jobs', 'projects'],
  proje: ['dashboard', 'customers', 'surveys', 'jobs', 'projects', 'payments'],
  musteri: ['dashboard', 'projects', 'payments'],
}

export function canAccess(role: Role, page: PageKey) {
  return permissions[role].includes(page)
}

export function calculateSurveyTotals(lines: SurveyLine[], products: Product[]) {
  return lines.reduce(
    (totals, line) => {
      const product = products.find((item) => item.id === line.productId)
      if (!product) return totals
      totals.cost += product.cost * line.quantity
      totals.sale += product.sale * line.quantity
      return totals
    },
    { cost: 0, sale: 0 },
  )
}

export function projectProgress(currentStage: number, stageCount: number) {
  if (stageCount <= 1) return 100
  return Math.round((currentStage / (stageCount - 1)) * 100)
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
