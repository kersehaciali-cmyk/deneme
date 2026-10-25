import { describe, expect, it } from 'vitest'
import { createSurveyAuditEntry } from './surveyAudit'
import type { Product, Survey } from '../types'

const products: Product[] = [
  { id: 'pipe', code: 'P-1', name: 'Boru', category: 'Doğalgaz', unit: 'metre', cost: 50, sale: 100, group: 'Malzeme' },
]

const survey: Survey = {
  id: 'KSF-1', customerId: 'customer-1', type: 'Doğalgaz', status: 'Taslak',
  rooms: [{ id: 'room-1', name: 'Mutfak' }],
  lines: [{ id: 'line-1', roomId: 'room-1', productId: 'pipe', quantity: 5, unitCost: 50, unitSale: 100 }],
  workItemKeys: ['boru-dg'], total: 500, createdAt: '2026-10-25T10:00:00.000Z', owner: 'Usta',
}

describe('survey audit trail', () => {
  it('records the actor, changed quantity and price transition', () => {
    const next: Survey = { ...survey, status: 'Fiyatlandırıldı', total: 800, lines: [{ ...survey.lines[0], quantity: 8 }] }
    const entry = createSurveyAuditEntry(survey, next, {
      actorId: 'admin-1', actorName: 'Yönetici', products,
      workItemLabel: (key) => key, now: '2026-10-25T12:00:00.000Z',
    })

    expect(entry).toMatchObject({ actorId: 'admin-1', actorName: 'Yönetici', createdAt: '2026-10-25T12:00:00.000Z' })
    expect(entry?.changes).toContainEqual(expect.objectContaining({ field: 'Durum', before: 'Taslak', after: 'Fiyatlandırıldı' }))
    expect(entry?.changes).toContainEqual(expect.objectContaining({ field: 'Ürün kalemi', before: expect.stringContaining('5 metre'), after: expect.stringContaining('8 metre') }))
    expect(entry?.changes).toContainEqual({ field: 'Teklif fiyatı', before: '500', after: '800', kind: 'price' })
  })

  it('does not create a log entry when nothing changed', () => {
    expect(createSurveyAuditEntry(survey, { ...survey }, { actorId: 'admin-1', actorName: 'Yönetici', products })).toBeUndefined()
  })

  it('records material checklist and survey photo changes', () => {
    const before: Survey = {
      ...survey,
      materials: [{ id: 'material-1', label: 'Dirsek', quantity: 2, unit: 'adet', prepared: false }],
      attachments: [{ id: 'photo-1', name: 'mutfak.jpg', url: 'blob:old', description: '', addedBy: 'Usta', createdAt: '2026-10-25T10:00:00.000Z' }],
    }
    const after: Survey = {
      ...before,
      materials: [{ ...before.materials![0], quantity: 3, prepared: true }],
      attachments: [{ ...before.attachments![0], description: 'Kombi bağlantı noktası' }],
    }
    const entry = createSurveyAuditEntry(before, after, { actorId: 'admin-1', actorName: 'Yönetici', products })

    expect(entry?.changes).toContainEqual(expect.objectContaining({
      field: 'Malzeme kalemi', before: 'Dirsek · 2 adet · bekliyor', after: 'Dirsek · 3 adet · hazır',
    }))
    expect(entry?.changes).toContainEqual(expect.objectContaining({
      field: 'Keşif fotoğrafı', before: 'mutfak.jpg · açıklama yok', after: 'mutfak.jpg · Kombi bağlantı noktası',
    }))
  })
})
