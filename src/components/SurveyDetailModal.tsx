import { Camera, ClipboardList, MapPin, Package, Phone, ThermometerSun, UserRound } from 'lucide-react'
import { workItemDefinitions } from '../data'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/domain'
import { MediaPreview } from './MediaPreview'
import { Modal } from './Modal'

export function SurveyDetailModal({ surveyId, onClose }: { surveyId: string | null; onClose: () => void }) {
  const { surveys, customers, products, templates, role } = useApp()
  const survey = surveys.find((item) => item.id === surveyId)
  if (!survey) return null

  const customer = customers.find((item) => item.id === survey.customerId)
  const template = templates.find((item) => item.id === survey.templateId)
  const hidePrices = role === 'usta'
  const lineSubtotal = survey.lines.reduce((sum, line) => {
    const product = products.find((item) => item.id === line.productId)
    return sum + (line.unitSale ?? product?.sale ?? 0) * line.quantity
  }, 0)
  const lineVat = lineSubtotal * .2
  const hasSnapshotPrices = survey.lines.some((line) => line.unitSale !== undefined)
  const attachments = survey.attachments ?? []
  const selectedRooms = survey.rooms.filter((room) => room.radiatorProductId)

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
          return <article key={room.id}><strong>{room.name}</strong><span>{product?.brand ?? 'Marka yok'} · {product?.variant ?? product?.name ?? 'Ürün bulunamadı'}</span><b>{line?.quantity ?? room.radiatorQuantity ?? 1} adet</b></article>
        })}</div>
      </section>}

      <section className="survey-detail-section">
        <header><div><Package size={17} /><span><strong>Fiyat verilen ürün ve hizmetler</strong><small>{survey.lines.length} satır</small></span></div></header>
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
          <span><small>Kalemler toplamı</small><b>{formatCurrency(lineSubtotal)}</b></span>
          <span><small>KDV (%20)</small><b>{formatCurrency(lineVat)}</b></span>
          <span className="grand"><small>Teklif genel toplamı</small><strong>{formatCurrency(survey.total)}</strong></span>
          {!hasSnapshotPrices && <p>Eski keşif satırlarında güncel katalog birim fiyatları gösterilir; kayıtlı teklif genel toplamı korunur.</p>}
        </div>}
        {hidePrices && <p className="master-price-note">Usta görünümünde teklif fiyatları gizlidir.</p>}
      </section>

      {attachments.length > 0 && <section className="survey-detail-section">
        <header><div><Camera size={17} /><span><strong>Keşif fotoğrafları</strong><small>{attachments.length} fotoğraf</small></span></div></header>
        <div className="readonly-media-grid">{attachments.map((photo) => <article key={photo.id}><MediaPreview id={photo.id} url={photo.url} type="image" alt={photo.description || photo.name} /><div><strong>{photo.name}</strong><p>{photo.description || 'Açıklama eklenmemiş.'}</p><small>{photo.addedBy}</small></div></article>)}</div>
      </section>}
    </div>
  </Modal>
}
