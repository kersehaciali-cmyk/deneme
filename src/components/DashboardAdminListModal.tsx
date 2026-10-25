import { ArrowDownAZ, CalendarDays, CircleDollarSign, Filter, Phone, RotateCcw, Search, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatCurrency } from '../lib/domain'
import { Modal } from './Modal'

export interface AdminOverviewItem {
  id: string
  title: string
  customerName: string
  contactName?: string
  contactPhone?: string
  date: string
  price?: number
  type: string
  status: string
  features: string[]
  address?: string
}

type SortKey = 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc' | 'name-asc' | 'name-desc'

const dateValue = (value: string) => {
  const timestamp = Date.parse(value.includes('T') ? value : `${value}T12:00:00`)
  return Number.isFinite(timestamp) ? timestamp : 0
}

const formatDate = (value: string) => new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric', month: 'long', year: 'numeric',
}).format(new Date(dateValue(value)))

export function DashboardAdminListModal({ open, eyebrow, title, items, onClose }: {
  open: boolean
  eyebrow: string
  title: string
  items: AdminOverviewItem[]
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('date-desc')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const types = useMemo(() => [...new Set(items.map((item) => item.type))].sort((a, b) => a.localeCompare(b, 'tr-TR')), [items])
  const statuses = useMemo(() => [...new Set(items.map((item) => item.status))].sort((a, b) => a.localeCompare(b, 'tr-TR')), [items])
  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR')
    const minimum = minPrice === '' ? undefined : Number(minPrice)
    const maximum = maxPrice === '' ? undefined : Number(maxPrice)
    const from = fromDate ? Date.parse(`${fromDate}T00:00:00`) : undefined
    const to = toDate ? Date.parse(`${toDate}T23:59:59.999`) : undefined
    return items.filter((item) => {
      const searchable = [item.id, item.title, item.customerName, item.contactName, item.contactPhone, item.type, item.status, item.address, ...item.features].join(' ').toLocaleLowerCase('tr-TR')
      const timestamp = dateValue(item.date)
      return (!normalizedQuery || searchable.includes(normalizedQuery))
        && (type === 'all' || item.type === type)
        && (status === 'all' || item.status === status)
        && (from === undefined || timestamp >= from)
        && (to === undefined || timestamp <= to)
        && (minimum === undefined || (item.price !== undefined && item.price >= minimum))
        && (maximum === undefined || (item.price !== undefined && item.price <= maximum))
    }).sort((a, b) => {
      if (sort === 'date-desc') return dateValue(b.date) - dateValue(a.date)
      if (sort === 'date-asc') return dateValue(a.date) - dateValue(b.date)
      if (sort === 'price-desc' || sort === 'price-asc') {
        if (a.price === undefined) return b.price === undefined ? 0 : 1
        if (b.price === undefined) return -1
        return sort === 'price-desc' ? b.price - a.price : a.price - b.price
      }
      const comparison = a.customerName.localeCompare(b.customerName, 'tr-TR')
      return sort === 'name-desc' ? -comparison : comparison
    })
  }, [fromDate, items, maxPrice, minPrice, query, sort, status, toDate, type])

  const clearFilters = () => {
    setQuery('')
    setSort('date-desc')
    setType('all')
    setStatus('all')
    setFromDate('')
    setToDate('')
    setMinPrice('')
    setMaxPrice('')
  }

  return <Modal open={open} onClose={onClose} eyebrow={eyebrow} title={title} wide>
    <div className="admin-overview-modal">
      <section className="admin-overview-filters">
        <label className="admin-overview-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Keşif, müşteri, telefon, tür veya özellik ara…" /></label>
        <label><span><ArrowDownAZ size={13} /> Sıralama</span><select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}><option value="date-desc">Tarih · yeniden eskiye</option><option value="date-asc">Tarih · eskiden yeniye</option><option value="price-desc">Fiyat · yüksekten düşüğe</option><option value="price-asc">Fiyat · düşükten yükseğe</option><option value="name-asc">Müşteri · A–Z</option><option value="name-desc">Müşteri · Z–A</option></select></label>
        <label><span><Filter size={13} /> Tür</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">Tüm türler</option>{types.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
        <label><span>Durum</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tüm durumlar</option>{statuses.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
        <label><span>Başlangıç tarihi</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
        <label><span>Bitiş tarihi</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
        <label><span>En düşük fiyat</span><input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="0" /></label>
        <label><span>En yüksek fiyat</span><input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Sınırsız" /></label>
      </section>
      <div className="admin-overview-result"><span><strong>{visible.length}</strong> / {items.length} kayıt gösteriliyor</span><button onClick={clearFilters}><RotateCcw size={14} /> Filtreleri temizle</button></div>
      <section className="admin-overview-list">
        {visible.map((item) => <article key={item.id}>
          <header><div><span className="admin-overview-id">{item.id}</span><h3>{item.title}</h3></div><div><strong>{item.price === undefined ? 'Fiyat bağlantısı yok' : formatCurrency(item.price)}</strong><em>{item.status}</em></div></header>
          <div className="admin-overview-primary"><span><UserRound size={15} /><b>{item.customerName}</b></span><span><Phone size={15} /> {item.contactName && item.contactName !== item.customerName ? `${item.contactName} · ` : ''}{item.contactPhone || 'Telefon girilmedi'}</span><span><CalendarDays size={15} /> {formatDate(item.date)}</span></div>
          {item.address && <p className="admin-overview-address">{item.address}</p>}
          <div className="admin-overview-features"><span>{item.type}</span>{item.features.map((feature) => <span key={feature}>{feature}</span>)}</div>
        </article>)}
        {visible.length === 0 && <div className="admin-overview-empty"><Search size={24} /><strong>Kayıt bulunamadı</strong><span>Filtreleri değiştirerek tekrar deneyin.</span></div>}
      </section>
    </div>
  </Modal>
}
