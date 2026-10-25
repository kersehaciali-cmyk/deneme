import { describe, expect, it } from 'vitest'
import { calculateSurveyTotals, canAccess, canViewPrices, directionsUrl, isProjectClosed, projectProgress, sortNewestFirst, sortProjectsNewestFirst } from './domain'
import type { Product, Project, SurveyLine } from '../types'

const products: Product[] = [
  { id: 'p1', code: 'P1', name: 'Boru', category: 'Doğalgaz', unit: 'm', cost: 100, sale: 160 },
  { id: 'p2', code: 'P2', name: 'Vana', category: 'Doğalgaz', unit: 'adet', cost: 200, sale: 300 },
]

describe('domain rules', () => {
  it('calculates cost and sale totals from current catalog', () => {
    const lines: SurveyLine[] = [
      { id: 'l1', roomId: 'r1', productId: 'p1', quantity: 10 },
      { id: 'l2', roomId: 'r1', productId: 'p2', quantity: 2 },
    ]
    expect(calculateSurveyTotals(lines, products)).toEqual({ cost: 1400, sale: 2200 })
  })

  it('keeps the price captured when the survey was prepared', () => {
    const lines: SurveyLine[] = [
      { id: 'l1', roomId: 'r1', productId: 'p1', quantity: 2, unitCost: 90, unitSale: 140 },
    ]
    expect(calculateSurveyTotals(lines, products)).toEqual({ cost: 180, sale: 280 })
  })

  it('keeps customer away from administrative pages', () => {
    expect(canAccess('musteri', 'catalog')).toBe(false)
    expect(canAccess('admin', 'catalog')).toBe(true)
    expect(canAccess('admin', 'users')).toBe(true)
    expect(canAccess('usta', 'users')).toBe(false)
    expect(canAccess('usta', 'projects')).toBe(true)
    expect(canAccess('proje', 'payments')).toBe(false)
  })

  it('shows financial values only to administrators and customers', () => {
    expect(canViewPrices('admin')).toBe(true)
    expect(canViewPrices('musteri')).toBe(true)
    expect(canViewPrices('proje')).toBe(false)
    expect(canViewPrices('usta')).toBe(false)
  })

  it('calculates stage progress', () => {
    expect(projectProgress(3, 7)).toBe(50)
  })

  it('separates open and closed projects and sorts them newest first', () => {
    const base = { customerId: 'c1', type: 'Doğalgaz' as const, stages: ['Planlandı', 'Tamamlandı'], owner: 'Takipçi', dueDate: '2026-11-01' }
    const projects: Project[] = [
      { ...base, id: 'PRJ-101', createdAt: '2026-10-20', currentStage: 0 },
      { ...base, id: 'PRJ-102', createdAt: '2026-10-24', currentStage: 1 },
    ]
    expect(isProjectClosed(projects[0])).toBe(false)
    expect(isProjectClosed(projects[1])).toBe(true)
    expect(sortProjectsNewestFirst(projects).map((project) => project.id)).toEqual(['PRJ-102', 'PRJ-101'])
    expect(sortNewestFirst([{ id: 'KSF-9', createdAt: '2026-10-20' }, { id: 'KSF-10', createdAt: '2026-10-25' }]).map((item) => item.id)).toEqual(['KSF-10', 'KSF-9'])
  })

  it('builds directions from coordinates and falls back to the site address', () => {
    expect(directionsUrl(39.7767, 30.5206, 'Yedek adres')).toContain('39.7767%2C30.5206')
    expect(directionsUrl(undefined, undefined, 'Gül Sokak No: 7')).toContain('G%C3%BCl%20Sokak%20No%3A%207')
    expect(directionsUrl()).toBeUndefined()
  })
})
