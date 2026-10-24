import { ArrowLeft, ArrowRight, Check, ClipboardPenLine, Flame, Plus, Search, ShowerHead, Snowflake, ThermometerSun, Trash2, UserRoundPlus, Wind } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { workItemDefinitions } from '../data'
import { useApp } from '../context/AppContext'
import { calculateSurveyTotals, formatCurrency } from '../lib/domain'
import type { Product, Room, Survey, SurveyLine, SurveyStatus, SurveyTemplate, SurveyType } from '../types'

const typeOptions: { value: SurveyType; description: string; icon: typeof Flame; className: string }[] = [
  { value: 'Doğalgaz', description: 'Gaz hattı, kombi ve radyatör', icon: Flame, className: 'gas' },
  { value: 'Isı Pompası', description: 'Isı pompası ve ısıtma sistemi', icon: Wind, className: 'heat' },
  { value: 'Sıhhi Tesisat', description: 'Temiz ve pis su tesisatı', icon: ShowerHead, className: 'water' },
  { value: 'Klima', description: 'Klima seçimi ve montajı', icon: Snowflake, className: 'ac' },
]

const statusOptions: SurveyStatus[] = ['Taslak', 'Fiyatlandırıldı', 'Teklif Gönderildi', 'Kabul Edildi', 'Onaylandı', 'Siparişe Alındı', 'Projeye Dönüştü', 'Reddedildi']
const projectReadyStatuses: SurveyStatus[] = ['Kabul Edildi', 'Onaylandı', 'Siparişe Alındı']
const defaultRoomNames = ['Mutfak', 'Oturma Odası', 'Misafir Odası', 'Yatak Odası', 'Hol', 'Çocuk Odası']
const createDefaultRooms = (): Room[] => defaultRoomNames.map((name, index) => ({ id: `room-${index + 1}`, name }))

function workItemForProduct(product: Product, type: SurveyType) {
  if (product.group === 'Kombi') return 'kombi'
  if (product.group === 'Radyatör') return type === 'Isı Pompası' ? 'radyator-ip' : 'radyator-dg'
  if (product.group === 'Isı Pompası') return 'isi-pompasi'
  if (product.group === 'Klima') return 'klima'
  if (product.id.startsWith('dg-hat') || product.id === 'prd-04') return 'gaz-hatti'
  if (['boru-plastik', 'boru-celik'].includes(product.id)) return 'boru-dg'
  if (product.id === 'bransman') return 'bransman'
  if (product.id === 'kalorifer-tesisati') return 'kalorifer'
  if (product.id.startsWith('kollektor')) return 'kollektor'
  if (product.id.startsWith('baca')) return 'ek-baca'
  if (product.id === 'yerden-isitma') return type === 'Isı Pompası' ? 'yerden-isitma-ip' : 'yerden-isitma-dg'
  if (product.id === 'ip-plastik-boru') return 'boru-ip'
  if (product.id === 'selenoid-vana') return 'selenoid'
  if (product.id === 'boyler') return 'boyler'
  if (product.id === 'prd-08') return 'buffer'
  if (product.id === 'temiz-su' || product.id === 'prd-05') return 'temiz-su'
  if (product.id === 'pis-su') return 'pis-su'
  return product.group === 'İşçilik' ? 'iscilik' : ''
}

