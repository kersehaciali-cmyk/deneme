import type { Product, Survey, SurveyLine } from '../types'

const linePricingSignature = (lines: SurveyLine[]) => JSON.stringify([...lines]
  .sort((a, b) => a.id.localeCompare(b.id))
  .map(({ id, productId, quantity }) => ({ id, productId, quantity })))
const lineTechnicalSignature = (lines: SurveyLine[]) => JSON.stringify([...lines]
  .sort((a, b) => a.id.localeCompare(b.id))
  .map(({ id, productId, roomId, quantity }) => ({ id, productId, roomId, quantity })))
const keySignature = (keys?: string[]) => [...(keys ?? [])].sort().join('|')

export function hasSurveyPricingChanges(before: Survey, draft: Survey) {
  return linePricingSignature(before.lines) !== linePricingSignature(draft.lines)
}

export function hasSurveyTechnicalChanges(before: Survey, draft: Survey) {
  return lineTechnicalSignature(before.lines) !== lineTechnicalSignature(draft.lines)
    || before.type !== draft.type
    || before.templateId !== draft.templateId
    || keySignature(before.workItemKeys) !== keySignature(draft.workItemKeys)
}

// The room attached to a line is useful technical/audit information, but it
// does not change which materials or how many of them are required. Keeping
// this separate prevents a simple room move from wiping a manually adjusted
// material checklist.
export function hasSurveyMaterialChanges(before: Survey, draft: Survey) {
  return linePricingSignature(before.lines) !== linePricingSignature(draft.lines)
    || before.type !== draft.type
    || before.templateId !== draft.templateId
    || keySignature(before.workItemKeys) !== keySignature(draft.workItemKeys)
}

export function applySurveyPricing(before: Survey, draft: Survey, products: Product[]) {
  if (!hasSurveyPricingChanges(before, draft)) {
    return { lines: draft.lines.map((line) => ({ ...line })), total: before.total }
  }
  const lines = draft.lines.map((line) => {
    const product = products.find((item) => item.id === line.productId)
    return {
      ...line,
      quantity: Math.max(0, line.quantity),
      unitCost: product?.cost ?? line.unitCost,
      unitSale: product?.sale ?? line.unitSale,
    }
  })
  return { lines, total: lines.reduce((sum, line) => sum + (line.unitSale ?? 0) * line.quantity, 0) }
}
