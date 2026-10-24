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

export const seedProducts: Product[] = [
  { id: 'prd-01', code: 'KMB-24', name: '24 kW Yoğuşmalı Kombi', category: 'Doğalgaz', unit: 'adet', cost: 28600, sale: 34900 },
  { id: 'prd-02', code: 'RAD-60', name: 'Panel Radyatör 600 mm', category: 'Doğalgaz', unit: 'metre', cost: 2450, sale: 3250 },
  { id: 'prd-03', code: 'DG-BR', name: 'Doğalgaz Borusu', category: 'Doğalgaz', unit: 'metre', cost: 185, sale: 320 },
  { id: 'prd-04', code: 'VANA-34', name: 'Gaz Vanası 3/4”', category: 'Doğalgaz', unit: 'adet', cost: 460, sale: 690 },
  { id: 'prd-05', code: 'PPR-25', name: 'PPR Temiz Su Borusu 25 mm', category: 'Sıhhi Tesisat', unit: 'metre', cost: 82, sale: 145 },
  { id: 'prd-06', code: 'BTY-01', name: 'Banyo Bataryası', category: 'Sıhhi Tesisat', unit: 'adet', cost: 1750, sale: 2490 },
  { id: 'prd-07', code: 'IP-12', name: '12 kW Monoblok Isı Pompası', category: 'Isı Pompası', unit: 'adet', cost: 142000, sale: 169500 },
  { id: 'prd-08', code: 'BUF-100', name: '100 Litre Buffer Tankı', category: 'Isı Pompası', unit: 'adet', cost: 16400, sale: 21900 },
  { id: 'prd-09', code: 'ISC-01', name: 'Montaj İşçiliği', category: 'Genel', unit: 'gün', cost: 3500, sale: 6000 },
]

export const seedSurveys: Survey[] = [
  {
    id: 'KSF-1042', customerId: 'mus-001', type: 'Doğalgaz', status: 'Onaylandı', owner: 'Emre Arslan', createdAt: '2026-10-18', total: 84650,
    rooms: [
      { id: 'r1', name: 'Salon', width: 5.2, length: 4.1 },
      { id: 'r2', name: 'Mutfak', width: 3.4, length: 3.1 },
      { id: 'r3', name: 'Yatak Odası', width: 4, length: 3.5 },
    ],
    lines: [],
  },
  {
    id: 'KSF-1043', customerId: 'mus-002', type: 'Sıhhi Tesisat', status: 'Teklif Gönderildi', owner: 'Selin Akın', createdAt: '2026-10-21', total: 32400,
    rooms: [{ id: 'r4', name: 'Banyo', width: 2.8, length: 2.4 }], lines: [],
  },
  {
    id: 'KSF-1044', customerId: 'mus-004', type: 'Isı Pompası', status: 'Fiyatlandırıldı', owner: 'Emre Arslan', createdAt: '2026-10-23', total: 211400,
    rooms: [{ id: 'r5', name: 'Zemin Kat', width: 9.5, length: 7.2 }], lines: [],
  },
]

export const seedJobs: Job[] = [
  {
    id: 'IS-284', customerId: 'mus-001', title: 'Kombi ve radyatör montajı', assignee: 'Mehmet Usta', appointment: '2026-10-25T09:30', status: 'Hazırlanıyor',
    checklist: [
      { id: 'c1', label: '24 kW kombi', done: true },
      { id: 'c2', label: '7,5 m panel radyatör', done: true },
      { id: 'c3', label: '18 m doğalgaz borusu', done: false },
      { id: 'c4', label: 'Bağlantı ve vana seti', done: false },
    ],
  },
  {
    id: 'IS-285', customerId: 'mus-002', title: 'Banyo tesisat yenileme', assignee: 'Cem Usta', appointment: '2026-10-26T10:00', status: 'Planlandı',
    checklist: [
      { id: 'c5', label: '20 m PPR boru', done: false },
      { id: 'c6', label: 'Banyo bataryası', done: false },
      { id: 'c7', label: 'Ek parçalar kutusu', done: false },
    ],
  },
  {
    id: 'IS-281', customerId: 'mus-003', title: 'Kombi yıllık bakım', assignee: 'Mehmet Usta', appointment: '2026-10-24T13:30', status: 'Tamamlandı',
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
