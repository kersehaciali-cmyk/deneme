import { ArrowRight, CalendarClock, CheckCircle2, ClipboardPlus, Clock3, PackageCheck, TrendingUp, UsersRound, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { EntityDetailModal, type ProfileSubject } from '../components/EntityDetailModal'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/domain'
import type { PageKey } from '../types'

const appointmentDate = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`)
const formatDay = (value: string) => new Intl.DateTimeFormat('tr-TR', { day: '2-digit' }).format(appointmentDate(value))
const formatWeekday = (value: string) => new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(appointmentDate(value))

export function Dashboard({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const { role, customers, surveys, jobs, projects, payments } = useApp()
  const [profile, setProfile] = useState<ProfileSubject | null>(null)
  const outstanding = payments.reduce((sum, payment) => sum + payment.amount - payment.paid, 0)
  const completedJobs = jobs.filter((job) => job.status === 'Tamamlandı').length
  const activeProjects = projects.filter((project) => project.currentStage < project.stages.length - 1).length
  const isCustomer = role === 'musteri'
  const isMaster = role === 'usta'

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <span className="eyebrow">24 EKİM CUMARTESİ</span>
          <h1>{isCustomer ? 'Projeniz emin ellerde.' : 'Günaydın, işler yolunda.'}</h1>
          <p>{isCustomer ? 'Projenizin son durumunu ve yaklaşan ödemelerinizi buradan takip edin.' : 'Bugün 2 saha randevusu ve hazırlanmayı bekleyen 1 malzeme listesi var.'}</p>
        </div>
        {!isCustomer && <button className="primary-button" onClick={() => onNavigate('surveys')}><ClipboardPlus size={18} /> Yeni keşif oluştur</button>}
      </section>

      <section className="metric-grid">
        {!isCustomer && <Metric icon={<UsersRound />} label="Aktif müşteri" value={String(customers.length)} note="Bu ay +3" tone="teal" />}
        <Metric icon={<CalendarClock />} label={isCustomer ? 'Aktif projem' : 'Devam eden proje'} value={String(isCustomer ? 1 : activeProjects)} note="2 proje kritik aşamada" tone="orange" />
        <Metric icon={<CheckCircle2 />} label="Tamamlanan iş" value={String(isCustomer ? 2 : completedJobs + 23)} note="Bu ay %18 artış" tone="green" />
        {isMaster ? <Metric icon={<PackageCheck />} label="Hazırlanacak iş" value="1" note="Yarın için malzeme listesi" tone="berry" /> : <Metric icon={<WalletCards />} label="Bekleyen tahsilat" value={formatCurrency(isCustomer ? 48500 : outstanding)} note="1 vadesi geçmiş" tone="berry" />}
      </section>

      <section className="dashboard-grid">
        <article className="panel schedule-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">GÜNÜN AKIŞI</span><h2>Yaklaşan işler</h2></div>
            {!isCustomer && <button className="text-button" onClick={() => onNavigate('jobs')}>Tümünü gör <ArrowRight size={16} /></button>}
          </div>
          <div className="timeline-list">
            {jobs.slice(0, isCustomer ? 1 : 3).map((job, index) => {
              const customer = customers.find((item) => item.id === job.customerId)
              return (
                <div className="timeline-item" key={job.id}>
                  <div className="time-column"><strong>{formatDay(job.appointment)}</strong><span>{formatWeekday(job.appointment)}</span></div>
                  <div className={`timeline-pin pin-${index + 1}`} />
                  <div className="timeline-copy"><strong>{job.title}</strong><span>{role === 'admin' && customer ? <button className="entity-name-link inline" onClick={() => setProfile({ kind: 'customer', id: customer.id })}>{customer.name}</button> : customer?.name} · {customer?.district}</span></div>
                  <span className={`status-pill status-${job.status.toLocaleLowerCase('tr-TR').replaceAll(' ', '-')}`}>{job.status}</span>
                </div>
              )
            })}
          </div>
        </article>

        <article className="panel attention-panel">
          <div className="panel-heading"><div><span className="eyebrow">DİKKAT GEREKTİREN</span><h2>Bugünün notları</h2></div><span className="round-count">{isMaster ? 2 : 3}</span></div>
          <button className="attention-card" onClick={() => onNavigate('jobs')}>
            <span className="attention-icon amber"><Clock3 size={19} /></span>
            <span><strong>Malzeme hazırlığı eksik</strong><small>IS-284 · Yarın</small></span><ArrowRight size={17} />
          </button>
          {!isMaster && <button className="attention-card" onClick={() => onNavigate('payments')}>
            <span className="attention-icon red"><WalletCards size={19} /></span>
            <span><strong>Vadesi geçen ödeme</strong><small>Murat Demir · 18.750 ₺</small></span><ArrowRight size={17} />
          </button>}
          <button className="attention-card" onClick={() => onNavigate('projects')}>
            <span className="attention-icon teal"><TrendingUp size={19} /></span>
            <span><strong>AKSA onayı bekleniyor</strong><small>PRJ-090 · 3 gündür</small></span><ArrowRight size={17} />
          </button>
        </article>
      </section>

      {!isCustomer && <section className="panel performance-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">EKİM PERFORMANSI</span><h2>Keşiften işe dönüşüm</h2></div>
          <div className="conversion-value"><strong>%68</strong><span><TrendingUp size={14} /> geçen aya göre +8</span></div>
        </div>
        <div className="funnel-row">
          {[['Keşif', surveys.length + 15, 100], ['Teklif', surveys.length + 9, 78], ['Onaylanan', 12, 60], ['Tamamlanan', completedJobs + 9, 47]].map(([label, value, width]) => (
            <div className="funnel-item" key={String(label)}><div><span>{label}</span><strong>{value}</strong></div><div className="bar-track"><span style={{ width: `${width}%` }} /></div></div>
          ))}
        </div>
      </section>}
      <EntityDetailModal subject={profile} onClose={() => setProfile(null)} />
    </div>
  )
}

function Metric({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: string; note: string; tone: string }) {
  return <article className="metric-card"><span className={`metric-icon ${tone}`}>{icon}</span><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>
}
