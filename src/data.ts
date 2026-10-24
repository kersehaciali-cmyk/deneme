import type { Customer, Job, Payment, Product, Project, Survey } from './types'

export const seedCustomers: Customer[] = [
  {
    id: 'mus-001',
    name: 'Ayşe Yılmaz',
    phone: '0532 444 12 18',
    address: 'Yenibağlar Mah. Üniversite Cad. No: 18/6',
    district: 'Tepebaşı',
    createdAt: '2026-10-03',
    openProjectCount: 1,
    balance: 48500,
  },
  {
    id: 'mus-002',
    name: 'Murat Demir',
    phone: '0544 226 31 90',
    address: 'Vişnelik Mah. Gül Sok. No: 7',
    district: 'Odunpazarı',
    createdAt: '2026-10-11',
    openProjectCount: 1,
    balance: 18750,
  },
  {
    id: 'mus-003',
    name: 'Elif Kaya',
    phone: '0507 820 44 26',
    address: 'Batıkent Mah. Çevre Yolu No: 104',
    district: 'Tepebaşı',
    createdAt: '2026-10-18',
    openProjectCount: 0,
    balance: 0,
  },
  {
    id: 'mus-004',
    name: 'Hasan Acar',
    phone: '0536 115 72 02',
    address: 'Ihlamurkent Mah. Plevne Cad. No: 21/3',
    district: 'Odunpazarı',
    createdAt: '2026-10-21',
    openProjectCount: 1,
    balance: 92300,
  },
]

const boilerProducts: Product[] = [
  { id: 'kmb-dd-24', code: 'KMB-DD-24', name: 'Nitromix Yoğuşmalı Kombi', brand: 'Demirdöküm', variant: '24 kW', cost: 28600, sale: 34900 },
  { id: 'kmb-eca-24', code: 'KMB-ECA-24', name: 'Proteus Premix Kombi', brand: 'E.C.A.', variant: '24 kW', cost: 27400, sale: 33750 },
  { id: 'kmb-bym-24', code: 'KMB-BYM-24', name: 'Duotec Compact Kombi', brand: 'Baymak', variant: '24 kW', cost: 26300, sale: 32900 },
  { id: 'kmb-bos-28', code: 'KMB-BOS-28', name: 'Condens Kombi', brand: 'Bosch', variant: '28 kW', cost: 32400, sale: 39900 },
  { id: 'kmb-vai-24', code: 'KMB-VAI-24', name: 'ecoTEC Intro Kombi', brand: 'Vaillant', variant: '24 kW', cost: 34800, sale: 42600 },
  { id: 'kmb-vie-25', code: 'KMB-VIE-25', name: 'Vitodens Kombi', brand: 'Viessmann', variant: '25 kW', cost: 35900, sale: 43900 },
].map((product) => ({ ...product, category: 'Doğalgaz', unit: 'adet', group: 'Kombi' }))

const radiatorBrands = [
  { brand: 'Demirdöküm', costFactor: 1.08, saleFactor: 1.1 },
  { brand: 'E.C.A.', costFactor: 1, saleFactor: 1.03 },
  { brand: 'Baymak', costFactor: .96, saleFactor: 1 },
  { brand: 'Termoteknik', costFactor: .91, saleFactor: .94 },
]
const radiatorSizes = [
  { variant: '600 × 600 mm', baseCost: 1650, baseSale: 2350 },
  { variant: '600 × 800 mm', baseCost: 2100, baseSale: 2950 },
  { variant: '600 × 1000 mm', baseCost: 2580, baseSale: 3590 },
  { variant: '600 × 1200 mm', baseCost: 3050, baseSale: 4290 },
  { variant: '600 × 1400 mm', baseCost: 3520, baseSale: 4950 },
  { variant: '600 × 1600 mm', baseCost: 3990, baseSale: 5590 },
]
const radiatorProducts: Product[] = radiatorBrands.flatMap((brand, brandIndex) => radiatorSizes.map((size, sizeIndex) => ({
  id: `rad-${brandIndex + 1}-${sizeIndex + 1}`,
  code: `RAD-${brandIndex + 1}-${sizeIndex + 1}`,
  name: `${brand.brand} Panel Radyatör`,
  category: 'Doğalgaz' as const,
  unit: 'adet',
  cost: Math.round(size.baseCost * brand.costFactor),
  sale: Math.round(size.baseSale * brand.saleFactor),
  group: 'Radyatör' as const,
  brand: brand.brand,
  variant: size.variant,
})))

