import { ArrowDownRight, ArrowUpRight, Download, Trophy } from 'lucide-react'
import { useState } from 'react'
import { EntityDetailModal, type ProfileSubject } from '../components/EntityDetailModal'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/domain'

const team = [
  { name: 'Mehmet Usta', role: 'Usta', jobs: 18, completion: 94, revenue: 284500 },
  { name: 'Cem Usta', role: 'Usta', jobs: 14, completion: 88, revenue: 211200 },
  { name: 'Derya Çetin', role: 'Proje takipçisi', jobs: 12, completion: 96, revenue: 198400 },
  { name: 'Selin Akın', role: 'Proje takipçisi', jobs: 9, completion: 91, revenue: 176800 },
]

export function Reports() {
  const { payments, users, role } = useApp()
  const [profile, setProfile] = useState<ProfileSubject | null>(null)
  const revenue = payments.reduce((sum, payment) => sum + payment.amount, 0)
  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">YÖNETİM RAPORLARI</span><h1>Performans & raporlar</h1><p>Satış, kârlılık ve ekip performansını karşılaştırın.</p></div><button className="secondary-button"><Download size={17} /> Raporu indir</button></section>
    <section className="report-period panel"><div className="segmented"><button>Haftalık</button><button className="active">Aylık</button><button>Yıllık</button></div><strong>1–31 Ekim 2026</strong></section>
    <section className="metric-grid"><ReportMetric label="Toplam satış" value={formatCurrency(revenue + 486000)} change="%18,4" up /><ReportMetric label="Brüt kâr" value={formatCurrency(243800)} change="%12,1" up /><ReportMetric label="Tamamlanan iş" value="53" change="%8,2" up /><ReportMetric label="Ort. tamamlanma" value="6,4 gün" change="%4,1" /></section>
    <section className="report-grid">
      <article className="panel revenue-chart"><div className="panel-heading"><div><span className="eyebrow">SON 6 AY</span><h2>Satış ve tahsilat</h2></div><div className="chart-legend"><span><i className="sales" /> Satış</span><span><i className="collection" /> Tahsilat</span></div></div><div className="bar-chart">{[['May', 52, 40], ['Haz', 64, 51], ['Tem', 58, 48], ['Ağu', 76, 62], ['Eyl', 69, 60], ['Eki', 92, 74]].map(([month, sales, collection]) => <div className="bar-group" key={String(month)}><div><i className="sales" style={{ height: `${sales}%` }} /><i className="collection" style={{ height: `${collection}%` }} /></div><span>{month}</span></div>)}</div></article>
      <article className="panel service-chart"><div className="panel-heading"><div><span className="eyebrow">İŞ DAĞILIMI</span><h2>Hizmet türleri</h2></div></div><div className="donut-wrap"><div className="donut"><strong>58</strong><span>toplam iş</span></div><div className="donut-legend"><span><i className="gas" /><b>Doğalgaz</b><strong>28 · %48</strong></span><span><i className="water" /><b>Sıhhi tesisat</b><strong>16 · %28</strong></span><span><i className="heat" /><b>Isı pompası</b><strong>9 · %16</strong></span><span><i className="ac" /><b>Klima</b><strong>5 · %8</strong></span></div></div></article>
    </section>
    <section className="panel team-table"><div className="panel-heading"><div><span className="eyebrow">EKİP PERFORMANSI</span><h2>Personel özeti</h2></div></div><div className="data-table"><div className="table-row table-head"><span>Personel</span><span>Rol</span><span>Tamamlanan iş</span><span>Zamanında tamamlama</span><span>Satış katkısı</span></div>{team.map((person, index) => { const user = users.find((item) => item.name === person.name); return <div className="table-row" key={person.name}><span><b className="rank">{index === 0 ? <Trophy size={16} /> : index + 1}</b>{role === 'admin' && user ? <button className="entity-name-link" onClick={() => setProfile({ kind: 'user', id: user.id })}>{person.name}</button> : <strong>{person.name}</strong>}</span><span>{person.role}</span><span><strong>{person.jobs}</strong></span><span><div className="completion-cell"><div><i style={{ width: `${person.completion}%` }} /></div><strong>%{person.completion}</strong></div></span><span><strong>{formatCurrency(person.revenue)}</strong></span></div>})}</div></section>
    <EntityDetailModal subject={profile} onClose={() => setProfile(null)} />
  </div>
}

function ReportMetric({ label, value, change, up }: { label: string; value: string; change: string; up?: boolean }) {
  return <article className="metric-card report-metric"><div><span>{label}</span><strong>{value}</strong><small className={up ? 'trend-up' : 'trend-down'}>{up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{change} geçen döneme göre</small></div></article>
}
