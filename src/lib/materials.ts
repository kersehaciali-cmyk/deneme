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

  survey?.lines.forEach((line) => {
    const product = products.find((item) => item.id === line.productId)
    if (product?.group === 'İşçilik') return
    const existingIndex = materials.findIndex((item) => item.productId === line.productId)
    const material: ProjectMaterial = {
      id: `mat-survey-${line.id}`,
      productId: line.productId,
      label: product ? `${product.name}${product.variant ? ` · ${product.variant}` : ''}` : line.productId,
      quantity: line.quantity,
      unit: product?.unit ?? 'adet',
      prepared: false,
    }
    if (existingIndex >= 0) materials[existingIndex] = material
    else materials.push(material)
  })

  return materials
}
