import { Camera, Check, ClipboardList, FileSpreadsheet, MapPin, Package, Phone, Plus, Printer, RotateCcw, ThermometerSun, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { workItemDefinitions } from '../data'
import { useApp } from '../context/AppContext'
import { canViewPrices, formatCurrency } from '../lib/domain'
import { buildApproximateMaterials } from '../lib/materials'
import type { ProjectMaterial } from '../types'
import { MediaPreview } from './MediaPreview'
import { Modal } from './Modal'

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)
const spreadsheetCell = (value: unknown) => {
  const text = String(value ?? '').replace(/[\t\r\n]+/g, ' ').trim()
  return /^[=+\-@]/.test(text) ? `'${text}` : text
}

export function SurveyDetailModal({ surveyId, onClose }: { surveyId: string | null; onClose: () => void }) {
  const { surveys, customers, products, templates, role, updateSurvey } = useApp()
  const [newMaterial, setNewMaterial] = useState({ label: '', quantity: 1, unit: 'adet' })
  const survey = surveys.find((item) => item.id === surveyId)
  if (!survey) return null

  const customer = customers.find((item) => item.id === survey.customerId)
  const template = templates.find((item) => item.id === survey.templateId)
  const hidePrices = !canViewPrices(role)
  const lineSubtotal = survey.lines.reduce((sum, line) => {
    const product = products.find((item) => item.id === line.productId)
    return sum + (line.unitSale ?? product?.sale ?? 0) * line.quantity
  }, 0)
  const hasSnapshotPrices = survey.lines.some((line) => line.unitSale !== undefined)
  const attachments = survey.attachments ?? []
  const selectedRooms = survey.rooms.filter((room) => {
    const radiatorLine = survey.lines.find((line) => line.roomId === room.id && line.productId === room.radiatorProductId)
    return Boolean(room.radiatorProductId) && (radiatorLine?.quantity ?? room.radiatorQuantity ?? 0) > 0
  })
  const materialDefaults = buildApproximateMaterials(survey, template, products)
  const materials = survey.materials ?? materialDefaults
  const canEditMaterials = role === 'admin' || role === 'usta'
  const updateMaterials = (next: ProjectMaterial[]) => updateSurvey({ ...survey, materials: next })
  const updateMaterial = (id: string, patch: Partial<ProjectMaterial>) => updateMaterials(materials.map((item) => item.id === id ? { ...item, ...patch } : item))
  const addMaterial = () => {
    if (!newMaterial.label.trim()) return
    updateMaterials([...materials, { id: `survey-material-${Date.now()}`, label: newMaterial.label.trim(), quantity: Math.max(0, newMaterial.quantity), unit: newMaterial.unit.trim() || 'adet', prepared: false }])
    setNewMaterial({ label: '', quantity: 1, unit: 'adet' })
  }
  const exportMaterials = () => {
    const rows = [['Sıra', 'Kontrol', 'Malzeme', 'Miktar', 'Birim', 'Not'], ...materials.map((item, index) => [String(index + 1), item.prepared ? '☑' : '☐', item.label, String(item.quantity), item.unit, ''])]
    const blob = new Blob([`\ufeff${rows.map((row) => row.map(spreadsheetCell).join('\t')).join('\n')}`], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${survey.id}-malzeme-checklist.xls`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const printMaterials = () => {
    const popup = window.open('', '_blank', 'width=900,height=720')
    if (!popup) return
    const rows = materials.map((item, index) => `<tr><td>${index + 1}</td><td class="check">${item.prepared ? '&#9745;' : '&#9744;'}</td><td>${escapeHtml(item.label)}</td><td>${item.quantity}</td><td>${escapeHtml(item.unit)}</td><td class="note"></td></tr>`).join('')
    popup.document.write(`<html><head><meta charset="utf-8"><title>${escapeHtml(survey.id)} Malzeme Checklist</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial;color:#173333;margin:0}header{display:flex;justify-content:space-between;border-bottom:3px solid #176b87;padding-bottom:12px}.brand{color:#176b87;font-weight:800}h1{font-size:21px;margin:3px 0}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 22px;margin:16px 0;font-size:12px}.meta span{border-bottom:1px solid #ccd7d5;padding:5px 0}.meta b{display:block;color:#71817e;font-size:9px;margin-bottom:3px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #9caaa7;padding:8px;text-align:left}th{background:#e9f1f4}td:first-child{width:38px;text-align:center}.check{width:52px;text-align:center;font-size:21px}.note{width:130px;height:34px}.sign{display:grid;grid-template-columns:1fr 1fr;gap:70px;margin-top:38px}.sign div{border-top:1px solid #758481;padding-top:5px;text-align:center;font-size:10px}footer{margin-top:12px;color:#758481;font-size:9px}</style></head><body><header><div><div class="brand">Tesisat PRO</div><h1>Keşif Malzeme Kontrol Listesi</h1></div><strong>${escapeHtml(survey.id)}</strong></header><div class="meta"><span><b>MÜŞTERİ</b>${escapeHtml(customer?.name ?? '')}</span><span><b>KEŞİF TÜRÜ</b>${escapeHtml(survey.type)}</span><span><b>ŞABLON</b>${escapeHtml(template?.name ?? 'Şablonsuz')}</span><span><b>ADRES</b>${escapeHtml(survey.siteAddress ?? customer?.address ?? '')}</span></div><table><thead><tr><th>No</th><th>Kontrol</th><th>Malzeme</th><th>Miktar</th><th>Birim</th><th>Not</th></tr></thead><tbody>${rows}</tbody></table><div class="sign"><div>Hazırlayan</div><div>Kontrol eden</div></div><footer>Bu liste keşif seçimlerinden yaklaşık olarak oluşturulmuştur. Sipariş öncesinde miktarları kontrol ediniz.</footer><script>window.onload=()=>window.print()</script></body></html>`)
    popup.document.close()
  }

  return <Modal open onClose={onClose} eyebrow="KEŞİF İÇERİĞİ" title={`${survey.id} · ${survey.type}`} wide>
    <div className="survey-detail-modal">
      <section className="survey-detail-hero">
        <div>
          <span>ÖDEME MÜŞTERİSİ</span>
          <strong><UserRound size={16} /> {customer?.name ?? 'Müşteri bulunamadı'}</strong>
          <small>{customer?.phone} {customer?.district && `· ${customer.district}`}</small>
        </div>
        <div>
          <span>KEŞİF</span>
          <strong><ClipboardList size={16} /> {template?.name ?? survey.type}</strong>
          <small>{new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(survey.createdAt))} · {survey.owner}</small>
        </div>
        <div className="survey-detail-status">
          <span>DURUM</span>
          <em>{survey.status}</em>
          {!hidePrices && <strong>{formatCurrency(survey.total)}</strong>}
        </div>
      </section>

      <section className="survey-detail-site">
        <header><MapPin size={17} /><div><strong>Keşif / uygulama noktası</strong><small>Ödeme müşterisinden ayrı saha bilgileri</small></div></header>
        <div><span><MapPin size={14} /><b>{survey.siteAddress ?? customer?.address ?? 'Adres girilmemiş'}</b></span><span><UserRound size={14} /><b>{survey.siteContactName ?? customer?.name ?? 'İletişim kişisi yok'}</b></span><span><Phone size={14} /><b>{survey.siteContactPhone ?? customer?.phone ?? 'Telefon yok'}</b></span></div>
        {(survey.latitude !== undefined && survey.longitude !== undefined) && <small>Konum: {survey.latitude}, {survey.longitude}</small>}
      </section>

      <section className="survey-detail-section">
        <header><div><ClipboardList size={17} /><span><strong>Yapılacak işler</strong><small>{survey.workItemKeys?.length ?? 0} iş kalemi</small></span></div></header>
        {(survey.workItemKeys?.length ?? 0) > 0 ? <div className="survey-detail-tags">{survey.workItemKeys?.map((key) => <span key={key}>{workItemDefinitions.find((item) => item.key === key)?.label ?? key}</span>)}</div> : <p className="survey-detail-empty">Bu keşifte iş kalemi kaydı bulunmuyor.</p>}
      </section>

      {selectedRooms.length > 0 && <section className="survey-detail-section">
        <header><div><ThermometerSun size={17} /><span><strong>Oda ve radyatörler</strong><small>{selectedRooms.length} oda</small></span></div></header>
        <div className="survey-detail-radiators">{selectedRooms.map((room) => {
          const product = products.find((item) => item.id === room.radiatorProductId)
          const line = survey.lines.find((item) => item.roomId === room.id && item.productId === room.radiatorProductId)
          return <article key={room.id}><strong>{room.name}</strong><span>{product?.brand ?? 'Marka yok'} · {product?.variant ?? product?.name ?? 'Ürün bulunamadı'}</span><b>{line?.quantity ?? room.radiatorQuantity ?? 0} adet</b></article>
        })}</div>
      </section>}

      <section className="survey-detail-section">
        <header><div><Package size={17} /><span><strong>Seçilen ürün ve hizmetler</strong><small>{survey.lines.length} satır</small></span></div></header>
        {survey.lines.length > 0 ? <div className="survey-detail-table-wrap"><div className={`survey-detail-table ${hidePrices ? 'without-price' : ''}`}>
          <div className="survey-detail-table-head"><span>Ürün / hizmet</span><span>Oda</span><span>Miktar</span>{!hidePrices && <><span>Birim fiyat</span><span>Tutar</span></>}</div>
          {survey.lines.map((line) => {
            const product = products.find((item) => item.id === line.productId)
            const room = survey.rooms.find((item) => item.id === line.roomId)
            const unitSale = line.unitSale ?? product?.sale ?? 0
            const roomLabel = product?.group === 'Radyatör' ? (room?.name ?? 'Oda belirtilmemiş') : 'Genel'
            return <div className="survey-detail-table-row" key={line.id}>
              <span><strong>{product?.name ?? line.productId}</strong><small>{[product?.code, product?.brand, product?.variant].filter(Boolean).join(' · ')}</small></span>
              <span>{roomLabel}</span>
              <span>{line.quantity} {product?.unit ?? 'adet'}</span>
              {!hidePrices && <><span>{formatCurrency(unitSale)}</span><span><strong>{formatCurrency(unitSale * line.quantity)}</strong></span></>}
            </div>
          })}
        </div></div> : <p className="survey-detail-empty">Bu keşifte fiyatlandırılmış ürün veya hizmet bulunmuyor.</p>}
        {!hidePrices && <div className="survey-detail-totals">
          <span className="grand"><small>Teklif toplamı</small><strong>{formatCurrency(survey.total || lineSubtotal)}</strong></span>
          {!hasSnapshotPrices && <p>Eski keşif satırlarında güncel katalog birim fiyatları gösterilir; kayıtlı teklif genel toplamı korunur.</p>}
        </div>}
        {hidePrices && <p className="master-price-note">Bu kullanıcı rolünde teklif fiyatları gizlidir.</p>}
      </section>

      <section className="survey-detail-section survey-material-section">
        <header className="survey-material-head"><div><Package size={17} /><span><strong>Malzeme checklist</strong><small>{materials.length} kalem · keşif ve şablondan yaklaşık oluşturulur</small></span></div><div className="survey-material-actions">{canEditMaterials && <button onClick={() => updateMaterials(materialDefaults)}><RotateCcw size={14} /> Yeniden oluştur</button>}<button onClick={printMaterials}><Printer size={14} /> PDF checklist</button><button onClick={exportMaterials}><FileSpreadsheet size={14} /> Excel</button></div></header>
        <div className="survey-material-table"><div className="survey-material-table-head"><span>Kontrol</span><span>Malzeme</span><span>Miktar</span><span>Birim</span><span /></div>{materials.map((material) => <div className="survey-material-row" key={material.id}><button disabled={!canEditMaterials} className={material.prepared ? 'checked' : ''} onClick={() => updateMaterial(material.id, { prepared: !material.prepared })}>{material.prepared && <Check size={13} />}</button><input disabled={!canEditMaterials} value={material.label} onChange={(event) => updateMaterial(material.id, { label: event.target.value })} /><input disabled={!canEditMaterials} type="number" min="0" value={material.quantity} onChange={(event) => updateMaterial(material.id, { quantity: Math.max(0, Number(event.target.value)) })} /><input disabled={!canEditMaterials} value={material.unit} onChange={(event) => updateMaterial(material.id, { unit: event.target.value })} />{canEditMaterials ? <button className="survey-material-delete" onClick={() => updateMaterials(materials.filter((item) => item.id !== material.id))}><Trash2 size={14} /></button> : <span />}</div>)}{materials.length === 0 && <p className="survey-detail-empty">Malzeme kalemi bulunmuyor. Aşağıdan ekleyebilir veya şablondan yeniden oluşturabilirsiniz.</p>}</div>
        {canEditMaterials && <div className="survey-material-add"><input value={newMaterial.label} onChange={(event) => setNewMaterial({ ...newMaterial, label: event.target.value })} placeholder="Yeni malzeme" /><input type="number" min="0" value={newMaterial.quantity} onChange={(event) => setNewMaterial({ ...newMaterial, quantity: Number(event.target.value) })} /><input value={newMaterial.unit} onChange={(event) => setNewMaterial({ ...newMaterial, unit: event.target.value })} /><button onClick={addMaterial}><Plus size={14} /> Ekle</button></div>}
      </section>

      {attachments.length > 0 && <section className="survey-detail-section">
        <header><div><Camera size={17} /><span><strong>Keşif fotoğrafları</strong><small>{attachments.length} fotoğraf</small></span></div></header>
        <div className="readonly-media-grid">{attachments.map((photo) => <article key={photo.id}><MediaPreview id={photo.id} url={photo.url} type="image" alt={photo.description || photo.name} /><div><strong>{photo.name}</strong><p>{photo.description || 'Açıklama eklenmemiş.'}</p><small>{photo.addedBy}</small></div></article>)}</div>
      </section>}
    </div>
  </Modal>
}