export function Surveys() {
  const { surveys, customers, role, updateSurvey, projects, users, convertSurveyToProject } = useApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [conversion, setConversion] = useState<Survey | null>(null)
  const [masterId, setMasterId] = useState(() => users.find((user) => user.role === 'usta' && user.active)?.id ?? '')
  const [applicationDate, setApplicationDate] = useState(new Date().toISOString().slice(0, 10))
  const hidePrices = role === 'usta'
  const canManage = role === 'admin' || role === 'proje'
  const filtered = surveys.filter((survey) => {
    const customer = customers.find((item) => item.id === survey.customerId)
    return `${survey.id} ${survey.type} ${customer?.name} ${survey.status}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))
  })

  const convert = () => {
    if (!conversion || !masterId || !applicationDate) return
    convertSurveyToProject(conversion.id, masterId, applicationDate)
    setConversion(null)
  }

  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">TEKLİF VE KEŞİF YÖNETİMİ</span><h1>Keşifler</h1><p>Keşiften teklife, teklif onayından projeye kadar tüm süreci yönetin.</p></div><button className="primary-button" onClick={() => setOpen(true)}><ClipboardPenLine size={18} /> Yeni keşif</button></section>
    <section className="toolbar panel"><label className="list-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Keşif, müşteri, tür veya durum ara…" /></label><div className="result-count"><strong>{filtered.length}</strong> keşif</div></section>
    <section className="panel table-panel">
      <div className={`data-table survey-workflow-table ${hidePrices ? 'without-price' : ''}`}>
        <div className="table-row table-head"><span>Keşif</span><span>Müşteri</span><span>Tür / şablon</span>{!hidePrices && <span>Teklif</span>}<span>Durum</span><span>İşlem</span></div>
        {filtered.map((survey) => {
          const customer = customers.find((item) => item.id === survey.customerId)
          const alreadyProject = projects.some((project) => project.surveyId === survey.id)
          return <div className="table-row" key={survey.id}>
            <span><strong>{survey.id}</strong><small>{new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(survey.createdAt))} · {survey.owner}</small></span>
            <span><span><strong>{customer?.name}</strong><small>{customer?.district}</small></span></span>
            <span><i className={`type-dot type-${survey.type === 'Doğalgaz' ? 'gas' : survey.type === 'Sıhhi Tesisat' ? 'water' : survey.type === 'Klima' ? 'ac' : 'heat'}`} /><span><strong>{survey.type}</strong><small>{survey.workItemKeys?.length ?? 0} iş kalemi</small></span></span>
            {!hidePrices && <span><strong>{formatCurrency(survey.total)}</strong></span>}
            <span>{canManage ? <select className="status-select" value={survey.status} onChange={(event) => updateSurvey({ ...survey, status: event.target.value as SurveyStatus })}>{statusOptions.map((status) => <option value={status} key={status}>{status}</option>)}</select> : <em className={`status-pill status-${survey.status.toLocaleLowerCase('tr-TR').replaceAll(' ', '-')}`}>{survey.status}</em>}</span>
            <span>{alreadyProject || survey.status === 'Projeye Dönüştü' ? <button className="table-action success" disabled><Check size={14} /> Proje oluştu</button> : canManage && projectReadyStatuses.includes(survey.status) ? <button className="table-action" onClick={() => setConversion(survey)}>Projeye dönüştür <ArrowRight size={14} /></button> : <small>Teklif süreci devam ediyor</small>}</span>
          </div>
        })}
      </div>
    </section>
    <SurveyWizard open={open} onClose={() => setOpen(false)} />
    <Modal open={Boolean(conversion)} onClose={() => setConversion(null)} eyebrow="PROJEYE DÖNÜŞTÜR" title="Usta ve uygulama günü">
      {conversion && <div className="modal-form"><div className="conversion-summary"><strong>{conversion.id} · {customers.find((customer) => customer.id === conversion.customerId)?.name}</strong><span>{conversion.type} keşfi için iş ve malzeme listesi otomatik oluşturulacak.</span></div><div className="form-grid two"><label><span>Atanacak usta</span><select value={masterId} onChange={(event) => setMasterId(event.target.value)}>{users.filter((user) => user.role === 'usta' && user.active).map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label><label><span>Uygulama günü</span><input type="date" value={applicationDate} onChange={(event) => setApplicationDate(event.target.value)} /></label></div><p className="form-help">Aynı güne birden fazla iş atanabilir; gün içi sıralaması saha ekibi tarafından yapılır.</p><footer className="modal-footer"><button className="secondary-button" onClick={() => setConversion(null)}>Vazgeç</button><button className="primary-button" disabled={!masterId || !applicationDate} onClick={convert}>Projeyi oluştur</button></footer></div>}
    </Modal>
  </div>
}

function SurveyWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { customers, products, templates, addCustomer, addSurvey, surveys, role } = useApp()
  const initialTemplate = templates.find((template) => template.type === 'Doğalgaz')
  const [step, setStep] = useState(1)
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [customerQuery, setCustomerQuery] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', district: '', address: '' })
  const [type, setType] = useState<SurveyType>('Doğalgaz')
  const [templateId, setTemplateId] = useState(initialTemplate?.id ?? '')
  const [workItemKeys, setWorkItemKeys] = useState<string[]>(initialTemplate?.workItemKeys ?? [])
  const [rooms, setRooms] = useState<Room[]>(createDefaultRooms)
  const [addingRoom, setAddingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [lines, setLines] = useState<SurveyLine[]>([])
  const [boilerProductId, setBoilerProductId] = useState(() => products.find((product) => product.group === 'Kombi')?.id ?? '')
  const [heatPumpProductId, setHeatPumpProductId] = useState(() => products.find((product) => product.group === 'Isı Pompası')?.id ?? '')
  const [acProductId, setAcProductId] = useState(() => products.find((product) => product.group === 'Klima')?.id ?? '')
  const hidePrices = role === 'usta'

  const typeTemplates = templates.filter((template) => template.type === type)
  const typeWorkItems = workItemDefinitions.filter((item) => item.type === type)
  const selectedTemplate = templates.find((template) => template.id === templateId)
  const radiatorProducts = products.filter((product) => product.group === 'Radyatör')
  const boilerProducts = products.filter((product) => product.group === 'Kombi')
  const heatPumpProducts = products.filter((product) => product.group === 'Isı Pompası')
  const acProducts = products.filter((product) => product.group === 'Klima')
  const selectedBoiler = boilerProducts.find((product) => product.id === boilerProductId)
  const selectedHeatPump = heatPumpProducts.find((product) => product.id === heatPumpProductId)
  const selectedAc = acProducts.find((product) => product.id === acProductId)
  const radiatorKey = type === 'Isı Pompası' ? 'radyator-ip' : 'radyator-dg'
  const hasRadiators = workItemKeys.includes(radiatorKey)
  const filteredCustomers = customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.district}`.toLocaleLowerCase('tr-TR').includes(customerQuery.toLocaleLowerCase('tr-TR')))
  const availableProducts = products.filter((product) => {
    if (product.group === 'Kombi' || product.group === 'Radyatör' || product.group === 'Isı Pompası' || product.group === 'Klima') return false
    if (product.group === 'İşçilik') return true
    if (product.category !== type && product.category !== 'Genel') return false
    return workItemKeys.includes(workItemForProduct(product, type))
  })

  const generatedLines = useMemo<SurveyLine[]>(() => {
    const result: SurveyLine[] = []
    if (hasRadiators) rooms.forEach((room) => room.radiatorProductId && result.push({ id: `radiator-${room.id}`, roomId: room.id, productId: room.radiatorProductId, quantity: room.radiatorQuantity ?? 1 }))
    if (type === 'Doğalgaz' && workItemKeys.includes('kombi') && boilerProductId) result.push({ id: 'selected-boiler', roomId: rooms[0]?.id ?? '', productId: boilerProductId, quantity: 1 })
    if (type === 'Isı Pompası' && workItemKeys.includes('isi-pompasi') && heatPumpProductId) result.push({ id: 'selected-heat-pump', roomId: rooms[0]?.id ?? '', productId: heatPumpProductId, quantity: 1 })
    if (type === 'Klima' && workItemKeys.includes('klima') && acProductId) result.push({ id: 'selected-ac', roomId: rooms[0]?.id ?? '', productId: acProductId, quantity: 1 })
    return result
  }, [acProductId, boilerProductId, hasRadiators, heatPumpProductId, rooms, type, workItemKeys])
  const effectiveLines = useMemo(() => [...lines, ...generatedLines], [generatedLines, lines])
  const totals = useMemo(() => calculateSurveyTotals(effectiveLines, products), [effectiveLines, products])
  const vat = totals.sale * .2
  const grandTotal = totals.sale + vat

  const chooseType = (nextType: SurveyType) => {
    const template = templates.find((item) => item.type === nextType)
    setType(nextType)
    setTemplateId(template?.id ?? '')
    setWorkItemKeys(template?.workItemKeys ?? [])
    setLines([])
  }
  const chooseTemplate = (id: string) => {
    const template = templates.find((item) => item.id === id)
    setTemplateId(id)
    setWorkItemKeys(template?.workItemKeys ?? [])
    setLines([])
  }
  const toggleWorkItem = (key: string) => {
    if (workItemKeys.includes(key)) setLines((current) => current.filter((line) => {
      const product = products.find((item) => item.id === line.productId)
      return !product || workItemForProduct(product, type) !== key
    }))
    setWorkItemKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])
  }
  const resetAndClose = () => {
    setStep(1)
    chooseType('Doğalgaz')
    setRooms(createDefaultRooms())
    setCustomerQuery('')
    setShowNewCustomer(false)
    onClose()
  }
  const createCustomer = () => {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) return
    const customer = addCustomer(newCustomer)
    setCustomerId(customer.id)
    setNewCustomer({ name: '', phone: '', district: '', address: '' })
    setCustomerQuery('')
    setShowNewCustomer(false)
  }
  const setQuantity = (productId: string, quantity: number) => setLines((current) => {
    const existing = current.find((line) => line.productId === productId)
    if (quantity <= 0) return current.filter((line) => line.productId !== productId)
    if (!existing) return [...current, { id: `line-${Date.now()}-${productId}`, productId, roomId: rooms[0]?.id ?? '', quantity }]
    return current.map((line) => line.id === existing.id ? { ...line, quantity } : line)
  })
  const updateRoom = (id: string, patch: Partial<Room>) => setRooms((current) => current.map((room) => room.id === id ? { ...room, ...patch } : room))
  const addRoom = () => {
    if (!newRoomName.trim()) return
    setRooms((current) => [...current, { id: `room-${Date.now()}`, name: newRoomName.trim() }])
    setNewRoomName('')
    setAddingRoom(false)
  }
  const selectRadiatorPart = (room: Room, field: 'brand' | 'variant', value: string) => {
    const current = radiatorProducts.find((product) => product.id === room.radiatorProductId)
    const match = radiatorProducts.find((product) => product[field] === value && product[field === 'brand' ? 'variant' : 'brand'] === current?.[field === 'brand' ? 'variant' : 'brand']) ?? radiatorProducts.find((product) => product[field] === value)
    updateRoom(room.id, { radiatorProductId: match?.id })
  }
  const save = () => {
    addSurvey({ id: `KSF-${1045 + surveys.length}`, customerId, type, status: role === 'usta' ? 'Taslak' : 'Fiyatlandırıldı', rooms: hasRadiators ? rooms : [], lines: effectiveLines, templateId, workItemKeys, total: grandTotal, createdAt: new Date().toISOString().slice(0, 10), owner: role === 'usta' ? 'Mehmet Usta' : role === 'proje' ? 'Derya Çetin' : 'Zeynep Şahin' })
    resetAndClose()
  }

  return <Modal open={open} onClose={resetAndClose} eyebrow="HIZLI KEŞİF" title="Yeni keşif oluştur" wide>
    <div className="wizard-progress">{['Müşteri & tür', 'Şablon & işler', 'Seçimler & metraj', 'Teklif özeti'].map((label, index) => <div className={step >= index + 1 ? 'active' : ''} key={label}><span>{step > index + 1 ? <Check size={15} /> : index + 1}</span><strong>{label}</strong></div>)}</div>
    <div className="wizard-body">
      {step === 1 && <div className="wizard-section"><div className="section-title"><span>01</span><div><h3>Müşteri ve keşif türü</h3><p>Mevcut müşteriyi bulun veya yeni müşteri oluşturun.</p></div></div><div className="customer-picker-head"><label><Search size={17} /><input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="İsim, telefon veya ilçe ile müşteri ara…" /></label><button className="primary-button" onClick={() => setShowNewCustomer((value) => !value)}><UserRoundPlus size={17} /> Yeni Müşteri</button></div>{showNewCustomer && <div className="new-customer-inline"><label><span>Ad soyad *</span><input value={newCustomer.name} onChange={(event) => setNewCustomer({ ...newCustomer, name: event.target.value })} /></label><label><span>Telefon *</span><input value={newCustomer.phone} onChange={(event) => setNewCustomer({ ...newCustomer, phone: event.target.value })} /></label><label><span>İlçe</span><input value={newCustomer.district} onChange={(event) => setNewCustomer({ ...newCustomer, district: event.target.value })} /></label><label><span>Adres</span><input value={newCustomer.address} onChange={(event) => setNewCustomer({ ...newCustomer, address: event.target.value })} /></label><button disabled={!newCustomer.name.trim() || !newCustomer.phone.trim()} onClick={createCustomer}><Check size={16} /> Kaydet ve seç</button></div>}<div className="customer-results">{filteredCustomers.slice(0, 6).map((customer) => <button className={customerId === customer.id ? 'selected' : ''} onClick={() => setCustomerId(customer.id)} key={customer.id}><span>{customer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><strong>{customer.name}</strong><small>{customer.phone} · {customer.district}</small></div>{customerId === customer.id && <Check size={16} />}</button>)}</div><span className="choice-label">YAPILACAK KEŞİF İŞLEMİ</span><div className="type-choice-grid four">{typeOptions.map(({ value, description, icon: Icon, className }) => <button className={type === value ? 'selected' : ''} onClick={() => chooseType(value)} key={value}><span className={`type-icon ${className}`}><Icon /></span><strong>{value}</strong><small>{description}</small><i>{type === value && <Check size={14} />}</i></button>)}</div></div>}
      {step === 2 && <div className="wizard-section"><div className="section-title"><span>02</span><div><h3>Şablon ve yapılacak işler</h3><p>Şablon başlangıç seçimini yapar; aşağıdaki kalemleri serbestçe değiştirebilirsiniz.</p></div></div><label className="template-select"><span>Hazır şablon</span><select value={templateId} onChange={(event) => chooseTemplate(event.target.value)}>{typeTemplates.map((template) => <option value={template.id} key={template.id}>{template.name}</option>)}</select><small>{selectedTemplate?.workItemKeys.length ?? 0} hazır iş kalemi</small></label><div className="work-item-grid">{typeWorkItems.map((item) => <button className={workItemKeys.includes(item.key) ? 'selected' : ''} onClick={() => toggleWorkItem(item.key)} key={item.key}><span>{workItemKeys.includes(item.key) && <Check size={14} />}</span><div><strong>{item.label}</strong><small>{item.description}</small></div></button>)}</div><p className="template-note">Seçimler bu keşfe özeldir; şablonun aslı değişmez. Kalıcı şablon düzenlemelerini “Ürün & fiyatlar” ekranından yapabilirsiniz.</p></div>}
      {step === 3 && <div className="wizard-section"><div className="section-title"><span>03</span><div><h3>Ürün, ölçü ve metrajlar</h3><p>Seçili iş kalemlerinin ürünlerini ve miktarlarını belirleyin.</p></div></div>{workItemKeys.includes('kombi') && <DeviceSelector title="Kombi" hint="Marka ve kapasite" icon={<Flame size={19} />} products={boilerProducts} selected={selectedBoiler} onSelect={(id) => setBoilerProductId(id)} hidePrices={hidePrices} />}{workItemKeys.includes('isi-pompasi') && <DeviceSelector title="Isı pompası" hint="Marka ve kapasite" icon={<Wind size={19} />} products={heatPumpProducts} selected={selectedHeatPump} onSelect={(id) => setHeatPumpProductId(id)} hidePrices={hidePrices} />}{workItemKeys.includes('klima') && <DeviceSelector title="Klima" hint="Marka ve BTU gücü" icon={<Snowflake size={19} />} products={acProducts} selected={selectedAc} onSelect={(id) => setAcProductId(id)} hidePrices={hidePrices} />}{hasRadiators && <RoomRadiators rooms={rooms} products={radiatorProducts} hidePrices={hidePrices} addingRoom={addingRoom} newRoomName={newRoomName} setAddingRoom={setAddingRoom} setNewRoomName={setNewRoomName} addRoom={addRoom} updateRoom={updateRoom} selectPart={selectRadiatorPart} removeRoom={(id) => setRooms((current) => current.filter((room) => room.id !== id))} />} {availableProducts.length > 0 && <><span className="choice-label">MALZEME, METRAJ VE İŞÇİLİK</span><div className="product-picker">{availableProducts.map((product) => { const line = lines.find((item) => item.productId === product.id); return <div className={`picker-row ${hidePrices ? 'without-price' : ''}`} key={product.id}><div><span>{product.code}</span><strong>{product.name}</strong><small>{product.variant ?? product.unit}{!hidePrices && ` · ${formatCurrency(product.sale)} / ${product.unit}`}</small></div><div className="quantity-input"><button onClick={() => setQuantity(product.id, (line?.quantity ?? 0) - 1)}>−</button><input type="number" min="0" value={line?.quantity ?? 0} onChange={(event) => setQuantity(product.id, Number(event.target.value))} /><button onClick={() => setQuantity(product.id, (line?.quantity ?? 0) + 1)}>+</button><small>{product.unit}</small></div>{!hidePrices && <b>{formatCurrency((line?.quantity ?? 0) * product.sale)}</b>}</div> })}</div></>}<div className="inline-total"><span>{effectiveLines.length} malzeme/hizmet satırı</span>{!hidePrices && <><span>Alış toplamı {formatCurrency(totals.cost)}</span><strong>Satış toplamı {formatCurrency(totals.sale)}</strong></>}</div></div>}
      {step === 4 && <div className={`summary-grid ${hidePrices ? 'no-price-summary' : ''}`}><div className="quote-summary"><div className="section-title"><span>04</span><div><h3>Keşif ve teklif özeti</h3><p>Kaydetmeden önce bilgileri kontrol edin.</p></div></div><dl><div><dt>Müşteri</dt><dd>{customers.find((item) => item.id === customerId)?.name}</dd></div><div><dt>Keşif</dt><dd>{type} · {selectedTemplate?.name}</dd></div><div><dt>Yapılacak işler</dt><dd>{workItemKeys.length} kalem</dd></div><div><dt>Malzeme/hizmet</dt><dd>{effectiveLines.length} satır</dd></div>{hasRadiators && <div><dt>Radyatörler</dt><dd>{rooms.filter((room) => room.radiatorProductId).length} oda</dd></div>}</dl><div className="selected-work-tags">{workItemKeys.map((key) => <span key={key}>{workItemDefinitions.find((item) => item.key === key)?.label}</span>)}</div>{hidePrices && <div className="master-price-note">Usta görünümünde fiyatlar gizlidir. Keşif yönetici fiyatlandırması için taslak kaydedilir.</div>}</div>{!hidePrices && <div className="price-card"><span>TEKLİF HESABI</span><div><small>Satış tutarı</small><strong>{formatCurrency(totals.sale)}</strong></div><div><small>KDV (%20)</small><strong>{formatCurrency(vat)}</strong></div><hr /><div className="grand-total"><small>Genel toplam</small><strong>{formatCurrency(grandTotal)}</strong></div><p>Alış: <b>{formatCurrency(totals.cost)}</b> · Brüt kâr: <b>{formatCurrency(totals.sale - totals.cost)}</b></p></div>}</div>}
    </div>
    <footer className="wizard-footer"><button className="secondary-button" onClick={() => step === 1 ? resetAndClose() : setStep((value) => value - 1)}>{step > 1 && <ArrowLeft size={17} />}{step === 1 ? 'Vazgeç' : 'Geri'}</button>{step < 4 ? <button className="primary-button" disabled={!customerId || (step === 2 && workItemKeys.length === 0) || (step === 3 && effectiveLines.length === 0)} onClick={() => setStep((value) => value + 1)}>Devam et <ArrowRight size={17} /></button> : <button className="primary-button" onClick={save}><Check size={17} /> Keşfi kaydet</button>}</footer>
  </Modal>
}

