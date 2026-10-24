import { ArrowLeft, ArrowRight, Check, ClipboardPenLine, Flame, Plus, Search, ShowerHead, ThermometerSun, Trash2, UserRoundPlus, Wind } from 'lucide-react'
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

const defaultRoomNames = ['Salon', 'Oturma Odası', 'Yatak Odası', 'Çocuk Odası-1', 'Mutfak', 'Banyo', 'Hol-1']
const createDefaultRooms = (): Room[] => defaultRoomNames.map((name, index) => ({ id: `room-${index + 1}`, name }))

export function Surveys() {
  const { surveys, customers, role } = useApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const hidePrices = role === 'usta'
  const filtered = surveys.filter((survey) => {
    const customer = customers.find((item) => item.id === survey.customerId)
    return `${survey.id} ${survey.type} ${customer?.name}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))
  })

  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">SAHA KEŞİFLERİ</span><h1>Keşifler</h1><p>Odaları seçin, cihazları belirleyin ve keşfi birkaç dakikada tamamlayın.</p></div><button className="primary-button" onClick={() => setOpen(true)}><ClipboardPenLine size={18} /> Yeni keşif</button></section>
    <section className="toolbar panel"><label className="list-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Keşif no, müşteri veya tür ara…" /></label><div className="filter-chips"><button className="active">Tümü</button><button>Doğalgaz</button><button>Isı pompası</button></div></section>
    <section className="panel table-panel">
      <div className={`data-table survey-table ${hidePrices ? 'without-price' : ''}`}>
        <div className="table-row table-head"><span>Keşif</span><span>Müşteri</span><span>Tür</span><span>Odalar</span>{!hidePrices && <span>Tutar</span>}<span>Durum</span></div>
        {filtered.map((survey) => {
          const customer = customers.find((item) => item.id === survey.customerId)
          const radiatorCount = survey.rooms.filter((room) => room.radiatorProductId).length
          return <div className="table-row" key={survey.id}>
            <span><strong>{survey.id}</strong><small>{new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(survey.createdAt))} · {survey.owner}</small></span>
            <span><strong>{customer?.name}</strong><small>{customer?.district}</small></span>
            <span><i className={`type-dot type-${survey.type === 'Doğalgaz' ? 'gas' : survey.type === 'Sıhhi Tesisat' ? 'water' : 'heat'}`} />{survey.type}</span>
            <span><strong>{survey.rooms.length} oda</strong><small>{radiatorCount ? `${radiatorCount} radyatör` : 'Radyatör yok'}</small></span>
            {!hidePrices && <span><strong>{formatCurrency(survey.total)}</strong></span>}
            <span><em className={`status-pill status-${survey.status.toLocaleLowerCase('tr-TR').replaceAll(' ', '-')}`}>{survey.status}</em></span>
          </div>
        })}
      </div>
    </section>
    <SurveyWizard open={open} onClose={() => setOpen(false)} />
  </div>
}

function SurveyWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { customers, products, addCustomer, addSurvey, surveys, role } = useApp()
  const [step, setStep] = useState(1)
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [customerQuery, setCustomerQuery] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', district: '', address: '' })
  const [type, setType] = useState<SurveyType>('Doğalgaz')
  const [rooms, setRooms] = useState<Room[]>(createDefaultRooms)
  const [addingRoom, setAddingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [lines, setLines] = useState<SurveyLine[]>([])
  const [boilerProductId, setBoilerProductId] = useState(() => products.find((product) => product.group === 'Kombi')?.id ?? '')
  const hidePrices = role === 'usta'

  const radiatorProducts = products.filter((product) => product.group === 'Radyatör')
  const boilerProducts = products.filter((product) => product.group === 'Kombi')
  const selectedBoiler = boilerProducts.find((product) => product.id === boilerProductId)
  const availableProducts = products.filter((product) => (product.category === type || product.category === 'Genel') && product.group !== 'Kombi' && product.group !== 'Radyatör')
  const filteredCustomers = customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.district}`.toLocaleLowerCase('tr-TR').includes(customerQuery.toLocaleLowerCase('tr-TR')))

  const generatedLines = useMemo<SurveyLine[]>(() => {
    const radiatorLines = type === 'Sıhhi Tesisat' ? [] : rooms.flatMap((room) => room.radiatorProductId ? [{ id: `radiator-${room.id}`, roomId: room.id, productId: room.radiatorProductId, quantity: 1 }] : [])
    const boilerLine = type === 'Doğalgaz' && boilerProductId ? [{ id: 'selected-boiler', roomId: rooms.find((room) => room.name === 'Mutfak')?.id ?? rooms[0]?.id ?? '', productId: boilerProductId, quantity: 1 }] : []
    return [...radiatorLines, ...boilerLine]
  }, [boilerProductId, rooms, type])
  const effectiveLines = useMemo(() => [...lines, ...generatedLines], [generatedLines, lines])
  const totals = useMemo(() => calculateSurveyTotals(effectiveLines, products), [effectiveLines, products])
  const vat = totals.sale * 0.2
  const grandTotal = totals.sale + vat

  const resetAndClose = () => {
    setStep(1)
    setRooms(createDefaultRooms())
    setLines([])
    setCustomerQuery('')
    setShowNewCustomer(false)
    setBoilerProductId(products.find((product) => product.group === 'Kombi')?.id ?? '')
    onClose()
  }
  const updateRoom = (id: string, patch: Partial<Room>) => setRooms((current) => current.map((room) => room.id === id ? { ...room, ...patch } : room))
  const addRoom = () => {
    const name = newRoomName.trim()
    if (!name) return
    setRooms((current) => [...current, { id: `room-${Date.now()}`, name }])
    setNewRoomName('')
    setAddingRoom(false)
  }
  const selectRadiatorBrand = (room: Room, brand: string) => {
    const current = radiatorProducts.find((product) => product.id === room.radiatorProductId)
    const product = radiatorProducts.find((item) => item.brand === brand && item.variant === current?.variant) ?? radiatorProducts.find((item) => item.brand === brand)
    updateRoom(room.id, { radiatorProductId: product?.id })
  }
  const selectRadiatorSize = (room: Room, variant: string) => {
    const current = radiatorProducts.find((product) => product.id === room.radiatorProductId)
    const product = radiatorProducts.find((item) => item.brand === current?.brand && item.variant === variant) ?? radiatorProducts.find((item) => item.variant === variant)
    updateRoom(room.id, { radiatorProductId: product?.id })
  }
  const changeQuantity = (productId: string, delta: number) => {
    setLines((current) => {
      const existing = current.find((line) => line.productId === productId)
      if (!existing && delta > 0) return [...current, { id: `line-${Date.now()}-${productId}`, productId, roomId: rooms[0]?.id ?? '', quantity: 1 }]
      if (!existing) return current
      const quantity = existing.quantity + delta
      return quantity <= 0 ? current.filter((line) => line.id !== existing.id) : current.map((line) => line.id === existing.id ? { ...line, quantity } : line)
    })
  }
  const createCustomer = () => {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) return
    const customer = addCustomer(newCustomer)
    setCustomerId(customer.id)
    setCustomerQuery('')
    setNewCustomer({ name: '', phone: '', district: '', address: '' })
    setShowNewCustomer(false)
  }
  const selectBoilerBrand = (brand: string) => setBoilerProductId(boilerProducts.find((product) => product.brand === brand)?.id ?? '')
  const selectBoilerVariant = (variant: string) => setBoilerProductId(boilerProducts.find((product) => product.brand === selectedBoiler?.brand && product.variant === variant)?.id ?? '')
  const save = () => {
    addSurvey({
      id: `KSF-${1045 + surveys.length}`,
      customerId,
      type,
      status: role === 'usta' ? 'Taslak' : 'Fiyatlandırıldı',
      rooms,
      lines: effectiveLines,
      total: grandTotal,
      createdAt: new Date().toISOString().slice(0, 10),
      owner: role === 'usta' ? 'Mehmet Usta' : role === 'proje' ? 'Derya Çetin' : 'Zeynep Şahin',
    })
    resetAndClose()
  }

  return <Modal open={open} onClose={resetAndClose} eyebrow="HIZLI KEŞİF" title="Yeni keşif oluştur" wide>
    <div className="wizard-progress">
      {['Müşteri & tür', 'Odalar & radyatörler', 'Cihaz & malzeme', 'Özet'].map((label, index) => <div className={step >= index + 1 ? 'active' : ''} key={label}><span>{step > index + 1 ? <Check size={15} /> : index + 1}</span><strong>{label}</strong></div>)}
    </div>
    <div className="wizard-body">
      {step === 1 && <div className="wizard-section">
        <div className="section-title"><span>01</span><div><h3>Müşteri ve keşif türü</h3><p>Mevcut müşteriyi bulun veya yeni müşteri oluşturun.</p></div></div>
        <div className="customer-picker-head">
          <label><Search size={17} /><input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="İsim, telefon veya ilçe ile müşteri ara…" /></label>
          <button className="primary-button" onClick={() => setShowNewCustomer((value) => !value)}><UserRoundPlus size={17} /> Yeni Müşteri</button>
        </div>
        {showNewCustomer && <div className="new-customer-inline">
          <label><span>Ad soyad *</span><input value={newCustomer.name} onChange={(event) => setNewCustomer({ ...newCustomer, name: event.target.value })} placeholder="Müşteri adı" /></label>
          <label><span>Telefon *</span><input value={newCustomer.phone} onChange={(event) => setNewCustomer({ ...newCustomer, phone: event.target.value })} placeholder="05xx xxx xx xx" /></label>
          <label><span>İlçe</span><input value={newCustomer.district} onChange={(event) => setNewCustomer({ ...newCustomer, district: event.target.value })} placeholder="İlçe" /></label>
          <label><span>Adres</span><input value={newCustomer.address} onChange={(event) => setNewCustomer({ ...newCustomer, address: event.target.value })} placeholder="Açık adres" /></label>
          <button disabled={!newCustomer.name.trim() || !newCustomer.phone.trim()} onClick={createCustomer}><Check size={16} /> Kaydet ve seç</button>
        </div>}
        <div className="customer-results">{filteredCustomers.slice(0, 6).map((customer) => <button className={customerId === customer.id ? 'selected' : ''} onClick={() => setCustomerId(customer.id)} key={customer.id}><span>{customer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><strong>{customer.name}</strong><small>{customer.phone} · {customer.district}</small></div>{customerId === customer.id && <Check size={16} />}</button>)}</div>
        <span className="choice-label">KEŞİF TÜRÜ</span>
        <div className="type-choice-grid">{typeOptions.map(({ value, description, icon: Icon, className }) => <button className={type === value ? 'selected' : ''} onClick={() => { setType(value); setLines([]) }} key={value}><span className={`type-icon ${className}`}><Icon /></span><strong>{value}</strong><small>{description}</small><i>{type === value && <Check size={14} />}</i></button>)}</div>
      </div>}
      {step === 2 && <div className="wizard-section">
        <div className="section-title"><span>02</span><div><h3>Odalar ve radyatörler</h3><p>Hazır odaları düzenleyin; radyatör olan odalarda marka ve ölçüyü seçin.</p></div></div>
        <div className="ready-room-grid">{rooms.map((room, index) => {
          const selectedRadiator = radiatorProducts.find((product) => product.id === room.radiatorProductId)
          const brands = [...new Set(radiatorProducts.map((product) => product.brand).filter(Boolean))]
          const sizes = [...new Set(radiatorProducts.filter((product) => !selectedRadiator?.brand || product.brand === selectedRadiator.brand).map((product) => product.variant).filter(Boolean))]
          return <article className={room.radiatorProductId ? 'has-radiator' : ''} key={room.id}>
            <header><span>{index + 1}</span><input value={room.name} onChange={(event) => updateRoom(room.id, { name: event.target.value })} aria-label="Oda adı" /><button onClick={() => setRooms((current) => current.filter((item) => item.id !== room.id))} aria-label="Odayı sil"><Trash2 size={15} /></button></header>
            {type !== 'Sıhhi Tesisat' && <>
              <label className="radiator-toggle"><button className={room.radiatorProductId ? 'checked' : ''} onClick={() => updateRoom(room.id, { radiatorProductId: room.radiatorProductId ? undefined : radiatorProducts[0]?.id })}>{room.radiatorProductId && <Check size={13} />}</button><ThermometerSun size={16} /><span>Bu odada radyatör var</span></label>
              {selectedRadiator && <div className="radiator-selects"><label><span>Marka</span><select value={selectedRadiator.brand} onChange={(event) => selectRadiatorBrand(room, event.target.value)}>{brands.map((brand) => <option value={brand} key={brand}>{brand}</option>)}</select></label><label><span>Ölçü</span><select value={selectedRadiator.variant} onChange={(event) => selectRadiatorSize(room, event.target.value)}>{sizes.map((size) => <option value={size} key={size}>{size}</option>)}</select></label>{!hidePrices && <small>{formatCurrency(selectedRadiator.sale)}</small>}</div>}
            </>}
          </article>
        })}</div>
        {addingRoom ? <div className="new-room-row"><input autoFocus value={newRoomName} onChange={(event) => setNewRoomName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addRoom()} placeholder="Yeni odanın adı" /><button className="secondary-button" onClick={() => setAddingRoom(false)}>Vazgeç</button><button className="primary-button" disabled={!newRoomName.trim()} onClick={addRoom}>Odayı ekle</button></div> : <button className="dashed-button" onClick={() => setAddingRoom(true)}><Plus size={17} /> Yeni Oda</button>}
      </div>}
      {step === 3 && <div className="wizard-section">
        <div className="section-title"><span>03</span><div><h3>Cihaz ve malzemeler</h3><p>{type} için kullanılacak cihaz, malzeme ve işçiliği belirleyin.</p></div></div>
        {type === 'Doğalgaz' && <div className="boiler-selector">
          <header><div><Flame size={19} /><span><strong>Kombi seçimi</strong><small>Marka ve kapasiteyi belirleyin</small></span></div><label><input type="checkbox" checked={Boolean(boilerProductId)} onChange={(event) => setBoilerProductId(event.target.checked ? boilerProducts[0]?.id ?? '' : '')} /> Kombi kullanılacak</label></header>
          {selectedBoiler && <div><label><span>Marka</span><select value={selectedBoiler.brand} onChange={(event) => selectBoilerBrand(event.target.value)}>{[...new Set(boilerProducts.map((product) => product.brand))].map((brand) => <option value={brand} key={brand}>{brand}</option>)}</select></label><label><span>Kapasite</span><select value={selectedBoiler.variant} onChange={(event) => selectBoilerVariant(event.target.value)}>{boilerProducts.filter((product) => product.brand === selectedBoiler.brand).map((product) => <option value={product.variant} key={product.id}>{product.variant}</option>)}</select></label><div><span>Model</span><strong>{selectedBoiler.name}</strong>{!hidePrices && <small>{formatCurrency(selectedBoiler.sale)}</small>}</div></div>}
        </div>}
        <span className="choice-label">DİĞER MALZEME VE İŞÇİLİK</span>
        <div className="product-picker">{availableProducts.map((product) => {
          const line = lines.find((item) => item.productId === product.id)
          return <div className={`picker-row ${hidePrices ? 'without-price' : ''}`} key={product.id}><div><span>{product.code}</span><strong>{product.name}</strong>{!hidePrices && <small>{formatCurrency(product.sale)} / {product.unit}</small>}</div><div className="quantity-stepper"><button onClick={() => changeQuantity(product.id, -1)}>−</button><strong>{line?.quantity ?? 0}</strong><button onClick={() => changeQuantity(product.id, 1)}>+</button></div>{!hidePrices && <b>{formatCurrency((line?.quantity ?? 0) * product.sale)}</b>}</div>
        })}</div>
        <div className="inline-total"><span>{effectiveLines.length} kalem seçildi</span>{!hidePrices && <><span>Tahmini maliyet {formatCurrency(totals.cost)}</span><strong>Ara toplam {formatCurrency(totals.sale)}</strong></>}</div>
      </div>}
      {step === 4 && <div className={`summary-grid ${hidePrices ? 'no-price-summary' : ''}`}>
        <div className="quote-summary">
          <div className="section-title"><span>04</span><div><h3>Keşif özeti</h3><p>Kaydetmeden önce bilgileri kontrol edin.</p></div></div>
          <dl><div><dt>Müşteri</dt><dd>{customers.find((item) => item.id === customerId)?.name}</dd></div><div><dt>Keşif türü</dt><dd>{type}</dd></div><div><dt>Odalar</dt><dd>{rooms.length} oda · {rooms.filter((room) => room.radiatorProductId).length} radyatör</dd></div>{selectedBoiler && type === 'Doğalgaz' && <div><dt>Kombi</dt><dd>{selectedBoiler.brand} · {selectedBoiler.variant}</dd></div>}<div><dt>Keşif kalemi</dt><dd>{effectiveLines.length} ürün / hizmet</dd></div></dl>
          {hidePrices && <div className="master-price-note">Usta görünümünde fiyatlar gizlidir. Keşif, yönetici fiyatlandırması için taslak olarak kaydedilecek.</div>}
        </div>
        {!hidePrices && <div className="price-card"><span>TEKLİF HESABI</span><div><small>Malzeme + işçilik</small><strong>{formatCurrency(totals.sale)}</strong></div><div><small>KDV (%20)</small><strong>{formatCurrency(vat)}</strong></div><hr /><div className="grand-total"><small>Genel toplam</small><strong>{formatCurrency(grandTotal)}</strong></div><p>Tahmini brüt kâr: <b>{formatCurrency(totals.sale - totals.cost)}</b></p></div>}
      </div>}
    </div>
    <footer className="wizard-footer"><button className="secondary-button" onClick={() => step === 1 ? resetAndClose() : setStep((value) => value - 1)}>{step > 1 && <ArrowLeft size={17} />}{step === 1 ? 'Vazgeç' : 'Geri'}</button>{step < 4 ? <button className="primary-button" disabled={!customerId || (step === 2 && rooms.length === 0) || (step === 3 && effectiveLines.length === 0)} onClick={() => setStep((value) => value + 1)}>Devam et <ArrowRight size={17} /></button> : <button className="primary-button" onClick={save}><Check size={17} /> Keşfi kaydet</button>}</footer>
  </Modal>
}
