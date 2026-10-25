import { describe, expect, it } from 'vitest'
import { buildApproximateMaterials } from './materials'
import type { Product, Survey, SurveyTemplate } from '../types'

describe('material preparation', () => {
  it('combines approximate template items with surveyed products', () => {
    const template: SurveyTemplate = {
      id: 'tpl-test',
      name: 'Test şablonu',
      type: 'Doğalgaz',
      workItemKeys: ['kombi'],
      materialItems: [{ id: 'connection', label: 'Bağlantı seti', quantity: 1, unit: 'set' }],
    }
    const survey: Survey = {
      id: 'survey-1', customerId: 'customer-1', type: 'Doğalgaz', status: 'Onaylandı', rooms: [],
      lines: [{ id: 'line-1', roomId: '', productId: 'boiler-1', quantity: 1 }], total: 0,
      createdAt: '2026-10-25', owner: 'Yönetici',
    }
    const products: Product[] = [{ id: 'boiler-1', code: 'K-1', name: 'Kombi', category: 'Doğalgaz', unit: 'adet', cost: 1, sale: 2, group: 'Kombi', variant: '24 kW' }]
    const result = buildApproximateMaterials(survey, template, products)
    expect(result.map((item) => item.label)).toEqual(['Bağlantı seti', 'Kombi · 24 kW'])
    expect(result.every((item) => item.prepared === false)).toBe(true)
  })
})
