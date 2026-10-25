import type { Product, Room, Survey, SurveyLine, SurveyType } from '../types'

export interface SurveyCopyDraft {
  type: SurveyType
  templateId: string
  workItemKeys: string[]
  rooms: Room[]
  lines: SurveyLine[]
  boilerProductId?: string
  heatPumpProductId?: string
  acProductId?: string
  defaultRadiatorBrand?: string
}

/**
 * Copies only reusable discovery selections. Customer, address, location,
 * photos, status, prices and record identity deliberately remain outside the
 * returned draft so a copied discovery is always saved as a fresh record.
 */
export function createSurveyCopyDraft(source: Survey, products: Product[]): SurveyCopyDraft {
  const roomIdMap = new Map<string, string>()
  const rooms = source.rooms.map((room, index) => {
    const id = `room-copy-${Date.now()}-${index + 1}`
    roomIdMap.set(room.id, id)
    const radiatorLine = source.lines.find((line) => line.roomId === room.id && line.productId === room.radiatorProductId)
    return { ...room, id, radiatorQuantity: room.radiatorQuantity ?? radiatorLine?.quantity ?? 0 }
  })
  const productFor = (line: SurveyLine) => products.find((product) => product.id === line.productId)
  const boilerLine = source.lines.find((line) => productFor(line)?.group === 'Kombi')
  const heatPumpLine = source.lines.find((line) => productFor(line)?.group === 'Isı Pompası')
  const acLine = source.lines.find((line) => productFor(line)?.group === 'Klima')
  const firstRadiator = source.lines.find((line) => productFor(line)?.group === 'Radyatör')
  const generatedGroups = new Set(['Kombi', 'Radyatör', 'Isı Pompası', 'Klima'])
  const lines = source.lines
    .filter((line) => !generatedGroups.has(productFor(line)?.group ?? ''))
    .map((line, index) => ({
      id: `line-copy-${Date.now()}-${index + 1}`,
      roomId: roomIdMap.get(line.roomId) ?? rooms[0]?.id ?? '',
      productId: line.productId,
      quantity: line.quantity,
    }))

  return {
    type: source.type,
    templateId: source.templateId ?? '',
    workItemKeys: [...(source.workItemKeys ?? [])],
    rooms,
    lines,
    boilerProductId: boilerLine?.productId,
    heatPumpProductId: heatPumpLine?.productId,
    acProductId: acLine?.productId,
    defaultRadiatorBrand: firstRadiator ? productFor(firstRadiator)?.brand : undefined,
  }
}
