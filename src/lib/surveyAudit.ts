import type { Product, Survey, SurveyAuditChange, SurveyAuditEntry } from '../types'

interface AuditContext {
  actorId: string
  actorName: string
  products: Product[]
  customerLabel?: (id: string) => string
  templateLabel?: (id?: string) => string
  workItemLabel?: (key: string) => string
  now?: string
}

const emptyValue = '—'
const text = (value: unknown) => value === undefined || value === null || value === '' ? emptyValue : String(value)
const numberText = (value: number | undefined) => Number.isFinite(value) ? String(value) : emptyValue

function lineLabel(survey: Survey, lineId: string, products: Product[]) {
  const line = survey.lines.find((item) => item.id === lineId)
  if (!line) return emptyValue
  const product = products.find((item) => item.id === line.productId)
  const room = survey.rooms.find((item) => item.id === line.roomId)
  return `${product?.name ?? line.productId}${product?.variant ? ` · ${product.variant}` : ''} · ${line.quantity} ${product?.unit ?? 'adet'}${room ? ` · ${room.name}` : ''}`
}

function materialLabel(survey: Survey, materialId: string) {
  const material = survey.materials?.find((item) => item.id === materialId)
  if (!material) return emptyValue
  return `${material.label} · ${material.quantity} ${material.unit} · ${material.prepared ? 'hazır' : 'bekliyor'}`
}

function attachmentLabel(survey: Survey, attachmentId: string) {
  const attachment = survey.attachments?.find((item) => item.id === attachmentId)
  if (!attachment) return emptyValue
  const description = (attachment.description ?? '').trim()
  return `${attachment.name}${description ? ` · ${description}` : ' · açıklama yok'}`
}

export function createSurveyAuditEntry(before: Survey, after: Survey, context: AuditContext): SurveyAuditEntry | undefined {
  const changes: SurveyAuditChange[] = []
  const add = (field: string, oldValue: unknown, newValue: unknown, kind: SurveyAuditChange['kind'] = 'field') => {
    const previous = text(oldValue)
    const next = text(newValue)
    if (previous !== next) changes.push({ field, before: previous, after: next, kind })
  }

  add('Müşteri', context.customerLabel?.(before.customerId) ?? before.customerId, context.customerLabel?.(after.customerId) ?? after.customerId)
  add('Keşif türü', before.type, after.type, 'selection')
  add('Durum', before.status, after.status, 'selection')
  add('Şablon', context.templateLabel?.(before.templateId) ?? before.templateId, context.templateLabel?.(after.templateId) ?? after.templateId, 'selection')
  add('Uygulama adresi', before.siteAddress, after.siteAddress)
  add('İletişim kişisi', before.siteContactName, after.siteContactName)
  add('İletişim telefonu', before.siteContactPhone, after.siteContactPhone)
  add('Enlem', numberText(before.latitude), numberText(after.latitude))
  add('Boylam', numberText(before.longitude), numberText(after.longitude))

  const workItems = (survey: Survey) => [...(survey.workItemKeys ?? [])]
    .map((key) => context.workItemLabel?.(key) ?? key)
    .sort((a, b) => a.localeCompare(b, 'tr-TR'))
    .join(', ') || emptyValue
  add('Yapılacak işler', workItems(before), workItems(after), 'selection')

  const roomIds = new Set([...before.rooms.map((room) => room.id), ...after.rooms.map((room) => room.id)])
  roomIds.forEach((roomId) => {
    const oldRoom = before.rooms.find((room) => room.id === roomId)
    const newRoom = after.rooms.find((room) => room.id === roomId)
    const label = newRoom?.name ?? oldRoom?.name ?? roomId
    if (!oldRoom || !newRoom) {
      add(`Oda: ${label}`, oldRoom?.name, newRoom?.name, 'selection')
      return
    }
    add(`Oda adı: ${label}`, oldRoom.name, newRoom.name)
    add(`Radyatör adedi: ${label}`, oldRoom.radiatorQuantity ?? 0, newRoom.radiatorQuantity ?? 0, 'selection')
  })

  const lineIds = new Set([...before.lines.map((line) => line.id), ...after.lines.map((line) => line.id)])
  lineIds.forEach((lineId) => add('Ürün kalemi', lineLabel(before, lineId, context.products), lineLabel(after, lineId, context.products), 'selection'))

  const materialIds = new Set([...(before.materials ?? []).map((item) => item.id), ...(after.materials ?? []).map((item) => item.id)])
  materialIds.forEach((materialId) => add('Malzeme kalemi', materialLabel(before, materialId), materialLabel(after, materialId), 'selection'))

  const attachmentIds = new Set([...(before.attachments ?? []).map((item) => item.id), ...(after.attachments ?? []).map((item) => item.id)])
  attachmentIds.forEach((attachmentId) => add('Keşif fotoğrafı', attachmentLabel(before, attachmentId), attachmentLabel(after, attachmentId), 'selection'))

  if (before.total !== after.total) changes.push({ field: 'Teklif fiyatı', before: String(before.total), after: String(after.total), kind: 'price' })
  if (changes.length === 0) return undefined

  const createdAt = context.now ?? new Date().toISOString()
  return {
    id: `survey-audit-${Date.parse(createdAt) || Date.now()}-${before.auditLog?.length ?? 0}`,
    createdAt,
    actorId: context.actorId,
    actorName: context.actorName,
    changes,
  }
}
