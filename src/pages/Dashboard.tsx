import { ArrowRight, CalendarClock, CheckCircle2, ClipboardPlus, Clock3, PackageCheck, TrendingUp, UsersRound, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { DashboardAdminListModal, type AdminOverviewItem } from '../components/DashboardAdminListModal'
import { EntityDetailModal, type ProfileSubject } from '../components/EntityDetailModal'
import { useApp } from '../context/AppContext'
import { canViewPrices, formatCurrency, sortProjectsNewestFirst } from '../lib/domain'
import type { PageKey } from '../types'

const appointmentDate = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`)
const formatDay = (value: string) => new Intl.DateTimeFormat('tr-TR', { day: '2-digit' }).format(appointmentDate(value))
const formatWeekday = (value: string) => new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(appointmentDate(value))

export function Dashboard({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const { role, customers, surveys, jobs, projects, payments, templates, users } = useApp()
  const [profile, setProfile] = useState<ProfileSubject | null>(null)
  const [overview, setOverview] = useState<'surveys' | 'projects' | 'jobs' | null>(null)
  const outstanding = payments.reduce((sum, payment) => sum + payment.amount - payment.paid, 0)
  const pendingSurveys = surveys.filter((survey) => !['Projeye Dönüştü', 'Reddedildi'].includes(survey.status) && !projects.some((project) => project.surveyId === survey.id))
  const completedJobRecords = jobs.filter((job) => job.status === 'Tamamlandı')
  const completedJobs = completedJobRecords.length
  const activeProjectRecords = projects.filter((project) => project.currentStage < project.stages.length - 1)
  const activeProjects = activeProjectRecords.length
  const recentSurveys = [...surveys].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
  const completedJobList = jobs.filter((job) => job.status === 'Tamamlandı').sort((a, b) => b.appointment.localeCompare(a.appointment)).slice(0, 3)
  const approvalProjects = sortProjectsNewestFirst(projects.filter((project) => project.stages[project.currentStage]?.toLocaleLowerCase('tr-TR').includes('onaya gönderildi'))).slice(0, 3)
  const isCustomer = role === 'musteri'
  const isMaster = role === 'usta'
  const showPrices = canViewPrices(role)
  const surveyOverviewItems: AdminOverviewItem[] = pendingSurveys.map((survey) => {
    const customer = customers.find((item) => item.id === survey.customerId)
    const template = templates.find((item) => item.id === survey.templateId)
    const radiatorCount = survey.rooms.filter((room) => (room.radiatorQuantity ?? 0) > 0).reduce((sum, room) => sum + (room.radiatorQuantity ?? 0), 0)
    return {
      id: survey.id,
      title: template?.name ?? `${survey.type} keşfi`,
      customerName: customer?.name ?? 'Müşteri bulunamadı',
      contactName: survey.siteContactName ?? customer?.name,
      contactPhone: survey.siteContactPhone ?? customer?.phone,
      date: survey.createdAt,
      price: survey.total,
      type: survey.type,
      status: survey.status,
      address: survey.siteAddress ?? (customer ? `${customer.address}, ${customer.district}` : undefined),
      features: [`${survey.lines.length} ürün / hizmet`, `${survey.workItemKeys?.length ?? 0} iş kalemi`, radiatorCount > 0 ? `${radiatorCount} radyatör` : 'Radyatör yok'],
    }
  })
  const projectOverviewItems: AdminOverviewItem[] = activeProjectRecords.map((project) => {
    const customer = customers.find((item) => item.id === project.customerId)
    const survey = surveys.find((item) => item.id === project.surveyId)
    const master = users.find((item) => item.id === project.assignedMasterId)
    const currentStage = project.stages[Math.min(project.currentStage, project.stages.length - 1)] ?? 'Aşama belirlenmedi'
    return {
      id: project.id,
      title: `${project.type} projesi`,
      customerName: customer?.name ?? 'Müşteri bulunamadı',
      contactName: project.siteContactName ?? survey?.siteContactName ?? customer?.name,
      contactPhone: project.siteContactPhone ?? survey?.siteContactPhone ?? customer?.phone,
      date: project.createdAt ?? project.applicationDate ?? project.dueDate,
      price: survey?.total,
      type: project.type,
      status: currentStage,
      address: project.siteAddress ?? survey?.siteAddress ?? (customer ? `${customer.address}, ${customer.district}` : undefined),
      features: [`Usta: ${master?.name ?? 'Atanmadı'}`, `Takipçi: ${project.owner}`, project.applicationDate ? `Uygulama: ${new Intl.DateTimeFormat('tr-TR').format(appointmentDate(project.applicationDate))}` : 'Uygulama günü yok'],
    }
  })
  const completedJobOverviewItems: AdminOverviewItem[] = completedJobRecords.map((job) => {
    const customer = customers.find((item) => item.id === job.customerId)
    const project = projects.find((item) => item.id === job.projectId)
    const survey = project?.surveyId ? surveys.find((item) => item.id === project.surveyId) : undefined
    const completedChecks = job.checklist.filter((item) => item.done).length
    return {
      id: job.id,
      title: job.title,
      customerName: customer?.name ?? 'Müşteri bulunamadı',
      contactName: job.siteContactName ?? project?.siteContactName ?? customer?.name,
      contactPhone: job.siteContactPhone ?? project?.siteContactPhone ?? customer?.phone,
      date: job.appointment || job.createdAt || new Date(0).toISOString(),
      price: survey?.total,
      type: project?.type ?? 'Saha işi',
      status: job.status,
      address: job.siteAddress ?? project?.siteAddress ?? (customer ? `${customer.address}, ${customer.district}` : undefined),
      features: [`Usta: ${job.assignee}`, `${completedChecks}/${job.checklist.length} kontrol tamam`, project ? `Proje: ${project.id}` : 'Bağımsız iş'],
    }
  })
  const overviewConfig = overview === 'surveys'
    ? { eyebrow: 'BEKLEYEN KEŞİFLER', title: 'Bekleyen keşif listesi', items: surveyOverviewItems }
    : overview === 'projects'
      ? { eyebrow: 'DEVAM EDEN PROJELER', title: 'Devam eden proje listesi', items: projectOverviewItems }
      : { eyebrow: 'TAMAMLANAN İŞLER', title: 'Tamamlanan iş listesi', items: completedJobOverviewItems }
  const openFilteredList = (page: 'jobs' | 'projects', filter: string) => {
    sessionStorage.setItem('tesisat-pro-list-filter', `${page}:${filter}`)
    onNavigate(page)
  }

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

      <section className={`metric-grid ${role === 'admin' ? 'admin-metric-grid' : ''}`}>
        {!isCustomer && <Metric icon={<UsersRound />} label="Aktif müşteri" value={String(customers.length)} note="Bu ay +3" tone="teal" />}
        {role === 'admin' && <Metric icon={<ClipboardPlus />} label="Bekleyen keşif" value={String(pendingSurveys.length)} note="Listeyi aç ve filtrele" tone="teal" onClick={() => setOverview('surveys')} />}
        <Metric icon={<CalendarClock />} label={isCustomer ? 'Aktif projem' : 'Devam eden proje'} value={String(isCustomer ? 1 : activeProjects)} note={role === 'admin' ? 'Listeyi aç ve filtrele' : '2 proje kritik aşamada'} tone="orange" onClick={role === 'admin' ? () => setOverview('projects') : undefined} />
        <Metric icon={<CheckCircle2 />} label="Tamamlanan iş" value={String(isCustomer ? 2 : completedJobs)} note={role === 'admin' ? 'Listeyi aç ve filtrele' : 'Bu ay tamamlanan'} tone="green" onClick={role === 'admin' ? () => setOverview('jobs') : undefined} />
        {showPrices
          ? <Metric icon={<WalletCards />} label="Bekleyen tahsilat" value={formatCurrency(isCustomer ? 48500 : outstanding)} note="1 vadesi geçmiş" tone="berry" />
          : isMaster
            ? <Metric icon={<PackageCheck />} label="Hazırlanacak iş" value="1" note="Yarın için malzeme listesi" tone="berry" />
            : <Metric icon={<Clock3 />} label="Onay bekleyen" value={String(approvalProjects.length)} note="Takip edilecek proje" tone="berry" />}
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
          <div className="panel-heading"><div><span className="eyebrow">DİKKAT GEREKTİREN</span><h2>Bugünün notları</h2></div><span className="round-count">{showPrices ? 3 : 2}</span></div>
          <button className="attention-card" onClick={() => onNavigate('jobs')}>
            <span className="attention-icon amber"><Clock3 size={19} /></span>
            <span><strong>Malzeme hazırlığı eksik</strong><small>IS-284 · Yarın</small></span><ArrowRight size={17} />
          </button>
          {showPrices && <button className="attention-card" onClick={() => onNavigate('payments')}>
            <span className="attention-icon red"><WalletCards size={19} /></span>
            <span><strong>Vadesi geçen ödeme</strong><small>Murat Demir · 18.750 ₺</small></span><ArrowRight size={17} />
          </button>}
          <button className="attention-card" onClick={() => onNavigate('projects')}>
            <span className="attention-icon teal"><TrendingUp size={19} /></span>
            <span><strong>AKSA onayı bekleniyor</strong><small>PRJ-090 · 3 gündür</small></span><ArrowRight size={17} />
          </button>
        </article>
      </section>

      {!isCustomer && <section className="operations-lists">
        <article className="panel operations-list-card"><header><div><ClipboardPlus /><span><strong>Keşif listesi</strong><small>Son oluşturulan keşifler</small></span></div><button onClick={() => onNavigate('surveys')}>Tümünü gör <ArrowRight size={14} /></button></header><div>{recentSurveys.map((survey) => { const customer = customers.find((item) => item.id === survey.customerId); return <button className="operations-list-row" onClick={() => onNavigate('surveys')} key={survey.id}><span><strong>{survey.id} · {customer?.name}</strong><small>{survey.type} · {survey.status}</small></span><ArrowRight size={14} /></button> })}{recentSurveys.length === 0 && <p>Keşif bulunmuyor.</p>}</div></article>
        <article className="panel operations-list-card"><header><div><CheckCircle2 /><span><strong>Biten iş listesi</strong><small>Tamamlanan saha işleri</small></span></div><button onClick={() => openFilteredList('jobs', 'completed')}>Tümünü gör <ArrowRight size={14} /></button></header><div>{completedJobList.map((job) => { const customer = customers.find((item) => item.id === job.customerId); return <button className="operations-list-row" onClick={() => openFilteredList('jobs', 'completed')} key={job.id}><span><strong>{job.id} · {customer?.name}</strong><small>{job.title} · {formatDay(job.appointment)} {formatWeekday(job.appointment)}</small></span><ArrowRight size={14} /></button> })}{completedJobList.length === 0 && <p>Biten iş bulunmuyor.</p>}</div></article>
        <article className="panel operations-list-card"><header><div><Clock3 /><span><strong>Proje onayı bekleyenler</strong><small>Onaya gönderilmiş projeler</small></span></div><button onClick={() => openFilteredList('projects', 'approval')}>Tümünü gör <ArrowRight size={14} /></button></header><div>{approvalProjects.map((project) => { const customer = customers.find((item) => item.id === project.customerId); return <button className="operations-list-row" onClick={() => openFilteredList('projects', 'approval')} key={project.id}><span><strong>{project.id} · {customer?.name}</strong><small>{project.type} · {project.stages[project.currentStage]}</small></span><ArrowRight size={14} /></button> })}{approvalProjects.length === 0 && <p>Onay bekleyen proje bulunmuyor.</p>}</div></article>
      </section>}

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
      {role === 'admin' && <DashboardAdminListModal key={overview ?? 'closed'} open={Boolean(overview)} eyebrow={overviewConfig.eyebrow} title={overviewConfig.title} items={overviewConfig.items} onClose={() => setOverview(null)} />}
      <EntityDetailModal subject={profile} onClose={() => setProfile(null)} />
    </div>
  )
}

function Metric({ icon, label, value, note, tone, onClick }: { icon: React.ReactNode; label: string; value: string; note: string; tone: string; onClick?: () => void }) {
  const content = <><span className={`metric-icon ${tone}`}>{icon}</span><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>{onClick && <ArrowRight className="metric-card-arrow" size={17} />}</>
  return onClick
    ? <button type="button" className="metric-card metric-card-button" onClick={onClick}>{content}</button>
    : <article className="metric-card">{content}</article>
}
