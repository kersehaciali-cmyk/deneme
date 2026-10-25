import { CalendarDays, Check, ChevronRight, Clock3, MapPin, Navigation, PackageCheck, Phone, UserRound, Wrench } from 'lucide-react'
import { useState } from 'react'
import { EntityDetailModal, type ProfileSubject } from '../components/EntityDetailModal'
import { useApp } from '../context/AppContext'
import { directionsUrl, sortNewestFirst } from '../lib/domain'
import type { Job } from '../types'

const jobFlow: Job['status'][] = ['Planlandı', 'Hazırlanıyor', 'Hazır', 'Yolda', 'Başladı', 'Tamamlandı']
const formatAppointment = (value: string) => new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`))
const formatPreparationDay = (value: string) => {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  date.setDate(date.getDate() - 1)
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

export function Jobs() {
  const { jobs, customers, users, projects, surveys, updateJob, updateProject, role, currentUser } = useApp()
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>(() => {
    const requested = sessionStorage.getItem('tesisat-pro-list-filter')
    if (requested === 'jobs:completed') {
      sessionStorage.removeItem('tesisat-pro-list-filter')
      return 'completed'
    }
    return 'active'
  })
  const [profile, setProfile] = useState<ProfileSubject | null>(null)
  const roleJobs = role === 'usta' ? jobs.filter((job) => job.assignedMasterId === currentUser.id || job.assignee === currentUser.name) : role === 'musteri' ? jobs.filter((job) => job.customerId === currentUser.customerId) : jobs
  const visible = sortNewestFirst(filter === 'active' ? roleJobs.filter((job) => job.status !== 'Tamamlandı') : filter === 'completed' ? roleJobs.filter((job) => job.status === 'Tamamlandı') : roleJobs)

  const toggleItem = (job: Job, itemId: string) => {
    const checklist = job.checklist.map((item) => item.id === itemId ? { ...item, done: !item.done } : item)
    updateJob({ ...job, checklist })
    const project = projects.find((item) => item.id === job.projectId)
    const changed = checklist.find((item) => item.id === itemId)
    const materialId = itemId.replace(/^check-/, '')
    if (project && changed) updateProject({ ...project, materials: (project.materials ?? []).map((material) => material.id === materialId ? { ...material, prepared: changed.done } : material) })
  }
  const advance = (job: Job) => {
    const index = jobFlow.indexOf(job.status)
    if (index < jobFlow.length - 1) updateJob({ ...job, status: jobFlow[index + 1] })
  }

  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">SAHA OPERASYONU</span><h1>İşler & ustalar</h1><p>Randevuları planlayın, malzemeleri hazırlayın ve işi adım adım tamamlayın.</p></div><div className="segmented"><button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Aktif işler</button><button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Biten işler</button><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tümü</button></div></section>
    <section className="job-summary-strip panel"><div><Clock3 /><span><strong>2</strong> yaklaşan randevu</span></div><div><PackageCheck /><span><strong>1</strong> eksik hazırlık</span></div><div><Wrench /><span><strong>2</strong> sahadaki usta</span></div></section>
    <section className="jobs-grid">{visible.map((job) => {
      const customer = customers.find((item) => item.id === job.customerId)
      const project = projects.find((item) => item.id === job.projectId)
      const survey = surveys.find((item) => item.id === project?.surveyId)
      const master = users.find((item) => item.role === 'usta' && item.name === job.assignee)
      const siteAddress = job.siteAddress ?? project?.siteAddress ?? survey?.siteAddress ?? (customer ? `${customer.address}, ${customer.district}` : '')
      const siteContactName = job.siteContactName ?? project?.siteContactName ?? survey?.siteContactName ?? customer?.name
      const siteContactPhone = job.siteContactPhone ?? project?.siteContactPhone ?? survey?.siteContactPhone ?? customer?.phone
      const routeUrl = directionsUrl(job.latitude ?? project?.latitude ?? survey?.latitude, job.longitude ?? project?.longitude ?? survey?.longitude, siteAddress)
      const done = job.checklist.filter((item) => item.done).length
      const allReady = job.checklist.length > 0 && done === job.checklist.length
      const cannotAdvance = job.status === 'Hazırlanıyor' && !allReady
      return <article className="job-card panel" key={job.id}>
        <header><div><span className="job-number">{job.id}</span><em className={`status-pill status-${job.status.toLocaleLowerCase('tr-TR')}`}>{job.status}</em></div><h3>{job.title}</h3><p>{role === 'admin' && customer ? <button className="entity-name-link compact" onClick={() => setProfile({ kind: 'customer', id: customer.id })}>{customer.name}</button> : customer?.name} · {customer?.district}</p></header>
        <div className="job-meta"><label><CalendarDays size={17} /><span>Randevu günü<input type="date" value={job.appointment.slice(0, 10)} onChange={(event) => updateJob({ ...job, appointment: event.target.value })} /></span></label><div><UserRound size={17} /><span>Usta{role === 'admin' && master ? <button className="entity-name-link compact" onClick={() => setProfile({ kind: 'user', id: master.id })}>{master.name}</button> : <strong>{job.assignee}</strong>}</span></div></div>
        <div className="job-site-info"><div><MapPin size={17} /><span>Uygulama adresi<strong>{siteAddress || 'Adres girilmedi'}</strong></span></div><div><Phone size={17} /><span>Randevu kişisi<strong>{siteContactName ?? 'Belirlenmedi'}{siteContactPhone && ` · ${siteContactPhone}`}</strong></span></div><button disabled={!routeUrl} onClick={() => routeUrl && window.open(routeUrl, '_blank', 'noopener,noreferrer')}><Navigation size={16} /> Yol tarifi al</button></div>
        <div className="material-head"><div><strong>Malzeme hazırlığı</strong><span>{done}/{job.checklist.length} hazır · {formatPreparationDay(job.appointment)} hazırlanmalı</span></div><div className="mini-progress"><span style={{ width: `${job.checklist.length ? (done / job.checklist.length) * 100 : 0}%` }} /></div></div>
        <div className="checklist">{job.checklist.map((item) => <label key={item.id} className={item.done ? 'checked' : ''}><button onClick={() => toggleItem(job, item.id)} aria-label={item.done ? 'İşareti kaldır' : 'Hazır işaretle'}>{item.done && <Check size={14} />}</button><span>{item.label}</span></label>)}</div>
        <footer><span><Clock3 size={15} /> {formatAppointment(job.appointment)}</span>{job.status !== 'Tamamlandı' && role !== 'musteri' && <button disabled={cannotAdvance} onClick={() => advance(job)}>{cannotAdvance ? 'Önce listeyi tamamla' : `${jobFlow[jobFlow.indexOf(job.status) + 1]} yap`} <ChevronRight size={16} /></button>}</footer>
      </article>
    })}{visible.length === 0 && <div className="empty-list panel">Bu listede gösterilecek iş bulunmuyor.</div>}</section>
    <EntityDetailModal subject={profile} onClose={() => setProfile(null)} />
  </div>
}
