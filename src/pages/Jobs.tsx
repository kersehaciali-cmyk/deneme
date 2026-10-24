import { CalendarDays, Check, ChevronRight, Clock3, PackageCheck, UserRound, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { Job } from '../types'

const jobFlow: Job['status'][] = ['Planlandı', 'Hazırlanıyor', 'Hazır', 'Yolda', 'Başladı', 'Tamamlandı']
const formatAppointment = (value: string) => new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`))

export function Jobs() {
  const { jobs, customers, updateJob, role } = useApp()
  const [filter, setFilter] = useState<'active' | 'all'>('active')
  const visible = filter === 'active' ? jobs.filter((job) => job.status !== 'Tamamlandı') : jobs

  const toggleItem = (job: Job, itemId: string) => updateJob({ ...job, checklist: job.checklist.map((item) => item.id === itemId ? { ...item, done: !item.done } : item) })
  const advance = (job: Job) => {
    const index = jobFlow.indexOf(job.status)
    if (index < jobFlow.length - 1) updateJob({ ...job, status: jobFlow[index + 1] })
  }

  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">SAHA OPERASYONU</span><h1>İşler & ustalar</h1><p>Randevuları planlayın, malzemeleri hazırlayın ve işi adım adım tamamlayın.</p></div><div className="segmented"><button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Aktif işler</button><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tümü</button></div></section>
    <section className="job-summary-strip panel"><div><Clock3 /><span><strong>2</strong> yaklaşan randevu</span></div><div><PackageCheck /><span><strong>1</strong> eksik hazırlık</span></div><div><Wrench /><span><strong>2</strong> sahadaki usta</span></div></section>
    <section className="jobs-grid">{visible.map((job) => {
      const customer = customers.find((item) => item.id === job.customerId)
      const done = job.checklist.filter((item) => item.done).length
      const allReady = done === job.checklist.length
      const cannotAdvance = job.status === 'Hazırlanıyor' && !allReady
      return <article className="job-card panel" key={job.id}>
        <header><div><span className="job-number">{job.id}</span><em className={`status-pill status-${job.status.toLocaleLowerCase('tr-TR')}`}>{job.status}</em></div><h3>{job.title}</h3><p>{customer?.name} · {customer?.district}</p></header>
        <div className="job-meta"><label><CalendarDays size={17} /><span>Randevu günü<input type="date" value={job.appointment.slice(0, 10)} onChange={(event) => updateJob({ ...job, appointment: event.target.value })} /></span></label><div><UserRound size={17} /><span>Usta<strong>{job.assignee}</strong></span></div></div>
        <div className="material-head"><div><strong>Malzeme hazırlığı</strong><span>{done}/{job.checklist.length} hazır</span></div><div className="mini-progress"><span style={{ width: `${(done / job.checklist.length) * 100}%` }} /></div></div>
        <div className="checklist">{job.checklist.map((item) => <label key={item.id} className={item.done ? 'checked' : ''}><button onClick={() => toggleItem(job, item.id)} aria-label={item.done ? 'İşareti kaldır' : 'Hazır işaretle'}>{item.done && <Check size={14} />}</button><span>{item.label}</span></label>)}</div>
        <footer><span><Clock3 size={15} /> {formatAppointment(job.appointment)}</span>{job.status !== 'Tamamlandı' && role !== 'musteri' && <button disabled={cannotAdvance} onClick={() => advance(job)}>{cannotAdvance ? 'Önce listeyi tamamla' : `${jobFlow[jobFlow.indexOf(job.status) + 1]} yap`} <ChevronRight size={16} /></button>}</footer>
      </article>
    })}</section>
  </div>
}
