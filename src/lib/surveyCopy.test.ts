import { describe, expect, it, vi } from 'vitest'
import { createSurveyCopyDraft } from './surveyCopy'
import type { Product, Survey } from '../types'

describe('survey copy', () => {
  it('copies reusable choices but remaps rooms and drops snapshot prices', () => {
    vi.spyOn(Date, 'now').mockReturnValue(42)
    const products = [
      { id: 'radiator', code: 'R', name: 'Radyatör', category: 'Doğalgaz', unit: 'adet', cost: 1, sale: 2, group: 'Radyatör', brand: 'Test' },
      { id: 'pipe', code: 'P', name: 'Boru', category: 'Doğalgaz', unit: 'metre', cost: 1, sale: 2, group: 'Malzeme' },
    ] satisfies Product[]
    const source = {
      id: 'KSF-1', customerId: 'customer-a', type: 'Doğalgaz', status: 'Fiyatlandırıldı', templateId: 'tpl-1', workItemKeys: ['radyator-dg'],
      rooms: [{ id: 'old-room', name: 'Mutfak', radiatorProductId: 'radiator', radiatorQuantity: 2 }],
      lines: [
        { id: 'rad-line', roomId: 'old-room', productId: 'radiator', quantity: 2, unitCost: 10, unitSale: 20 },
        { id: 'pipe-line', roomId: 'old-room', productId: 'pipe', quantity: 5, unitCost: 3, unitSale: 6 },
      ],
      total: 70, createdAt: '2026-10-25', owner: 'Eski Kullanıcı', siteAddress: 'Eski adres', attachments: [],
    } satisfies Survey

    const copy = createSurveyCopyDraft(source, products)

    expect(copy.rooms[0]).toMatchObject({ id: 'room-copy-42-1', name: 'Mutfak', radiatorQuantity: 2 })
    expect(copy.lines).toEqual([{ id: 'line-copy-42-1', roomId: 'room-copy-42-1', productId: 'pipe', quantity: 5 }])
    expect(copy.defaultRadiatorBrand).toBe('Test')
    expect(copy).not.toHaveProperty('customerId')
    expect(copy).not.toHaveProperty('siteAddress')
  })

  it('keeps radiator quantity from an older survey line when the room has no quantity field', () => {
    vi.spyOn(Date, 'now').mockReturnValue(84)
    const products = [
      { id: 'radiator', code: 'R', name: 'Radyatör', category: 'Doğalgaz', unit: 'adet', cost: 1, sale: 2, group: 'Radyatör', brand: 'Test' },
    ] satisfies Product[]
    const source = {
      id: 'KSF-2', customerId: 'customer-a', type: 'Doğalgaz', status: 'Fiyatlandırıldı', workItemKeys: ['radyator-dg'],
      rooms: [{ id: 'old-room', name: 'Salon', radiatorProductId: 'radiator' }],
      lines: [{ id: 'rad-line', roomId: 'old-room', productId: 'radiator', quantity: 3 }],
      total: 6, createdAt: '2026-10-25', owner: 'Eski Kullanıcı',
    } satisfies Survey

    expect(createSurveyCopyDraft(source, products).rooms[0].radiatorQuantity).toBe(3)
  })
})
