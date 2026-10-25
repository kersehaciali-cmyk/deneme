import { AlertTriangle, Check, Plus, Save, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { workItemDefinitions } from '../data'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/domain'
import { buildApproximateMaterials } from '../lib/materials'
import { applySurveyPricing, hasSurveyMaterialChanges, hasSurveyPricingChanges } from '../lib/surveyEdit'
import type { Room, Survey, SurveyLine, SurveyStatus, SurveyType } from '../types'
import { Modal } from './Modal'

const surveyTypes: SurveyType[] = ['Doğalgaz', 'Isı Pompası', 'Sıhhi Tesisat', 'Klima']
const surveyStatuses: SurveyStatus[] = ['Taslak', 'Fiyatlandırıldı', 'Teklif Gönderildi', 'Kabul Edildi', 'Onaylandı', 'Siparişe Alındı', 'Reddedildi']

function cloneSurvey(survey: Survey): Survey {
  return {
    ...survey,
    rooms: survey.rooms.map((room) => ({ ...room })),
    lines: survey.lines.map((line) => ({ ...line })),
    workItemKeys: [...(survey.workItemKeys ?? [])],
    attachments: survey.attachments?.map((attachment) => ({ ...attachment })),
    materials: survey.materials?.map((material) => ({ ...material })),
    auditLog: survey.auditLog?.map((entry) => ({ ...entry, changes: entry.changes.map((change) => ({ ...change })) })),
  }
}

export function SurveyEditModal({ surveyId, onClose }: { surveyId: string; onClose: () => void }) {
  const { surveys, customers, products, templates, projects, role, updateSurveyWithAudit } = useApp()
  const survey = surveys.find((item) => item.id === surveyId)
  const [draft, setDraft] = useState<Survey | null>(() => survey ? cloneSurvey(survey) : null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const linkedProject = projects.find((project) => project.surveyId === surveyId)

  const currentProducts = useMemo(() => products.filter((product) => product.category === draft?.type || product.category === 'Genel'), [draft?.type, products])
  const pricingChanged = Boolean(survey && draft && hasSurveyPricingChanges(survey, draft))
  const materialSelectionsChanged = Boolean(survey && draft && hasSurveyMaterialChanges(survey, draft))
  const liveTotal = useMemo(() => {
    if (!pricingChanged) return survey?.total ?? 0
    return (draft?.lines ?? []).reduce((sum, line) => {
      const product = products.find((item) => item.id === line.productId)
      return sum + (product?.sale ?? line.unitSale ?? 0) * Math.max(0, line.quantity)
    }, 0)
  }, [draft?.lines, pricingChanged, products, survey?.total])
  const liveCost = useMemo(() => (draft?.lines ?? []).reduce((sum, line) => {
    const product = products.find((item) => item.id === line.productId)
    const unitCost = pricingChanged ? (product?.cost ?? line.unitCost ?? 0) : (line.unitCost ?? product?.cost ?? 0)
    return sum + unitCost * Math.max(0, line.quantity)
  }, 0), [draft?.lines, pricingChanged, products])

  if (role !== 'admin' || !survey || !draft) return null

  const changeType = (type: SurveyType) => {
    const template = templates.find((item) => item.type === type)
    setDraft((current) => current ? {
      ...current,
      type,
      templateId: template?.id,
      workItemKeys: [...(template?.workItemKeys ?? [])],
      lines: [],
      rooms: current.rooms.map(({ radiatorProductId: _radiatorProductId, radiatorQuantity: _radiatorQuantity, ...room }) => room),
    } : current)
  }
  const changeTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId)
    setDraft((current) => current ? { ...current, templateId, workItemKeys: [...(template?.workItemKeys ?? [])] } : current)
  }
  const toggleWorkItem = (key: string) => setDraft((current) => {
    if (!current) return current
    const keys = current.workItemKeys ?? []
    return { ...current, workItemKeys: keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key] }
  })
  const updateRoom = (id: string, patch: Partial<Room>) => setDraft((current) => current ? { ...current, rooms: current.rooms.map((room) => room.id === id ? { ...room, ...patch } : room) } : current)
  const addRoom = () => setDraft((current) => current ? { ...current, rooms: [...current.rooms, { id: `room-edit-${Date.now()}`, name: 'Yeni Oda' }] } : current)
  const removeRoom = (id: string) => setDraft((current) => current ? { ...current, rooms: current.rooms.filter((room) => room.id !== id), lines: current.lines.filter((line) => line.roomId !== id) } : current)
  const updateLine = (id: string, patch: Partial<SurveyLine>) => setDraft((current) => {
    if (!current) return current
    const previous = current.lines.find((line) => line.id === id)
    if (!previous) return current
    const nextLine = { ...previous, ...patch, quantity: Math.max(0, patch.quantity ?? previous.quantity) }
    const oldProduct = products.find((product) => product.id === previous.productId)
    const nextProduct = products.find((product) => product.id === nextLine.productId)
    const rooms = current.rooms.map((room) => {
      if (oldProduct?.group === 'Radyatör' && room.id === previous.roomId && (nextProduct?.group !== 'Radyatör' || nextLine.roomId !== previous.roomId)) {
        return { ...room, radiatorQuantity: 0 }
      }
      if (nextProduct?.group === 'Radyatör' && room.id === nextLine.roomId) {
        return { ...room, radiatorProductId: nextProduct.id, radiatorQuantity: nextLine.quantity }
      }
      return room
    })
    return { ...current, rooms, lines: current.lines.map((line) => line.id === id ? nextLine : line) }
  })
  const addLine = () => {
    const product = currentProducts[0]
    if (!product) return
    setDraft((current) => current ? { ...current, lines: [...current.lines, { id: `line-edit-${Date.now()}`, productId: product.id, roomId: current.rooms[0]?.id ?? '', quantity: 1 }] } : current)
  }
  const removeLine = (id: string) => setDraft((current) => {
    if (!current) return current
    const removed = current.lines.find((line) => line.id === id)
    const product = products.find((item) => item.id === removed?.productId)
    const rooms = product?.group === 'Radyatör' && removed
      ? current.rooms.map((room) => room.id === removed.roomId ? { ...room, radiatorQuantity: 0 } : room)
      : current.rooms
    return { ...current, rooms, lines: current.lines.filter((line) => line.id !== id) }
  })
  const save = async () => {
    const editableDraft: Survey = linkedProject ? {
      ...draft,
      customerId: survey.customerId,
      type: survey.type,
      status: survey.status,
      templateId: survey.templateId,
      workItemKeys: [...(survey.workItemKeys ?? [])],
      rooms: survey.rooms.map((room) => ({ ...room })),
      lines: survey.lines.map((line) => ({ ...line })),
      materials: survey.materials?.map((material) => ({ ...material })),
    } : draft
    if (!editableDraft.customerId || !editableDraft.siteAddress?.trim() || !editableDraft.siteContactName?.trim() || !editableDraft.siteContactPhone?.trim()) {
      setError('Müşteri, uygulama adresi ve saha iletişim bilgilerini doldurun.')
      return
    }
    if (editableDraft.lines.some((line) => !line.productId || !Number.isFinite(line.quantity) || line.quantity < 0)) {
      setError('Ürün kalemlerindeki miktarları kontrol edin.')
      return
    }
    const { lines, total } = applySurveyPricing(survey, editableDraft, products)
    const next: Survey = { ...editableDraft, lines, total }
    next.materials = !linkedProject && materialSelectionsChanged
      ? buildApproximateMaterials(next, templates.find((item) => item.id === next.templateId), products)
      : survey.materials?.map((material) => ({ ...material }))
    setSaving(true); setError('')
    try {
      await updateSurveyWithAudit(next)
      onClose()
    } catch {
      setError('Değişiklikler buluta kaydedilemedi. İnternet bağlantısını kontrol edip yeniden deneyin.')
      setSaving(false)
    }
  }

  const typeTemplates = templates.filter((template) => template.type === draft.type)
  const typeWorkItems = workItemDefinitions.filter((item) => item.type === draft.type)

  return <Modal open onClose={() => { if (!saving) onClose() }} eyebrow="KEŞİF DÜZENLEME" title={`${draft.id} · Mevcut keşfi düzenle`} wide>
    <div className="survey-edit-modal">
      {linkedProject && <div className="survey-edit-warning"><AlertTriangle size={18} /><span><strong>Bu keşif {linkedProject.id} projesine bağlıdır.</strong> Proje ve usta kontrol listesiyle tutarlılığı korumak için müşteri, durum, teknik kalemler ve fiyatlandırma kilitlidir. Yalnız uygulama adresi, iletişim ve konum bilgilerini değiştirebilirsiniz.</span></div>}

      <section className="survey-edit-section">
        <header><strong>Temel bilgiler</strong><small>{linkedProject ? 'Projeye dönüşen keşiflerde bu bilgiler kilitlidir.' : 'Keşif türü değiştirildiğinde eski ürün ve radyatör seçimleri sıfırlanır.'}</small></header>
        <div className="survey-edit-grid four">
          <label><span>Müşteri</span><select disabled={Boolean(linkedProject)} value={draft.customerId} onChange={(event) => setDraft({ ...draft, customerId: event.target.value })}>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} · {customer.phone}</option>)}</select></label>
          <label><span>Keşif türü</span><select disabled={Boolean(linkedProject)} value={draft.type} onChange={(event) => changeType(event.target.value as SurveyType)}>{surveyTypes.map((type) => <option value={type} key={type}>{type}</option>)}</select></label>
          <label><span>Şablon</span><select disabled={Boolean(linkedProject)} value={draft.templateId ?? ''} onChange={(event) => changeTemplate(event.target.value)}><option value="">Şablonsuz</option>{typeTemplates.map((template) => <option value={template.id} key={template.id}>{template.name}</option>)}</select></label>
          <label><span>Durum</span><select disabled={Boolean(linkedProject) || draft.status === 'Projeye Dönüştü'} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as SurveyStatus })}>{draft.status === 'Projeye Dönüştü' && <option value="Projeye Dönüştü">Projeye Dönüştü</option>}{surveyStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select></label>
        </div>
      </section>

      <section className="survey-edit-section">
        <header><strong>Uygulama noktası</strong><small>Ödeme müşterisinden bağımsız saha bilgileri.</small></header>
        <div className="survey-edit-grid three">
          <label className="wide"><span>Adres</span><input value={draft.siteAddress ?? ''} onChange={(event) => setDraft({ ...draft, siteAddress: event.target.value })} /></label>
          <label><span>İletişim kişisi</span><input value={draft.siteContactName ?? ''} onChange={(event) => setDraft({ ...draft, siteContactName: event.target.value })} /></label>
          <label><span>İletişim telefonu</span><input value={draft.siteContactPhone ?? ''} onChange={(event) => setDraft({ ...draft, siteContactPhone: event.target.value })} /></label>
          <label><span>Enlem</span><input type="number" step="any" value={draft.latitude ?? ''} onChange={(event) => setDraft({ ...draft, latitude: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
          <label><span>Boylam</span><input type="number" step="any" value={draft.longitude ?? ''} onChange={(event) => setDraft({ ...draft, longitude: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
        </div>
      </section>

      <section className="survey-edit-section">
        <header><strong>Yapılacak işler</strong><small>Şablondan gelen seçimleri bu keşfe özel değiştirebilirsiniz.</small></header>
        <div className="survey-edit-work-items">{typeWorkItems.map((item) => <button type="button" disabled={Boolean(linkedProject)} className={(draft.workItemKeys ?? []).includes(item.key) ? 'selected' : ''} onClick={() => toggleWorkItem(item.key)} key={item.key}><span>{(draft.workItemKeys ?? []).includes(item.key) && <Check size={13} />}</span>{item.label}</button>)}</div>
      </section>

      <section className="survey-edit-section">
        <header><div><strong>Odalar</strong><small>{linkedProject ? 'Projeye bağlı oda bilgileri salt okunurdur.' : 'Oda isimleri ve radyatör adetleri değişiklik geçmişine kaydedilir.'}</small></div><button type="button" disabled={Boolean(linkedProject)} onClick={addRoom}><Plus size={14} /> Oda ekle</button></header>
        <div className="survey-edit-room-list">{draft.rooms.map((room, index) => <div key={room.id}><span>{index + 1}</span><input disabled={Boolean(linkedProject)} value={room.name} onChange={(event) => updateRoom(room.id, { name: event.target.value })} /><small>{room.radiatorQuantity ?? 0} radyatör</small><button type="button" disabled={Boolean(linkedProject)} onClick={() => removeRoom(room.id)}><Trash2 size={14} /></button></div>)}</div>
      </section>

      <section className="survey-edit-section">
        <header><div><strong>Ürün, miktar ve fiyatlandırma</strong><small>{linkedProject ? 'Projeye bağlı teklif kalemleri salt okunurdur.' : 'Kaydederken güncel katalog fiyatları teklif üzerine alınır.'}</small></div><button type="button" disabled={Boolean(linkedProject)} onClick={addLine}><Plus size={14} /> Kalem ekle</button></header>
        <div className="survey-edit-lines"><div className="survey-edit-line head"><span>Ürün / hizmet</span><span>Oda</span><span>Miktar</span><span>Birim fiyat</span><span>Tutar</span><span /></div>{draft.lines.map((line) => {
          const selectedProduct = products.find((product) => product.id === line.productId)
          const choices = currentProducts.some((product) => product.id === line.productId) || !selectedProduct ? currentProducts : [selectedProduct, ...currentProducts]
          const unitSale = pricingChanged ? (selectedProduct?.sale ?? line.unitSale ?? 0) : (line.unitSale ?? selectedProduct?.sale ?? 0)
          return <div className="survey-edit-line" key={line.id}>
            <select disabled={Boolean(linkedProject)} value={line.productId} onChange={(event) => updateLine(line.id, { productId: event.target.value })}>{choices.map((product) => <option value={product.id} key={product.id}>{product.name}{product.brand ? ` · ${product.brand}` : ''}{product.variant ? ` · ${product.variant}` : ''}</option>)}</select>
            <select disabled={Boolean(linkedProject)} value={line.roomId} onChange={(event) => updateLine(line.id, { roomId: event.target.value })}><option value="">Genel</option>{draft.rooms.map((room) => <option value={room.id} key={room.id}>{room.name}</option>)}</select>
            <input disabled={Boolean(linkedProject)} type="number" min="0" step="any" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })} />
            <span>{formatCurrency(unitSale)}</span><strong>{formatCurrency(unitSale * line.quantity)}</strong>
            <button type="button" disabled={Boolean(linkedProject)} onClick={() => removeLine(line.id)}><Trash2 size={14} /></button>
          </div>
        })}</div>
        <div className="survey-edit-totals"><span>İç maliyet <b>{formatCurrency(liveCost)}</b></span><span>Önceki teklif <b>{formatCurrency(survey.total)}</b></span><strong>Yeni teklif {formatCurrency(liveTotal)}</strong></div>
      </section>

      {error && <div className="auth-message error">{error}</div>}
      <footer className="modal-footer"><button className="secondary-button" type="button" onClick={onClose} disabled={saving}>Vazgeç</button><button className="primary-button" type="button" onClick={() => { void save() }} disabled={saving}><Save size={15} /> {saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}</button></footer>
    </div>
  </Modal>
}
