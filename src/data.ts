import type { AppUser, Customer, Job, Payment, Product, Project, Survey, SurveyTemplate, WorkItemDefinition } from './types'

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

export const seedUsers: AppUser[] = [
  { id: 'usr-001', name: 'Zeynep Şahin', phone: '0532 100 20 30', email: 'zeynep@tesisatpro.com', role: 'admin', active: true },
  { id: 'usr-002', name: 'Mehmet Usta', phone: '0532 221 34 50', email: 'mehmet@tesisatpro.com', role: 'usta', active: true },
  { id: 'usr-003', name: 'Cem Usta', phone: '0542 310 42 11', email: 'cem@tesisatpro.com', role: 'usta', active: true },
  { id: 'usr-004', name: 'Derya Çetin', phone: '0505 404 22 18', email: 'derya@tesisatpro.com', role: 'proje', active: true },
  { id: 'usr-005', name: 'Selin Akın', phone: '0536 810 19 26', email: 'selin@tesisatpro.com', role: 'proje', active: true },
]

const boilerBrands = [
  { brand: 'Baymak', costBase: 23200, saleBase: 29800 },
  { brand: 'Vaillant', costBase: 29700, saleBase: 37900 },
  { brand: 'Copa', costBase: 21800, saleBase: 27900 },
]
const boilerSizes = [16, 20, 24, 30]
const boilerProducts: Product[] = boilerBrands.flatMap((item, brandIndex) => boilerSizes.map((size, sizeIndex) => ({
  id: `kmb-${brandIndex + 1}-${size}`,
  code: `KMB-${brandIndex + 1}-${size}`,
  name: `${item.brand} Yoğuşmalı Kombi`,
  brand: item.brand,
  variant: `${size} kW`,
  cost: item.costBase + sizeIndex * 2400,
  sale: item.saleBase + sizeIndex * 3100,
  category: 'Doğalgaz' as const,
  unit: 'adet',
  group: 'Kombi' as const,
})))

