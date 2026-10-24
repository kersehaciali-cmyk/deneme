import { Check, Clock3, Edit3, PackageSearch, Plus, Search, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../components/Modal'
import { workItemDefinitions } from '../data'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/domain'
import type { Product, SurveyTemplate, SurveyType } from '../types'

export function Catalog() {
  const { products, templates, addTemplate } = useApp()
  const [tab, setTab] = useState<'prices' | 'templates'>('prices')
  const [query, setQuery] = useState('')
  const [historyProductId, setHistoryProductId] = useState<string | null>(null)
  const [newTemplateOpen, setNewTemplateOpen] = useState(false)
  const filtered = products.filter((product) => `${product.code} ${product.name} ${product.category} ${product.brand} ${product.variant}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')))
  const averageMargin = Math.round(products.reduce((sum, item) => sum + (item.sale - item.cost) / item.sale, 0) / products.length * 100)
  const historyProduct = products.find((product) => product.id === historyProductId)

  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">KATALOG VE ŞABLON YÖNETİMİ</span><h1>Ürün, fiyat & şablonlar</h1><p>Alış/satış fiyatlarını, fiyat geçmişini ve keşif şablonlarını yönetin.</p></div>{tab === 'templates' && <button className="primary-button" onClick={() => setNewTemplateOpen(true)}><Plus size={16} /> Yeni şablon</button>}</section>
    <section className="catalog-banner"><span><PackageSearch /></span><div><small>Katalog özeti</small><strong>{products.length} aktif ürün ve hizmet</strong></div><div><TrendingUp /><span><small>Ortalama brüt marj</small><strong>%{averageMargin}</strong></span></div></section>
    <div className="catalog-tabs"><button className={tab === 'prices' ? 'active' : ''} onClick={() => setTab('prices')}>Fiyat kataloğu</button><button className={tab === 'templates' ? 'active' : ''} onClick={() => setTab('templates')}>Keşif şablonları</button></div>
    {tab === 'prices' ? <>
      <section className="toolbar panel"><label className="list-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ürün, marka, boyut veya kategori ara…" /></label><div className="result-count"><strong>{filtered.length}</strong> kalem</div></section>
      <section className="panel table-panel"><div className="data-table catalog-table"><div className="table-row table-head"><span>Ürün / hizmet</span><span>Kategori</span><span>Birim</span><span>Alış</span><span>Satış</span><span>Marj</span><span /></div>{filtered.map((product) => <ProductRow product={product} onHistory={() => setHistoryProductId(product.id)} key={product.id} />)}</div></section>
    </> : <section className="template-admin-grid">{templates.map((template) => <TemplateCard template={template} key={template.id} />)}</section>}
    <Modal open={Boolean(historyProduct)} onClose={() => setHistoryProductId(null)} eyebrow="FİYAT GEÇMİŞİ" title={historyProduct?.name ?? 'Fiyat geçmişi'}>
      {historyProduct && <div className="price-history-list"><div className="price-history-head"><span>Tarih</span><span>Alış</span><span>Satış</span></div>{[...(historyProduct.priceHistory ?? [])].reverse().map((entry, index) => <div key={entry.id}><span><Clock3 size={14} /> {new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(entry.date))}{index === 0 && <em>Güncel</em>}</span><strong>{formatCurrency(entry.cost)}</strong><strong>{formatCurrency(entry.sale)}</strong></div>)}</div>}
    </Modal>
    <NewTemplateModal open={newTemplateOpen} onClose={() => setNewTemplateOpen(false)} onSave={(template) => { addTemplate(template); setNewTemplateOpen(false) }} />
  </div>
}

function ProductRow({ product, onHistory }: { product: Product; onHistory: () => void }) {
  const { updateProduct } = useApp()
  const [draft, setDraft] = useState(product)
  const [saved, setSaved] = useState(false)
  const margin = draft.sale > 0 ? Math.round((draft.sale - draft.cost) / draft.sale * 100) : 0
  const save = () => {
    updateProduct(draft)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }
  return <div className="table-row"><span><span><strong>{product.name}</strong><small>{product.code}{product.brand && ` · ${product.brand}`}{product.variant && ` · ${product.variant}`}</small></span></span><span><i className={`type-dot type-${product.category === 'Doğalgaz' ? 'gas' : product.category === 'Sıhhi Tesisat' ? 'water' : product.category === 'Klima' ? 'ac' : product.category === 'Isı Pompası' ? 'heat' : 'general'}`} />{product.category}</span><span>{product.unit}</span><span><label className="money-input"><input aria-label={`${product.name} alış`} type="number" value={draft.cost} onChange={(event) => setDraft({ ...draft, cost: Number(event.target.value) })} /><i>₺</i></label></span><span><label className="money-input"><input aria-label={`${product.name} satış`} type="number" value={draft.sale} onChange={(event) => setDraft({ ...draft, sale: Number(event.target.value) })} /><i>₺</i></label></span><span><strong className={margin < 20 ? 'low-margin' : 'good-margin'}>%{margin}</strong><small>{formatCurrency(draft.sale - draft.cost)}</small></span><span className="row-actions"><button className="history-row" onClick={onHistory}><Clock3 size={13} /></button><button className={`save-row ${saved ? 'saved' : ''}`} onClick={save}>{saved ? <><Check size={15} /> Kaydedildi</> : 'Kaydet'}</button></span></div>
}

function TemplateCard({ template }: { template: SurveyTemplate }) {
  const { updateTemplate } = useApp()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(template)
  const definitions = workItemDefinitions.filter((item) => item.type === template.type)
  const toggle = (key: string) => setDraft((current) => ({ ...current, workItemKeys: current.workItemKeys.includes(key) ? current.workItemKeys.filter((item) => item !== key) : [...current.workItemKeys, key] }))
  const save = () => { updateTemplate(draft); setEditing(false) }
  return <article className="template-admin-card panel"><header><div><span>{template.type}</span>{editing ? <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /> : <h3>{template.name}</h3>}</div><button onClick={() => setEditing((value) => !value)}>{editing ? 'Vazgeç' : <><Edit3 size={14} /> Düzenle</>}</button></header><div className="template-items">{definitions.map((item) => editing ? <label key={item.key}><input type="checkbox" checked={draft.workItemKeys.includes(item.key)} onChange={() => toggle(item.key)} /> {item.label}</label> : template.workItemKeys.includes(item.key) && <span key={item.key}><Check size={12} /> {item.label}</span>)}</div>{editing && <footer><button className="primary-button" onClick={save}>Şablonu kaydet</button></footer>}</article>
}

function NewTemplateModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (template: Omit<SurveyTemplate, 'id'>) => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<SurveyType>('Doğalgaz')
  const [keys, setKeys] = useState<string[]>([])
  const changeType = (value: SurveyType) => { setType(value); setKeys([]) }
  return <Modal open={open} onClose={onClose} eyebrow="YENİ ŞABLON" title="Keşif şablonu oluştur"><div className="modal-form"><div className="form-grid two"><label><span>Şablon adı</span><input value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>Keşif türü</span><select value={type} onChange={(event) => changeType(event.target.value as SurveyType)}>{['Doğalgaz', 'Isı Pompası', 'Sıhhi Tesisat', 'Klima'].map((value) => <option value={value} key={value}>{value}</option>)}</select></label></div><div className="new-template-items">{workItemDefinitions.filter((item) => item.type === type).map((item) => <label key={item.key}><input type="checkbox" checked={keys.includes(item.key)} onChange={() => setKeys((current) => current.includes(item.key) ? current.filter((key) => key !== item.key) : [...current, item.key])} /> {item.label}</label>)}</div><footer className="modal-footer"><button className="secondary-button" onClick={onClose}>Vazgeç</button><button className="primary-button" disabled={!name.trim() || keys.length === 0} onClick={() => onSave({ name: name.trim(), type, workItemKeys: keys })}>Şablonu oluştur</button></footer></div></Modal>
}