export const seedProducts: Product[] = [
  ...boilerProducts,
  ...radiatorProducts,
  { id: 'prd-03', code: 'DG-BR', name: 'Doğalgaz Borusu', category: 'Doğalgaz', unit: 'metre', cost: 185, sale: 320, group: 'Malzeme' },
  { id: 'prd-04', code: 'VANA-34', name: 'Gaz Vanası 3/4”', category: 'Doğalgaz', unit: 'adet', cost: 460, sale: 690, group: 'Malzeme' },
  { id: 'prd-05', code: 'PPR-25', name: 'PPR Temiz Su Borusu 25 mm', category: 'Sıhhi Tesisat', unit: 'metre', cost: 82, sale: 145, group: 'Malzeme' },
  { id: 'prd-06', code: 'BTY-01', name: 'Banyo Bataryası', category: 'Sıhhi Tesisat', unit: 'adet', cost: 1750, sale: 2490, group: 'Malzeme' },
  { id: 'prd-07', code: 'IP-12', name: '12 kW Monoblok Isı Pompası', category: 'Isı Pompası', unit: 'adet', cost: 142000, sale: 169500, group: 'Malzeme' },
  { id: 'prd-08', code: 'BUF-100', name: '100 Litre Buffer Tankı', category: 'Isı Pompası', unit: 'adet', cost: 16400, sale: 21900, group: 'Malzeme' },
  { id: 'prd-09', code: 'ISC-01', name: 'Montaj İşçiliği', category: 'Genel', unit: 'gün', cost: 3500, sale: 6000, group: 'İşçilik' },
]

export const seedSurveys: Survey[] = [
  {
    id: 'KSF-1042', customerId: 'mus-001', type: 'Doğalgaz', status: 'Onaylandı', owner: 'Emre Arslan', createdAt: '2026-10-18', total: 84650,
    rooms: [
      { id: 'r1', name: 'Salon', radiatorProductId: 'rad-1-4' },
      { id: 'r2', name: 'Mutfak' },
      { id: 'r3', name: 'Yatak Odası', radiatorProductId: 'rad-1-3' },
    ],
    lines: [],
  },
  {
    id: 'KSF-1043', customerId: 'mus-002', type: 'Sıhhi Tesisat', status: 'Teklif Gönderildi', owner: 'Selin Akın', createdAt: '2026-10-21', total: 32400,
    rooms: [{ id: 'r4', name: 'Banyo' }], lines: [],
  },
  {
    id: 'KSF-1044', customerId: 'mus-004', type: 'Isı Pompası', status: 'Fiyatlandırıldı', owner: 'Emre Arslan', createdAt: '2026-10-23', total: 211400,
    rooms: [{ id: 'r5', name: 'Zemin Kat', radiatorProductId: 'rad-2-6' }], lines: [],
  },
]

export const seedJobs: Job[] = [
  {
    id: 'IS-284', customerId: 'mus-001', title: 'Kombi ve radyatör montajı', assignee: 'Mehmet Usta', appointment: '2026-10-25', status: 'Hazırlanıyor',
    checklist: [
      { id: 'c1', label: '24 kW kombi', done: true },
      { id: 'c2', label: '7,5 m panel radyatör', done: true },
      { id: 'c3', label: '18 m doğalgaz borusu', done: false },
      { id: 'c4', label: 'Bağlantı ve vana seti', done: false },
    ],
  },
  {
    id: 'IS-285', customerId: 'mus-002', title: 'Banyo tesisat yenileme', assignee: 'Cem Usta', appointment: '2026-10-26', status: 'Planlandı',
    checklist: [
      { id: 'c5', label: '20 m PPR boru', done: false },
      { id: 'c6', label: 'Banyo bataryası', done: false },
      { id: 'c7', label: 'Ek parçalar kutusu', done: false },
    ],
  },
  {
    id: 'IS-281', customerId: 'mus-003', title: 'Kombi yıllık bakım', assignee: 'Mehmet Usta', appointment: '2026-10-24', status: 'Tamamlandı',
    checklist: [{ id: 'c8', label: 'Bakım seti', done: true }],
  },
]

export const gasStages = ['Keşif', 'Teklif', 'Abonelik', 'Proje çizimi', 'AKSA onayı', 'Montaj', 'Gaz açılışı', 'Tamamlandı']
export const heatPumpStages = ['Keşif', 'Kapasite hesabı', 'Teklif', 'Tedarik', 'Montaj', 'Devreye alma', 'Isıtma kontrolü', 'Tamamlandı']

export const seedProjects: Project[] = [
  { id: 'PRJ-090', customerId: 'mus-001', type: 'Doğalgaz', currentStage: 4, stages: gasStages, owner: 'Derya Çetin', dueDate: '2026-11-08' },
  { id: 'PRJ-091', customerId: 'mus-004', type: 'Isı Pompası', currentStage: 2, stages: heatPumpStages, owner: 'Selin Akın', dueDate: '2026-11-18' },
  { id: 'PRJ-087', customerId: 'mus-002', type: 'Sıhhi Tesisat', currentStage: 3, stages: ['Keşif', 'Teklif', 'Tedarik', 'Uygulama', 'Kontrol', 'Tamamlandı'], owner: 'Derya Çetin', dueDate: '2026-10-29' },
]

export const seedPayments: Payment[] = [
  { id: 'ODM-301', customerId: 'mus-001', description: 'Doğalgaz dönüşüm işi', amount: 84650, paid: 36150, dueDate: '2026-11-01', status: 'Kısmi' },
  { id: 'ODM-302', customerId: 'mus-002', description: 'Sıhhi tesisat yenileme', amount: 32400, paid: 13650, dueDate: '2026-10-22', status: 'Gecikti' },
  { id: 'ODM-303', customerId: 'mus-004', description: 'Isı pompası kaporası', amount: 211400, paid: 119100, dueDate: '2026-11-15', status: 'Kısmi' },
]