const radiatorBrands = [
  { brand: 'Demirdöküm', costFactor: 1.08, saleFactor: 1.1 },
  { brand: 'E.C.A.', costFactor: 1, saleFactor: 1.03 },
  { brand: 'Baymak', costFactor: .96, saleFactor: 1 },
  { brand: 'Termoteknik', costFactor: .91, saleFactor: .94 },
]
const radiatorSizes = [
  { variant: '60 cm', baseCost: 1650, baseSale: 2350 },
  { variant: '80 cm', baseCost: 2100, baseSale: 2950 },
  { variant: '100 cm', baseCost: 2580, baseSale: 3590 },
  { variant: '120 cm', baseCost: 3050, baseSale: 4290 },
  { variant: '140 cm', baseCost: 3520, baseSale: 4950 },
  { variant: '160 cm', baseCost: 3990, baseSale: 5590 },
  { variant: 'Havlupan', baseCost: 2150, baseSale: 3150 },
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

const heatPumpBrands = [{ brand: 'Aldea', base: 126000 }, { brand: 'Termodinamik', base: 119000 }]
const heatPumpSizes = [13, 16, 20, 24, 30]
const heatPumpProducts: Product[] = heatPumpBrands.flatMap((item, brandIndex) => heatPumpSizes.map((size, sizeIndex) => ({
  id: `ip-${brandIndex + 1}-${size}`,
  code: `IP-${brandIndex + 1}-${size}`,
  name: `${item.brand} Monoblok Isı Pompası`,
  brand: item.brand,
  variant: `${size} kW`,
  category: 'Isı Pompası' as const,
  unit: 'adet',
  cost: item.base + sizeIndex * 11500,
  sale: Math.round((item.base + sizeIndex * 11500) * 1.24),
  group: 'Isı Pompası' as const,
})))

const acBrands = [{ brand: 'Daikin', base: 28500 }, { brand: 'Vaillant', base: 24900 }]
const acSizes = [9000, 12000, 18000, 24000]
const acProducts: Product[] = acBrands.flatMap((item, brandIndex) => acSizes.map((size, sizeIndex) => ({
  id: `klm-${brandIndex + 1}-${size}`,
  code: `KLM-${brandIndex + 1}-${size}`,
  name: `${item.brand} Inverter Klima`,
  brand: item.brand,
  variant: `${size.toLocaleString('tr-TR')} BTU`,
  category: 'Klima' as const,
  unit: 'adet',
  cost: item.base + sizeIndex * 7200,
  sale: Math.round((item.base + sizeIndex * 7200) * 1.27),
  group: 'Klima' as const,
})))

const addPriceHistory = (products: Product[]): Product[] => products.map((product) => ({
  ...product,
  priceHistory: [
    { id: `${product.id}-h1`, date: '2026-06-01', cost: Math.round(product.cost * .9), sale: Math.round(product.sale * .9) },
    { id: `${product.id}-h2`, date: '2026-09-15', cost: Math.round(product.cost * .96), sale: Math.round(product.sale * .96) },
    { id: `${product.id}-h3`, date: '2026-10-24', cost: product.cost, sale: product.sale },
  ],
}))

export const seedProducts: Product[] = addPriceHistory([
  ...boilerProducts,
  ...radiatorProducts,
  ...heatPumpProducts,
  ...acProducts,
  { id: 'dg-hat-celik', code: 'DG-CL', name: 'Çelik Gaz Hattı', category: 'Doğalgaz', unit: 'metre', cost: 235, sale: 390, group: 'Malzeme' },
  { id: 'dg-hat-esnek', code: 'DG-ES', name: 'Esnek Gaz Hattı', category: 'Doğalgaz', unit: 'metre', cost: 310, sale: 485, group: 'Malzeme' },
  { id: 'boru-plastik', code: 'BR-PL', name: 'Plastik Kalorifer Borusu', category: 'Doğalgaz', unit: 'metre', cost: 78, sale: 145, group: 'Malzeme' },
  { id: 'boru-celik', code: 'BR-CL', name: 'Çelik Kalorifer Borusu', category: 'Doğalgaz', unit: 'metre', cost: 195, sale: 320, group: 'Malzeme' },
  { id: 'bransman', code: 'BRN-01', name: 'Branşman', category: 'Doğalgaz', unit: 'adet', cost: 820, sale: 1350, group: 'Malzeme' },
  { id: 'kalorifer-tesisati', code: 'KLT-01', name: 'Kalorifer Tesisatı', category: 'Doğalgaz', unit: 'iş', cost: 14500, sale: 21800, group: 'Malzeme' },
  ...[5, 6, 7, 8, 9].map((size) => ({ id: `kollektor-${size}`, code: `KOL-${size}`, name: `${size}'li Kollektör`, category: 'Doğalgaz' as const, unit: 'adet', cost: 1100 + size * 120, sale: 1850 + size * 170, group: 'Malzeme' as const, variant: `${size}'li` })),
  { id: 'baca-05', code: 'BCA-05', name: 'Ek Baca 0,5 m', category: 'Doğalgaz', unit: 'adet', cost: 740, sale: 1150, group: 'Malzeme', variant: '0,5 m' },
  { id: 'baca-10', code: 'BCA-10', name: 'Ek Baca 1 m', category: 'Doğalgaz', unit: 'adet', cost: 1280, sale: 1950, group: 'Malzeme', variant: '1 m' },
  { id: 'yerden-isitma', code: 'YIS-01', name: 'Yerden Isıtma Sistemi', category: 'Doğalgaz', unit: 'm²', cost: 740, sale: 1120, group: 'Malzeme' },
  { id: 'prd-04', code: 'VANA-34', name: 'Gaz Vanası 3/4”', category: 'Doğalgaz', unit: 'adet', cost: 460, sale: 690, group: 'Malzeme' },
  { id: 'prd-05', code: 'PPR-25', name: 'PPR Temiz Su Borusu 25 mm', category: 'Sıhhi Tesisat', unit: 'metre', cost: 82, sale: 145, group: 'Malzeme' },
  { id: 'temiz-su', code: 'ST-TS', name: 'Temiz Su Tesisatı', category: 'Sıhhi Tesisat', unit: 'iş', cost: 12500, sale: 19800, group: 'Malzeme' },
  { id: 'pis-su', code: 'ST-PS', name: 'Pis Su Tesisatı', category: 'Sıhhi Tesisat', unit: 'iş', cost: 14200, sale: 22400, group: 'Malzeme' },
  { id: 'ip-plastik-boru', code: 'IP-BR', name: 'Isı Pompası Plastik Boru', category: 'Isı Pompası', unit: 'metre', cost: 115, sale: 195, group: 'Malzeme' },
  { id: 'selenoid-vana', code: 'IP-SV', name: 'Selenoid Vana', category: 'Isı Pompası', unit: 'adet', cost: 2850, sale: 4250, group: 'Malzeme' },
  { id: 'boyler', code: 'IP-BY', name: '200 Litre Boyler', category: 'Isı Pompası', unit: 'adet', cost: 21800, sale: 29750, group: 'Malzeme' },
  { id: 'prd-08', code: 'BUF-100', name: '100 Litre Buffer Tankı', category: 'Isı Pompası', unit: 'adet', cost: 16400, sale: 21900, group: 'Malzeme' },
  { id: 'prd-09', code: 'ISC-01', name: 'Montaj İşçiliği', category: 'Genel', unit: 'gün', cost: 3500, sale: 6000, group: 'İşçilik' },
])

export const workItemDefinitions: WorkItemDefinition[] = [
  { key: 'gaz-hatti', label: 'Daire içi gaz hattı', type: 'Doğalgaz', description: 'Çelik veya esnek gaz hattı' },
  { key: 'kombi', label: 'Kombi', type: 'Doğalgaz', description: 'Marka ve kapasite seçimi' },
  { key: 'radyator-dg', label: 'Radyatör', type: 'Doğalgaz', description: 'Oda bazında ölçü ve adet' },
  { key: 'boru-dg', label: 'Boru', type: 'Doğalgaz', description: 'Plastik veya çelik boru metrajı' },
  { key: 'bransman', label: 'Branşman', type: 'Doğalgaz', description: 'Branşman malzemesi ve uygulaması' },
  { key: 'kalorifer', label: 'Kalorifer tesisatı', type: 'Doğalgaz', description: 'Kalorifer tesisatı uygulaması' },
  { key: 'kollektor', label: 'Kollektör', type: 'Doğalgaz', description: "5'li–9'lu kollektor" },
  { key: 'ek-baca', label: 'Ek baca', type: 'Doğalgaz', description: '0,5 m veya 1 m' },
  { key: 'yerden-isitma-dg', label: 'Yerden ısıtma', type: 'Doğalgaz', description: 'Metrekare üzerinden' },
  { key: 'isi-pompasi', label: 'Isı pompası', type: 'Isı Pompası', description: 'Marka ve kapasite seçimi' },
  { key: 'radyator-ip', label: 'Radyatör', type: 'Isı Pompası', description: 'Oda bazında ölçü ve adet' },
  { key: 'boru-ip', label: 'Plastik boru', type: 'Isı Pompası', description: 'Metre üzerinden' },
  { key: 'selenoid', label: 'Selenoid vana', type: 'Isı Pompası', description: 'Selenoid vana' },
  { key: 'boyler', label: 'Boyler', type: 'Isı Pompası', description: 'Sıcak su boyleri' },
  { key: 'buffer', label: 'Buffer tank', type: 'Isı Pompası', description: 'Denge tankı' },
  { key: 'yerden-isitma-ip', label: 'Yerden ısıtma', type: 'Isı Pompası', description: 'Metrekare üzerinden' },
  { key: 'temiz-su', label: 'Temiz su tesisatı', type: 'Sıhhi Tesisat', description: 'Temiz su hattı uygulaması' },
  { key: 'pis-su', label: 'Pis su tesisatı', type: 'Sıhhi Tesisat', description: 'Atık su hattı uygulaması' },
  { key: 'klima', label: 'Klima', type: 'Klima', description: 'Marka ve BTU seçimi' },
]

export const seedTemplates: SurveyTemplate[] = [
  { id: 'tpl-dg-mustakil', name: 'Müstakil Doğalgaz', type: 'Doğalgaz', workItemKeys: ['gaz-hatti', 'kombi', 'radyator-dg', 'boru-dg', 'bransman', 'kalorifer', 'kollektor', 'ek-baca'] },
  { id: 'tpl-dg-kolon', name: 'Apartman Kolon', type: 'Doğalgaz', workItemKeys: ['gaz-hatti', 'boru-dg', 'bransman'] },
  { id: 'tpl-dg-daire', name: 'Daire İçi', type: 'Doğalgaz', workItemKeys: ['gaz-hatti', 'kombi', 'radyator-dg', 'boru-dg', 'ek-baca'] },
  { id: 'tpl-dg-kombi', name: 'Kombi Değişimi', type: 'Doğalgaz', workItemKeys: ['kombi', 'ek-baca'] },
  { id: 'tpl-ip-standart', name: 'Standart Isı Pompası', type: 'Isı Pompası', workItemKeys: ['isi-pompasi', 'radyator-ip', 'boru-ip', 'selenoid', 'boyler', 'buffer'] },
  { id: 'tpl-ip-yerden', name: 'Yerden Isıtmalı Isı Pompası', type: 'Isı Pompası', workItemKeys: ['isi-pompasi', 'boru-ip', 'selenoid', 'boyler', 'buffer', 'yerden-isitma-ip'] },
  { id: 'tpl-st-tam', name: 'Komple Sıhhi Tesisat', type: 'Sıhhi Tesisat', workItemKeys: ['temiz-su', 'pis-su'] },
  { id: 'tpl-klima-standart', name: 'Standart Klima Montajı', type: 'Klima', workItemKeys: ['klima'] },
]

export const seedSurveys: Survey[] = [
  {
    id: 'KSF-1042', customerId: 'mus-001', type: 'Doğalgaz', status: 'Onaylandı', owner: 'Emre Arslan', createdAt: '2026-10-18', total: 84650,
    templateId: 'tpl-dg-daire', workItemKeys: ['gaz-hatti', 'kombi', 'radyator-dg', 'boru-dg', 'ek-baca'],
    rooms: [
      { id: 'r1', name: 'Salon', radiatorProductId: 'rad-1-4' },
      { id: 'r2', name: 'Mutfak' },
      { id: 'r3', name: 'Yatak Odası', radiatorProductId: 'rad-1-3' },
    ],
    lines: [
      { id: 'sl-1', roomId: 'r2', productId: 'kmb-1-24', quantity: 1 },
      { id: 'sl-2', roomId: 'r1', productId: 'rad-1-4', quantity: 1 },
      { id: 'sl-3', roomId: 'r3', productId: 'rad-1-3', quantity: 1 },
      { id: 'sl-4', roomId: 'r1', productId: 'dg-hat-celik', quantity: 18 },
    ],
  },
  {
    id: 'KSF-1043', customerId: 'mus-002', type: 'Sıhhi Tesisat', status: 'Kabul Edildi', owner: 'Selin Akın', createdAt: '2026-10-21', total: 32400,
    templateId: 'tpl-st-tam', workItemKeys: ['temiz-su', 'pis-su'],
    rooms: [{ id: 'r4', name: 'Banyo' }], lines: [{ id: 'sl-5', roomId: 'r4', productId: 'temiz-su', quantity: 1 }, { id: 'sl-6', roomId: 'r4', productId: 'pis-su', quantity: 1 }],
  },
  {
    id: 'KSF-1044', customerId: 'mus-004', type: 'Isı Pompası', status: 'Siparişe Alındı', owner: 'Emre Arslan', createdAt: '2026-10-23', total: 211400,
    templateId: 'tpl-ip-standart', workItemKeys: ['isi-pompasi', 'radyator-ip', 'boru-ip', 'selenoid', 'buffer'],
    rooms: [{ id: 'r5', name: 'Zemin Kat', radiatorProductId: 'rad-2-6' }], lines: [{ id: 'sl-7', roomId: 'r5', productId: 'ip-1-16', quantity: 1 }, { id: 'sl-8', roomId: 'r5', productId: 'prd-08', quantity: 1 }],
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

export const gasStages = ['Uygulama Planlandı', 'Uygulama Tamamlandı', 'Proje Çizildi', 'Proje Onaya Gönderildi', 'Proje Onaylandı', 'Abonelik İşlemi (Gaz parası görüşüldü)', 'AKSA Gaz Randevusu Alındı', 'Gaz Açıldı']
export const heatPumpStages = ['Uygulama Planlandı', 'Malzeme Hazırlandı', 'Uygulama Tamamlandı', 'Devreye Alındı', 'Isıtma Başladı']
export const plumbingStages = ['Uygulama Planlandı', 'Malzeme Hazırlandı', 'Uygulama Tamamlandı', 'Kontrol Edildi']
export const acStages = ['Uygulama Planlandı', 'Klima Montajı', 'Vakum ve Test', 'Devreye Alındı']

export const seedProjects: Project[] = [
  { id: 'PRJ-090', customerId: 'mus-001', type: 'Doğalgaz', currentStage: 4, stages: gasStages, owner: 'Derya Çetin', dueDate: '2026-11-08', surveyId: 'KSF-1042', assignedMasterId: 'usr-002', applicationDate: '2026-10-25', materials: [{ id: 'mat-1', productId: 'kmb-1-24', label: 'Baymak Yoğuşmalı Kombi 24 kW', quantity: 1, unit: 'adet', prepared: true }, { id: 'mat-2', productId: 'dg-hat-celik', label: 'Çelik Gaz Hattı', quantity: 18, unit: 'metre', prepared: false }], attachments: [], adminApproved: false },
  { id: 'PRJ-091', customerId: 'mus-004', type: 'Isı Pompası', currentStage: 2, stages: heatPumpStages, owner: 'Selin Akın', dueDate: '2026-11-18' },
  { id: 'PRJ-087', customerId: 'mus-002', type: 'Sıhhi Tesisat', currentStage: 3, stages: plumbingStages, owner: 'Derya Çetin', dueDate: '2026-10-29' },
]

export const seedPayments: Payment[] = [
  { id: 'ODM-301', customerId: 'mus-001', description: 'Doğalgaz dönüşüm işi', amount: 84650, paid: 36150, dueDate: '2026-11-01', status: 'Kısmi' },
  { id: 'ODM-302', customerId: 'mus-002', description: 'Sıhhi tesisat yenileme', amount: 32400, paid: 13650, dueDate: '2026-10-22', status: 'Gecikti' },
  { id: 'ODM-303', customerId: 'mus-004', description: 'Isı pompası kaporası', amount: 211400, paid: 119100, dueDate: '2026-11-15', status: 'Kısmi' },
]
