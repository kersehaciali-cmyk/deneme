import { describe, expect, it } from 'vitest'
import { applySurveyPricing, hasSurveyMaterialChanges, hasSurveyTechnicalChanges } from './surveyEdit'
import type { Product, Survey } from '../types'

const products: Product[] = [{ id: 'p1', code: 'P1', name: 'Boru', category: 'Doğalgaz', unit: 'metre', cost: 70, sale: 140 }]
const original: Survey = {
  id: 'KSF-1', customerId: 'c1', type: 'Doğalgaz', status: 'Fiyatlandırıldı', rooms: [],
  lines: [{ id: 'l1', roomId: '', productId: 'p1', quantity: 2, unitCost: 50, unitSale: 100 }],
  workItemKeys: ['boru-dg'], templateId: 'tpl-1', total: 200, createdAt: '2026-10-25', owner: 'Admin',
}

describe('survey edit pricing', () => {
  it('preserves captured prices when only address or contact changes', () => {
    const draft = { ...original, siteAddress: 'Yeni adres', siteContactName: 'Yeni kişi' }
    expect(applySurveyPricing(original, draft, products)).toEqual({ lines: original.lines, total: 200 })
    expect(hasSurveyTechnicalChanges(original, draft)).toBe(false)
    expect(hasSurveyMaterialChanges(original, draft)).toBe(false)
  })

  it('uses current catalog prices when a product quantity changes', () => {
    const draft = { ...original, lines: [{ ...original.lines[0], quantity: 3 }] }
    expect(applySurveyPricing(original, draft, products)).toEqual({
      lines: [{ ...draft.lines[0], unitCost: 70, unitSale: 140 }],
      total: 420,
    })
    expect(hasSurveyTechnicalChanges(original, draft)).toBe(true)
    expect(hasSurveyMaterialChanges(original, draft)).toBe(true)
  })

  it('keeps the captured price when only a line is moved to another room', () => {
    const draft = { ...original, lines: [{ ...original.lines[0], roomId: 'room-2' }] }
    expect(applySurveyPricing(original, draft, products)).toEqual({ lines: draft.lines, total: 200 })
    expect(hasSurveyTechnicalChanges(original, draft)).toBe(true)
    expect(hasSurveyMaterialChanges(original, draft)).toBe(false)
  })

  it('rebuilds materials when the survey type or template changes', () => {
    const draft = { ...original, type: 'Klima' as const, templateId: 'tpl-klima', workItemKeys: ['klima'] }
    expect(hasSurveyMaterialChanges(original, draft)).toBe(true)
  })
})
