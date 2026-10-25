import { Check, Clock3, Download, Edit3, PackageSearch, Plus, Search, Trash2, TrendingUp, Upload } from 'lucide-react'
import { useEffect, useState, type ChangeEvent } from 'react'
import { Modal } from '../components/Modal'
import { workItemDefinitions } from '../data'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/domain'
import { sortNewestFirst } from '../lib/domain'
import { templateMaterialItems } from '../lib/materials'
import type { MaterialTemplateItem, Product, SurveyTemplate, SurveyType } from '../types'

export function Catalog() {
  const { products, templates, addTemplate, updateProduct } = useApp()
  const [tab, setTab] = useState<'prices' | 'templates'>('prices')
  const [query, setQuery] = useState('')
  const [historyProductId, setHistoryProductId] = useState<string | null>(null)
  const [newTemplateOpen, setNewTemplateOpen] = useState(false)
  const [priceFileMessage, setPriceFileMessage] = useState('')
  const [priceFileError, setPriceFileError] = useState('')
  const filtered = products.filter((product) => `${product.code} ${product.name} ${product.category} ${product.brand} ${product.variant}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')))
  const averageMargin = Math.round(products.reduce((sum, item) => sum + (item.sale - item.cost) / item.sale, 0) / products.length * 100)
  const historyProduct = products.find((product) => product.id === historyProductId)
  const sortedTemplates = sortNewestFirst(templates)
  const exportPrices = () => {
    const headers = ['Kod', 'Ürün', 'Kategori', 'Birim', 'Marka', 'Varyant', 'Alış Fiyatı', 'Satış Fiyatı']
    const rows = products.map((product) => [product.code, product.name, product.category, product.unit, product.brand ?? '', product.variant ?? '', String(product.cost), String(product.sale)])
    const safeCell = (value: string) => {
      const clean = value.replace(/[\t\r\n]+/g, ' ').trim()
      return /^[=+\-@]/.test(clean) ? `'${clean}` : clean
    }
    const blob = new Blob([`\ufeff${[headers, ...rows].map((row) => row.map(safeCell).join('\t')).join('\n')}`], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Tesisat-PRO-Urun-Fiyatlari-${new Date().toISOString().slice(0, 10)}.xls`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const importPrices = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPriceFileError(''); setPriceFileMessage('')
    if (file.size > 5 * 1024 * 1024) {
      setPriceFileError('Fiyat dosyası 5 MB sınırını aşamaz.')
      return
    }
    try {
      const raw = (await file.text()).replace(/^\ufeff/, '')
      const lines = raw.split(/\r?\n/).filter((line) => line.trim())
      if (lines.length < 2) throw new Error('Dosyada güncellenecek ürün satırı bulunamadı.')
      const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ','
      const parseRow = (line: string) => {
        const values: string[] = []
        let current = ''
        let quoted = false
        for (let index = 0; index < line.length; index += 1) {
          const character = line[index]
          if (character === '"' && line[index + 1] === '"' && quoted) { current += '"'; index += 1 }
          else if (character === '"') quoted = !quoted
          else if (character === delimiter && !quoted) { values.push(current.trim()); current = '' }
          else current += character
        }
        values.push(current.trim())
        return values
      }
      const normalizeHeader = (value: string) => value.trim().toLocaleLowerCase('tr-TR')
      const headers = parseRow(lines[0]).map(normalizeHeader)
      const codeIndex = headers.indexOf('kod')
      const costIndex = headers.indexOf('alış fiyatı')
      const saleIndex = headers.indexOf('satış fiyatı')
      if (codeIndex < 0 || costIndex < 0 || saleIndex < 0) throw new Error('Dosya biçimi geçersiz. “Kod”, “Alış Fiyatı” ve “Satış Fiyatı” sütunları korunmalıdır.')
      const parsePrice = (value: string) => {
        let cleaned = value.replace(/[₺\s]/g, '').replace(/[^\d,.-]/g, '')
        if (cleaned.includes(',') && cleaned.includes('.')) {
          const decimal = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.') ? ',' : '.'
          cleaned = cleaned.replace(decimal === ',' ? /\./g : /,/g, '').replace(decimal, '.')
        } else if (cleaned.includes(',')) cleaned = cleaned.replace(',', '.')
        const number = Number(cleaned)
        return Number.isFinite(number) && number >= 0 ? number : undefined
      }
      let updated = 0
      const issues: string[] = []
      const changes: Array<{ product: Product; rowNumber: number }> = []
      lines.slice(1).forEach((line, rowIndex) => {
        const columns = parseRow(line)
        const code = (columns[codeIndex] ?? '').replace(/^'/, '').trim()
        const product = products.find((item) => item.code.toLocaleLowerCase('tr-TR') === code.toLocaleLowerCase('tr-TR'))
        if (!product) { issues.push(`${rowIndex + 2}. satır: “${code || 'kodsuz'}” bulunamadı`); return }
        const cost = parsePrice(columns[costIndex] ?? '')
        const sale = parsePrice(columns[saleIndex] ?? '')
        if (cost === undefined || sale === undefined) { issues.push(`${rowIndex + 2}. satır: geçersiz fiyat`); return }
        if (cost !== product.cost || sale !== product.sale) {
          changes.push({ product: { ...product, cost, sale }, rowNumber: rowIndex + 2 })
        }
      })
      for (const change of changes) {
        try {
          await updateProduct(change.product)
          updated += 1
        } catch {
          issues.push(`${change.rowNumber}. satır: buluta kaydedilemedi`)
        }
      }
      if (issues.length > 0) setPriceFileError(`${issues.slice(0, 3).join(' · ')}${issues.length > 3 ? ` · ${issues.length - 3} hata daha` : ''}`)
      setPriceFileMessage(`${updated} ürünün fiyatı güncellendi${updated === 0 ? ' (değişiklik bulunamadı)' : ''}.`)
    } catch (reason) {
      setPriceFileError(reason instanceof Error ? reason.message : 'Fiyat dosyası okunamadı.')
    }
  }

  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">KATALOG VE ŞABLON YÖNETİMİ</span><h1>Ürün, fiyat & şablonlar</h1><p>Alış maliyetini, müşteriye uygulanacak tek satış fiyatını ve fiyat geçmişini yönetin.</p></div>{tab === 'templates' && <button className="primary-button" onClick={() => setNewTemplateOpen(true)}><Plus size={16} /> Yeni şablon</button>}</section>
    <section className="catalog-banner"><span><PackageSearch /></span><div><small>Katalog özeti</small><strong>{products.length} aktif ürün ve hizmet</strong></div><div><TrendingUp /><span><small>Ortalama brüt marj</small><strong>%{averageMargin}</strong></span></div></section>
    <div className="catalog-tabs"><button className={tab === 'prices' ? 'active' : ''} onClick={() => setTab('prices')}>Fiyat kataloğu</button><button className={tab === 'templates' ? 'active' : ''} onClick={() => setTab('templates')}>Keşif şablonları</button></div>
    {tab === 'prices' ? <>
      <section className="toolbar panel catalog-price-toolbar"><label className="list-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ürün, marka, boyut veya kategori ara…" /></label><div className="catalog-price-actions"><button className="secondary-button" onClick={exportPrices}><Download size={15} /> Excel indir</button><label className="secondary-button catalog-file-button"><Upload size={15} /> Excel yükle<input type="file" accept=".xls,.csv,.tsv,text/tab-separated-values,text/csv" onChange={(event) => { void importPrices(event) }} /></label><div className="result-count"><strong>{filtered.length}</strong> kalem</div></div></section>
      {priceFileMessage && <div className="page-message success">{priceFileMessage}</div>}{priceFileError && <div className="page-message error">{priceFileError}</div>}
      <section className="panel table-panel"><div className="data-table catalog-table"><div className="table-row table-head"><span>Ürün / hizmet</span><span>Kategori</span><span>Birim</span><span>Alış</span><span>Satış</span><span>Marj</span><span /></div>{filtered.map((product) => <ProductRow product={product} onHistory={() => setHistoryProductId(product.id)} key={product.id} />)}</div></section>
    </> : <section className="template-admin-grid">{sortedTemplates.map((template) => <TemplateCard template={template} key={template.id} />)}</section>}
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
  useEffect(() => setDraft(product), [product])
  const margin = draft.sale > 0 ? Math.round((draft.sale - draft.cost) / draft.sale * 100) : 0
  const save = async () => {
    try {
      await updateProduct(draft)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1500)
    } catch {
      setSaved(false)
    }
  }
  return <div className="table-row"><span><span><strong>{product.name}</strong><small>{product.code}{product.brand && ` · ${product.brand}`}{product.variant && ` · ${product.variant}`}</small></span></span><span><i className={`type-dot type-${product.category === 'Doğalgaz' ? 'gas' : product.category === 'Sıhhi Tesisat' ? 'water' : product.category === 'Klima' ? 'ac' : product.category === 'Isı Pompası' ? 'heat' : 'general'}`} />{product.category}</span><span>{product.unit}</span><span><label className="money-input"><input aria-label={`${product.name} alış`} type="number" value={draft.cost} onChange={(event) => setDraft({ ...draft, cost: Number(event.target.value) })} /><i>₺</i></label></span><span><label className="money-input"><input aria-label={`${product.name} satış`} type="number" value={draft.sale} onChange={(event) => setDraft({ ...draft, sale: Number(event.target.value) })} /><i>₺</i></label></span><span><strong className={margin < 20 ? 'low-margin' : 'good-margin'}>%{margin}</strong><small>{formatCurrency(draft.sale - draft.cost)}</small></span><span className="row-actions"><button className="history-row" onClick={onHistory}><Clock3 size={13} /></button><button className={`save-row ${saved ? 'saved' : ''}`} onClick={() => { void save() }}>{saved ? <><Check size={15} /> Kaydedildi</> : 'Kaydet'}</button></span></div>
}

function TemplateCard({ template }: { template: SurveyTemplate }) {
  const { updateTemplate } = useApp()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(template)
  const [newMaterial, setNewMaterial] = useState({ label: '', quantity: 1, unit: 'adet' })
  const definitions = workItemDefinitions.filter((item) => item.type === template.type)
  const toggle = (key: string) => setDraft((current) => ({ ...current, workItemKeys: current.workItemKeys.includes(key) ? current.workItemKeys.filter((item) => item !== key) : [...current.workItemKeys, key] }))
  const save = () => { updateTemplate(draft); setEditing(false) }
  const materials = editing ? (draft.materialItems ?? []) : templateMaterialItems(template)
  const startEditing = () => {
    setDraft({ ...template, materialItems: templateMaterialItems(template) })
    setEditing(true)
  }
  const updateMaterial = (id: string, patch: Partial<MaterialTemplateItem>) => setDraft((current) => ({ ...current, materialItems: (current.materialItems ?? []).map((item) => item.id === id ? { ...item, ...patch } : item) }))
  const removeMaterial = (id: string) => setDraft((current) => ({ ...current, materialItems: (current.materialItems ?? []).filter((item) => item.id !== id) }))
  const addMaterial = () => {
    if (!newMaterial.label.trim()) return
    setDraft((current) => ({ ...current, materialItems: [...(current.materialItems ?? []), { id: `mt-${Date.now()}`, ...newMaterial, label: newMaterial.label.trim() }] }))
    setNewMaterial({ label: '', quantity: 1, unit: 'adet' })
  }
  return <article className="template-admin-card panel">
    <header><div><span>{template.type}</span>{editing ? <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /> : <h3>{template.name}</h3>}</div><button onClick={() => editing ? setEditing(false) : startEditing()}>{editing ? 'Vazgeç' : <><Edit3 size={14} /> Düzenle</>}</button></header>
    <div className="template-items">{definitions.map((item) => editing ? <label key={item.key}><input type="checkbox" checked={draft.workItemKeys.includes(item.key)} onChange={() => toggle(item.key)} /> {item.label}</label> : template.workItemKeys.includes(item.key) && <span key={item.key}><Check size={12} /> {item.label}</span>)}</div>
    <section className="template-materials"><div><strong>Yaklaşık malzeme şablonu</strong><small>Projeye aktarılır; usta veya yönetici miktarları iş bazında değiştirebilir.</small></div>{editing ? <><div className="template-material-editor">{materials.map((item) => <div className="template-material-row" key={item.id}><input value={item.label} onChange={(event) => updateMaterial(item.id, { label: event.target.value })} /><input type="number" min="0" value={item.quantity} onChange={(event) => updateMaterial(item.id, { quantity: Number(event.target.value) })} /><input value={item.unit} onChange={(event) => updateMaterial(item.id, { unit: event.target.value })} /><button onClick={() => removeMaterial(item.id)}><Trash2 size={14} /></button></div>)}</div><div className="template-material-add"><input value={newMaterial.label} onChange={(event) => setNewMaterial({ ...newMaterial, label: event.target.value })} placeholder="Yeni malzeme" /><input type="number" min="0" value={newMaterial.quantity} onChange={(event) => setNewMaterial({ ...newMaterial, quantity: Number(event.target.value) })} /><input value={newMaterial.unit} onChange={(event) => setNewMaterial({ ...newMaterial, unit: event.target.value })} /><button onClick={addMaterial}><Plus size={14} /> Ekle</button></div></> : <div className="template-material-preview">{materials.map((item) => <span key={item.id}><Check size={12} /> {item.label}<b>{item.quantity} {item.unit}</b></span>)}{materials.length === 0 && <small>Bu şablonda yaklaşık malzeme bulunmuyor.</small>}</div>}</section>
    {editing && <footer><button className="primary-button" onClick={save}>Şablonu kaydet</button></footer>}
  </article>
}

function NewTemplateModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (template: Omit<SurveyTemplate, 'id'>) => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<SurveyType>('Doğalgaz')
  const [keys, setKeys] = useState<string[]>([])
  const changeType = (value: SurveyType) => { setType(value); setKeys([]) }
  return <Modal open={open} onClose={onClose} eyebrow="YENİ ŞABLON" title="Keşif şablonu oluştur"><div className="modal-form"><div className="form-grid two"><label><span>Şablon adı</span><input value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>Keşif türü</span><select value={type} onChange={(event) => changeType(event.target.value as SurveyType)}>{['Doğalgaz', 'Isı Pompası', 'Sıhhi Tesisat', 'Klima'].map((value) => <option value={value} key={value}>{value}</option>)}</select></label></div><div className="new-template-items">{workItemDefinitions.filter((item) => item.type === type).map((item) => <label key={item.key}><input type="checkbox" checked={keys.includes(item.key)} onChange={() => setKeys((current) => current.includes(item.key) ? current.filter((key) => key !== item.key) : [...current, item.key])} /> {item.label}</label>)}</div><footer className="modal-footer"><button className="secondary-button" onClick={onClose}>Vazgeç</button><button className="primary-button" disabled={!name.trim() || keys.length === 0} onClick={() => onSave({ name: name.trim(), type, workItemKeys: keys })}>Şablonu oluştur</button></footer></div></Modal>
}
