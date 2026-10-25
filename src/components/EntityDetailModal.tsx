import { CalendarDays, CircleDollarSign, Mail, MapPin, Phone, UserRound, WalletCards } from 'lucide-react'
import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { canViewPrices, formatCurrency, initials, isProjectClosed, projectProgress, sortProjectsNewestFirst } from '../lib/domain'
import { Modal } from './Modal'

export type ProfileSubject = { kind: 'customer'; id: string } | { kind: 'user'; id: string }

const roleLabels = { admin: 'Yönetici', usta: 'Usta', proje: 'Proje takipçisi', musteri: 'Müşteri' }
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'Belirlenmedi'

export function EntityDetailModal({ subject, onClose }: { subject: ProfileSubject | null; onClose: () => void }) {
  const { customers, users, projects, surveys, payments, role } = useApp()
  const customer = subject?.kind === 'customer' ? customers.find((item) => item.id === subject.id) : undefined
  const user = subject?.kind === 'user' ? users.find((item) => item.id === subject.id) : undefined
  const relatedProjects = useMemo(() => sortProjectsNewestFirst(projects.filter((project) => {
    if (customer) return project.customerId === customer.id
    if (!user) return false
    if (user.role === 'usta') return project.assignedMasterId === user.id
    if (user.role === 'proje') return project.ownerId === user.id || (!project.ownerId && project.owner === user.name)
    return false
  })), [customer, projects, user])
  const relatedPayments = useMemo(() => customer
    ? payments.filter((payment) => payment.customerId === customer.id).sort((a, b) => b.dueDate.localeCompare(a.dueDate))
    : [], [customer, payments])

  if (!subject || (!customer && !user)) return null
  const name = customer?.name ?? user?.name ?? ''
  const openCount = relatedProjects.filter((project) => !isProjectClosed(project)).length
  const closedCount = relatedProjects.length - openCount
  const total = relatedPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const collected = relatedPayments.reduce((sum, payment) => sum + payment.paid, 0)
  const balance = relatedPayments.length > 0 ? total - collected : (customer?.balance ?? 0)
  const showFinancials = Boolean(customer) && canViewPrices(role)

  return <Modal open onClose={onClose} eyebrow={customer ? 'MÜŞTERİ DETAYI' : 'PERSONEL DETAYI'} title={name} wide>
    <div className="entity-detail">
      <section className="entity-profile-head">
        <div className="avatar entity-avatar">{initials(name)}</div>
        <div className="entity-identity"><strong>{name}</strong><span>{customer ? `Müşteri · ${customer.id.toUpperCase()}` : `${roleLabels[user!.role]} · ${user!.active ? 'Aktif' : 'Pasif'}`}</span></div>
        <div className="entity-contact">
          <span><Phone size={14} /> {customer?.phone ?? user?.phone}</span>
          {user && <span><Mail size={14} /> {user.email}</span>}
          {customer && <span><MapPin size={14} /> {customer.address}, {customer.district}</span>}
        </div>
      </section>

      <section className={`entity-metrics ${showFinancials ? 'with-finance' : ''}`}>
        <div><UserRound /><span><strong>{relatedProjects.length}</strong> toplam proje</span></div>
        <div><span className="metric-status open" /><span><strong>{openCount}</strong> açık proje</span></div>
        <div><span className="metric-status closed" /><span><strong>{closedCount}</strong> kapalı proje</span></div>
        {showFinancials && <div><WalletCards /><span><strong>{formatCurrency(balance)}</strong> kalan bakiye</span></div>}
      </section>

      <section className="entity-section">
        <header><div><span className="eyebrow">PROJE GEÇMİŞİ</span><h3>Projeler</h3></div><small>En yeniden eskiye</small></header>
        {relatedProjects.length === 0 ? <div className="entity-empty">Bu kişiye bağlı proje bulunmuyor.</div> : <div className="entity-project-list">{relatedProjects.map((project) => {
          const projectCustomer = customers.find((item) => item.id === project.customerId)
          const survey = surveys.find((item) => item.id === project.surveyId)
          const master = users.find((item) => item.id === project.assignedMasterId)
          const closed = isProjectClosed(project)
          const currentStage = project.stages[Math.min(project.currentStage, project.stages.length - 1)]
          const siteAddress = project.siteAddress ?? survey?.siteAddress ?? (projectCustomer ? `${projectCustomer.address}, ${projectCustomer.district}` : 'Adres girilmedi')
          const siteContactName = project.siteContactName ?? survey?.siteContactName ?? projectCustomer?.name
          const siteContactPhone = project.siteContactPhone ?? survey?.siteContactPhone ?? projectCustomer?.phone
          return <article key={project.id}>
            <div className="entity-project-main"><span className={`project-type project-${project.type === 'Doğalgaz' ? 'gas' : project.type === 'Isı Pompası' ? 'heat' : project.type === 'Klima' ? 'ac' : 'water'}`}>{project.type}</span><div><strong>{project.id} · {projectCustomer?.name}</strong><small><CalendarDays size={12} /> Kayıt: {formatDate(project.createdAt ?? project.applicationDate)} · Uygulama: {formatDate(project.applicationDate)}</small></div></div>
            <em className={`project-state ${closed ? 'closed' : 'open'}`}>{closed ? 'Kapalı' : 'Açık'}</em>
            <div className="entity-project-stage"><span><b>Güncel aşama:</b> {currentStage}</span><span><b>Usta:</b> {master?.name ?? 'Atanmadı'}</span><span><b>Takipçi:</b> {project.owner}</span></div>
            <div className="entity-project-site"><span><MapPin size={12} /> {siteAddress}</span><span><Phone size={12} /> {siteContactName}{siteContactPhone && ` · ${siteContactPhone}`}</span></div>
            <div className="entity-project-progress"><span style={{ width: `${projectProgress(project.currentStage, project.stages.length)}%` }} /></div>
          </article>
        })}</div>}
      </section>

      {showFinancials && <section className="entity-section account-section">
        <header><div><span className="eyebrow">CARİ HESAP</span><h3>Cari hareketler</h3></div><div className="account-totals"><span>Toplam <b>{formatCurrency(total)}</b></span><span>Tahsil <b>{formatCurrency(collected)}</b></span></div></header>
        {relatedPayments.length === 0 ? <div className="entity-empty">Bu müşteriye ait cari hareket bulunmuyor.</div> : <div className="account-list">{relatedPayments.map((payment) => <article key={payment.id}><span className="account-icon"><CircleDollarSign size={17} /></span><div><strong>{payment.description}</strong><small>{payment.id} · Vade: {formatDate(payment.dueDate)}</small></div><div><span>Toplam<strong>{formatCurrency(payment.amount)}</strong></span><span>Tahsil<strong>{formatCurrency(payment.paid)}</strong></span><span>Kalan<strong>{formatCurrency(payment.amount - payment.paid)}</strong></span></div><em className={`status-pill status-${payment.status.toLocaleLowerCase('tr-TR')}`}>{payment.status}</em></article>)}</div>}
      </section>}
    </div>
  </Modal>
}
