import { defaultMaterialTemplates } from '../data'
import type { Product, ProjectMaterial, Survey, SurveyTemplate } from '../types'

export function templateMaterialItems(template?: SurveyTemplate) {
  const items = template?.materialItems ?? (template ? defaultMaterialTemplates[template.id] : undefined) ?? []
  return items.map((item) => ({ ...item }))
}

export function buildApproximateMaterials(survey: Survey | undefined, template: SurveyTemplate | undefined, products: Product[]) {
  const materials: ProjectMaterial[] = templateMaterialItems(template).map((item) => ({
    ...item,
    id: `mat-template-${template?.id ?? 'general'}-${item.id}`,
    prepared: false,
  }))

  const surveyedProducts = new Map<string, { lineId: string; quantity: number }>()
  survey?.lines.forEach((line) => {
    const product = products.find((item) => item.id === line.productId)
    if (product?.group === 'İşçilik') return
    const current = surveyedProducts.get(line.productId)
    surveyedProducts.set(line.productId, { lineId: current?.lineId ?? line.id, quantity: (current?.quantity ?? 0) + line.quantity })
  })

  surveyedProducts.forEach(({ lineId, quantity }, productId) => {
    const product = products.find((item) => item.id === productId)
    const existingIndex = materials.findIndex((item) => item.productId === productId)
    const material: ProjectMaterial = {
      id: `mat-survey-${lineId}`,
      productId,
      label: product ? `${product.name}${product.variant ? ` · ${product.variant}` : ''}` : productId,
      quantity,
      unit: product?.unit ?? 'adet',
      prepared: false,
    }
    if (existingIndex >= 0) materials[existingIndex] = material
    else materials.push(material)
  })

  return materials
}
