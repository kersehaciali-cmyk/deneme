import { ArrowLeft, ArrowRight, Check, ClipboardPenLine, Flame, Grid2X2Plus, Plus, Search, ShowerHead, Trash2, Wind } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { useApp } from '../context/AppContext'
import { calculateSurveyTotals, formatCurrency } from '../lib/domain'
import type { Room, SurveyLine, SurveyType } from '../types'

const typeOptions: { value: SurveyType; description: string; icon: typeof Flame; className: string }[] = [
  { value: 'Doğalgaz', description: 'Kombi, radyatör ve gaz hattı', icon: Flame, className: 'gas' },
  { value: 'Sıhhi Tesisat', description: 'Temiz ve atık su tesisatı', icon: ShowerHead, className: 'water' },
  { value: 'Isı Pompası', description: 'Kapasite ve ısıtma sistemi', icon: Wind, className: 'heat' },
]

export function Surveys() {
  const { surveys, customers } = useApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const filtered = surveys.filter((survey) => {
    const customer = customers.find((item) => item.id === survey.customerId)
    return `${survey.id} ${survey.type} ${customer?.name}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))
  })

  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">SAHA KEŞİFLERİ</span><h1>Keşifler</h1><p>Ölçüleri alın, oda planını çıkarın ve teklifi sahada hazırlayın.</p></div><button className="primary-button" onClick={() => setOpen(true)}><ClipboardPenLine size={18} /> Yeni keşif</button></section>
    <section className="toolbar panel"><label className="list-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Keşif no, müşteri veya tür ara…" /></label><div className="filter-chips"><button className="active">Tümü</button><button>Doğalgaz</button><button>Isı pompası</button></div></section>
    <section className="panel table-panel">
      <div className="data-table survey-table">
        <div className="table-row table-head"><span>Keşif</span><span>Müşteri</span><span>Tür</span><span>Plan</span><span>Tutar</span><span>Durum</span></div>
        {filtered.map((survey) => {
          const customer = customers.find((item) => item.id === survey.customerId)
          const area = survey.rooms.reduce((sum, room) => sum + room.width * room.length, 0)
          return <div className="table-row" key={survey.id}>
            <span><strong>{survey.id}</strong><small>{new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(survey.createdAt))} · {survey.owner}</small></span>
            <span><strong>{customer?.name}</strong><small>{customer?.district}</small></span>
            <span><i className={`type-dot type-${survey.type === 'Doğalgaz' ? 'gas' : survey.type === 'Sıhhi Tesisat' ? 'water' : 'heat'}`} />{survey.type}</span>
            <span><strong>{survey.rooms.length} oda</strong><small>{area.toFixed(1)} m²</small></span>
            <span><strong>{formatCurrency(survey.total)}</strong></span>
            <span><em className={`status-pill status-${survey.status.toLocaleLowerCase('tr-TR').replaceAll(' ', '-')}`}>{survey.status}</em></span>
          </div>
        })}
      </div>
    </section>
    <SurveyWizard open={open} onClose={() => setOpen(false)} />
  </div>
}

function SurveyWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { customers, products, addSurvey, surveys, role } = useApp()
  const [step, setStep] = useState(1)
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [type, setType] = useState<SurveyType>('Doğalgaz')
  const [rooms, setRooms] = useState<Room[]>([{ id: 'room-1', name: 'Salon', width: 4.5, length: 3.8 }])
  const [lines, setLines] = useState<SurveyLine[]>([])
  const totals = useMemo(() => calculateSurveyTotals(lines, products), [lines, products])
  const vat = totals.sale * 0.2
  const grandTotal = totals.sale + vat
  const availableProducts = products.filter((product) => product.category === type || product.category === 'Genel')

  const resetAndClose = () => {
    setStep(1)
    setRooms([{ id: 'room-1', name: 'Salon', width: 4.5, length: 3.8 }])
    setLines([])
    onClose()
  }
  const updateRoom = (id: string, patch: Partial<Room>) => setRooms((current) => current.map((room) => room.id === id ? { ...room, ...patch } : room))
  const addRoom = () => setRooms((current) => [...current, { id: `room-${Date.now()}`, name: `Oda ${current.length + 1}`, width: 3, length: 3 }])
  const changeQuantity = (productId: string, delta: number) => {
    setLines((current) => {
      const existing = current.find((line) => line.productId === productId)
      if (!existing && delta > 0) return [...current, { id: `line-${Date.now()}`, productId, roomId: rooms[0]?.id ?? '', quantity: 1 }]
      if (!existing) return current
      const quantity = existing.quantity + delta
      return quantity <= 0 ? current.filter((line) => line.id !== existing.id) : current.map((line) => line.id === existing.id ? { ...line, quantity } : line)
    })
  }
  const save = () => {
    addSurvey({
      id: `KSF-${1045 + surveys.length}`,
      customerId,
      type,
      status: 'Fiyatlandırıldı',
      rooms,
      lines,
      total: grandTotal,
      createdAt: new Date().toISOString().slice(0, 10),
      owner: role === 'usta' ? 'Mehmet Usta' : role === 'proje' ? 'Derya Çetin' : 'Zeynep Şahin',
    })
    resetAndClose()
  }

  return <Modal open={open} onClose={resetAndClose} eyebrow="HIZLI KEŞİF" title="Yeni keşif oluştur" wide>
    <div className="wizard-progress">
      {['Müşteri & tür', 'Daire planı', 'Keşif kalemleri', 'Özet'].map((label, index) => <div className={step >= index + 1 ? 'active' : ''} key={label}><span>{step > index + 1 ? <Check size={15} /> : index + 1}</span><strong>{label}</strong></div>)}
    </div>
    <div className="wizard-body">
      {step === 1 && <div className="wizard-section">
        <div className="section-title"><span>01</span><div><h3>Müşteri ve keşif türü</h3><p>Keşfin kimin için ve hangi kapsamda yapılacağını seçin.</p></div></div>
        <label className="field"><span>Müşteri</span><select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} · {customer.district}</option>)}</select></label>
        <div className="type-choice-grid">{typeOptions.map(({ value, description, icon: Icon, className }) => <button className={type === value ? 'selected' : ''} onClick={() => { setType(value); setLines([]) }} key={value}><span className={`type-icon ${className}`}><Icon /></span><strong>{value}</strong><small>{description}</small><i>{type === value && <Check size={14} />}</i></button>)}</div>
      </div>}
      {step === 2 && <div className="plan-builder">
        <div className="room-editor">
          <div className="section-title compact"><span>02</span><div><h3>Daire planı</h3><p>Odaları ve net duvar ölçülerini girin.</p></div></div>
          <div className="room-list">{rooms.map((room, index) => <article className="room-form" key={room.id}>
            <header><span>{index + 1}</span><input aria-label="Oda adı" value={room.name} onChange={(event) => updateRoom(room.id, { name: event.target.value })} />{rooms.length > 1 && <button onClick={() => setRooms((current) => current.filter((item) => item.id !== room.id))}><Trash2 size={16} /></button>}</header>
            <div><label><span>En (m)</span><input type="number" step="0.1" min="0.5" value={room.width} onChange={(event) => updateRoom(room.id, { width: Number(event.target.value) })} /></label><b>×</b><label><span>Boy (m)</span><input type="number" step="0.1" min="0.5" value={room.length} onChange={(event) => updateRoom(room.id, { length: Number(event.target.value) })} /></label><em>{(room.width * room.length).toFixed(1)} m²</em></div>
          </article>)}</div>
          <button className="dashed-button" onClick={addRoom}><Plus size={17} /> Oda ekle</button>
        </div>
        <div className="floor-preview"><div className="preview-heading"><span><Grid2X2Plus size={17} /> CANLI PLAN</span><strong>{rooms.reduce((sum, room) => sum + room.width * room.length, 0).toFixed(1)} m² toplam</strong></div><div className="floor-canvas">{rooms.map((room, index) => <div className={`floor-room room-color-${index % 4}`} style={{ flexGrow: Math.max(room.width * room.length, 5), minWidth: `${Math.min(room.width * 28, 160)}px`, minHeight: `${Math.min(room.length * 24, 125)}px` }} key={room.id}><strong>{room.name}</strong><span>{room.width} × {room.length} m</span><i>{(room.width * room.length).toFixed(1)} m²</i></div>)}</div><p>Plan, ölçülere göre oransal bir önizlemedir. Odaları sürükleyerek yerleştirme sonraki sürüme hazırdır.</p></div>
      </div>}
      {step === 3 && <div className="wizard-section">
        <div className="section-title"><span>03</span><div><h3>Keşif kalemleri</h3><p>{type} kataloğundan ürün ve işçilik ekleyin.</p></div></div>
        <div className="product-picker">{availableProducts.map((product) => {
          const line = lines.find((item) => item.productId === product.id)
          return <div className="picker-row" key={product.id}><div><span>{product.code}</span><strong>{product.name}</strong><small>{formatCurrency(product.sale)} / {product.unit}</small></div><div className="quantity-stepper"><button onClick={() => changeQuantity(product.id, -1)}>−</button><strong>{line?.quantity ?? 0}</strong><button onClick={() => changeQuantity(product.id, 1)}>+</button></div><b>{formatCurrency((line?.quantity ?? 0) * product.sale)}</b></div>
        })}</div>
        <div className="inline-total"><span>{lines.length} kalem · Tahmini maliyet {formatCurrency(totals.cost)}</span><strong>Ara toplam {formatCurrency(totals.sale)}</strong></div>
      </div>}
      {step === 4 && <div className="summary-grid">
        <div className="quote-summary">
          <div className="section-title"><span>04</span><div><h3>Keşif özeti</h3><p>Kaydetmeden önce bilgileri kontrol edin.</p></div></div>
          <dl><div><dt>Müşteri</dt><dd>{customers.find((item) => item.id === customerId)?.name}</dd></div><div><dt>Keşif türü</dt><dd>{type}</dd></div><div><dt>Plan</dt><dd>{rooms.length} oda · {rooms.reduce((sum, room) => sum + room.width * room.length, 0).toFixed(1)} m²</dd></div><div><dt>Keşif kalemi</dt><dd>{lines.length} ürün / hizmet</dd></div></dl>
        </div>
        <div className="price-card"><span>TEKLİF HESABI</span><div><small>Malzeme + işçilik</small><strong>{formatCurrency(totals.sale)}</strong></div><div><small>KDV (%20)</small><strong>{formatCurrency(vat)}</strong></div><hr /><div className="grand-total"><small>Genel toplam</small><strong>{formatCurrency(grandTotal)}</strong></div><p>Tahmini brüt kâr: <b>{formatCurrency(totals.sale - totals.cost)}</b></p></div>
      </div>}
    </div>
    <footer className="wizard-footer"><button className="secondary-button" onClick={() => step === 1 ? resetAndClose() : setStep((value) => value - 1)}>{step > 1 && <ArrowLeft size={17} />}{step === 1 ? 'Vazgeç' : 'Geri'}</button>{step < 4 ? <button className="primary-button" disabled={(step === 2 && rooms.length === 0) || (step === 3 && lines.length === 0)} onClick={() => setStep((value) => value + 1)}>Devam et <ArrowRight size={17} /></button> : <button className="primary-button" onClick={save}><Check size={17} /> Keşfi kaydet</button>}</footer>
  </Modal>
}