function DeviceSelector({ title, hint, icon, products, selected, onSelect, hidePrices }: { title: string; hint: string; icon: React.ReactNode; products: Product[]; selected?: Product; onSelect: (id: string) => void; hidePrices: boolean }) {
  const brands = [...new Set(products.map((product) => product.brand).filter(Boolean))]
  const variants = products.filter((product) => product.brand === selected?.brand)
  const changeBrand = (brand: string) => onSelect(products.find((product) => product.brand === brand)?.id ?? '')
  return <div className="boiler-selector"><header><div>{icon}<span><strong>{title}</strong><small>{hint}</small></span></div></header>{selected && <div><label><span>Marka</span><select value={selected.brand} onChange={(event) => changeBrand(event.target.value)}>{brands.map((brand) => <option value={brand} key={brand}>{brand}</option>)}</select></label><label><span>Boyut / güç</span><select value={selected.id} onChange={(event) => onSelect(event.target.value)}>{variants.map((product) => <option value={product.id} key={product.id}>{product.variant}</option>)}</select></label><div><span>Ürün</span><strong>{selected.name}</strong>{!hidePrices && <small>{formatCurrency(selected.sale)}</small>}</div></div>}</div>
}

interface RoomRadiatorsProps {
  rooms: Room[]; products: Product[]; hidePrices: boolean; addingRoom: boolean; newRoomName: string
  setAddingRoom: (value: boolean) => void; setNewRoomName: (value: string) => void; addRoom: () => void
  updateRoom: (id: string, patch: Partial<Room>) => void
  selectPart: (room: Room, field: 'brand' | 'variant', value: string) => void
  removeRoom: (id: string) => void
}

