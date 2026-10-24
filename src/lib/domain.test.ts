import { describe, expect, it } from 'vitest'
import { calculateSurveyTotals, canAccess, projectProgress } from './domain'
import type { Product, SurveyLine } from '../types'

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

  it('keeps customer away from administrative pages', () => {
    expect(canAccess('musteri', 'catalog')).toBe(false)
    expect(canAccess('admin', 'catalog')).toBe(true)
    expect(canAccess('admin', 'users')).toBe(true)
    expect(canAccess('usta', 'users')).toBe(false)
    expect(canAccess('usta', 'projects')).toBe(true)
  })

  it('calculates stage progress', () => {
    expect(projectProgress(3, 7)).toBe(50)
  })
})
