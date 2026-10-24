import { Check, PackageSearch, Search, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/domain'
import type { Product } from '../types'

export function Catalog() {
  const { products } = useApp()
  const [query, setQuery] = useState('')
  const filtered = products.filter((product) => `${product.code} ${product.name} ${product.category}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')))
  const averageMargin = Math.round(products.reduce((sum, item) => sum + (item.sale - item.cost) / item.sale, 0) / products.length * 100)
  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">FİYAT YÖNETİMİ</span><h1>Ürün & fiyatlar</h1><p>Maliyetleri, satış fiyatlarını ve brüt kâr marjını güncel tutun.</p></div></section>
    <section className="catalog-banner"><span><PackageSearch /></span><div><small>Katalog özeti</small><strong>{products.length} aktif ürün ve hizmet</strong></div><div><TrendingUp /><span><small>Ortalama brüt marj</small><strong>%{averageMargin}</strong></span></div></section>
    <section className="toolbar panel"><label className="list-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ürün adı, kod veya kategori ara…" /></label><div className="result-count"><strong>{filtered.length}</strong> kalem</div></section>
    <section className="panel table-panel"><div className="data-table catalog-table"><div className="table-row table-head"><span>Ürün / hizmet</span><span>Kategori</span><span>Birim</span><span>Maliyet</span><span>Satış</span><span>Marj</span><span /></div>{filtered.map((product) => <ProductRow product={product} key={product.id} />)}</div></section>
  </div>
}

function ProductRow({ product }: { product: Product }) {
  const { updateProduct } = useApp()
  const [draft, setDraft] = useState(product)
  const [saved, setSaved] = useState(false)
  const margin = draft.sale > 0 ? Math.round((draft.sale - draft.cost) / draft.sale * 100) : 0
  const save = () => {
    updateProduct(draft)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }
  return <div className="table-row"><span><strong>{product.name}</strong><small>{product.code}</small></span><span><i className={`type-dot type-${product.category === 'Doğalgaz' ? 'gas' : product.category === 'Sıhhi Tesisat' ? 'water' : product.category === 'Isı Pompası' ? 'heat' : 'general'}`} />{product.category}</span><span>{product.unit}</span><span><label className="money-input"><input aria-label={`${product.name} maliyet`} type="number" value={draft.cost} onChange={(event) => setDraft({ ...draft, cost: Number(event.target.value) })} /><i>₺</i></label></span><span><label className="money-input"><input aria-label={`${product.name} satış`} type="number" value={draft.sale} onChange={(event) => setDraft({ ...draft, sale: Number(event.target.value) })} /><i>₺</i></label></span><span><strong className={margin < 20 ? 'low-margin' : 'good-margin'}>%{margin}</strong><small>{formatCurrency(draft.sale - draft.cost)}</small></span><span><button className={`save-row ${saved ? 'saved' : ''}`} onClick={save}>{saved ? <><Check size={15} /> Kaydedildi</> : 'Kaydet'}</button></span></div>
}