function RoomRadiators({ rooms, products, hidePrices, addingRoom, newRoomName, setAddingRoom, setNewRoomName, addRoom, updateRoom, selectPart, removeRoom }: RoomRadiatorsProps) {
  const totalCm = rooms.reduce((sum, room) => {
    const product = products.find((item) => item.id === room.radiatorProductId)
    const size = Number(product?.variant?.match(/\d+/)?.[0] ?? 0)
    return sum + size * (room.radiatorQuantity ?? 1)
  }, 0)
  return <div className="radiator-section">
    <div className="radiator-section-head"><div><ThermometerSun size={18} /><span><strong>Radyatörler</strong><small>Oda bazında ölçü ve adet</small></span></div><b>Toplam uzunluk: {totalCm} cm</b></div>
    <div className="ready-room-grid">{rooms.map((room, index) => {
      const selected = products.find((product) => product.id === room.radiatorProductId)
      const brands = [...new Set(products.map((product) => product.brand).filter(Boolean))]
      const sizes = [...new Set(products.filter((product) => !selected?.brand || product.brand === selected.brand).map((product) => product.variant).filter(Boolean))]
      return <article className={selected ? 'has-radiator' : ''} key={room.id}>
        <header><span>{index + 1}</span><input value={room.name} onChange={(event) => updateRoom(room.id, { name: event.target.value })} /><button onClick={() => removeRoom(room.id)}><Trash2 size={15} /></button></header>
        <label className="radiator-toggle"><button className={selected ? 'checked' : ''} onClick={() => updateRoom(room.id, { radiatorProductId: selected ? undefined : products[0]?.id, radiatorQuantity: selected ? undefined : 1 })}>{selected && <Check size={13} />}</button><span>Radyatör var</span></label>
        {selected && <div className="radiator-selects"><label><span>Marka</span><select value={selected.brand} onChange={(event) => selectPart(room, 'brand', event.target.value)}>{brands.map((brand) => <option value={brand} key={brand}>{brand}</option>)}</select></label><label><span>Ölçü</span><select value={selected.variant} onChange={(event) => selectPart(room, 'variant', event.target.value)}>{sizes.map((size) => <option value={size} key={size}>{size}</option>)}</select></label><label><span>Adet</span><input type="number" min="1" value={room.radiatorQuantity ?? 1} onChange={(event) => updateRoom(room.id, { radiatorQuantity: Math.max(1, Number(event.target.value)) })} /></label>{!hidePrices && <small>{formatCurrency(selected.sale * (room.radiatorQuantity ?? 1))}</small>}</div>}
      </article>
    })}</div>
    {addingRoom ? <div className="new-room-row"><input value={newRoomName} onChange={(event) => setNewRoomName(event.target.value)} placeholder="Yeni oda adı" autoFocus /><button className="secondary-button" onClick={() => setAddingRoom(false)}>Vazgeç</button><button className="primary-button" onClick={addRoom}>Ekle</button></div> : <button className="dashed-button" onClick={() => setAddingRoom(true)}><Plus size={16} /> Oda ekle</button>}
  </div>
}
