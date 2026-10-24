import { CalendarClock, Check, ChevronRight, FileCheck2, UserRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { projectProgress } from '../lib/domain'

export function Projects() {
  const { projects, customers, updateProject, role } = useApp()
  const visible = role === 'musteri' ? projects.filter((project) => project.customerId === 'mus-001') : projects
  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">UÇTAN UCA TAKİP</span><h1>Proje takibi</h1><p>Müşteriden resmi kurum onayına ve devreye almaya kadar her aşama görünür.</p></div></section>
    <section className="project-list">{visible.map((project) => {
      const customer = customers.find((item) => item.id === project.customerId)
      const complete = project.currentStage === project.stages.length - 1
      return <article className="project-card panel" key={project.id}>
        <header><div><span className={`project-type project-${project.type === 'Doğalgaz' ? 'gas' : project.type === 'Isı Pompası' ? 'heat' : 'water'}`}>{project.type}</span><h3>{customer?.name}</h3><p>{project.id} · {customer?.district}</p></div><div className="project-progress-number"><strong>%{projectProgress(project.currentStage, project.stages.length)}</strong><span>tamamlandı</span></div></header>
        <div className="project-progress"><span style={{ width: `${projectProgress(project.currentStage, project.stages.length)}%` }} /></div>
        <div className="stage-track">{project.stages.map((stage, index) => <div className={index < project.currentStage ? 'done' : index === project.currentStage ? 'current' : ''} key={stage}><span>{index < project.currentStage ? <Check size={13} /> : index + 1}</span><small>{stage}</small></div>)}</div>
        <footer><div><UserRound size={16} /><span>Sorumlu<strong>{project.owner}</strong></span></div><div><CalendarClock size={16} /><span>Hedef tarih<strong>{new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(project.dueDate))}</strong></span></div><div><FileCheck2 size={16} /><span>Belgeler<strong>{project.currentStage + 2}/{project.stages.length + 2} hazır</strong></span></div>{!complete && role !== 'musteri' && <button onClick={() => updateProject({ ...project, currentStage: project.currentStage + 1 })}>Aşamayı tamamla <ChevronRight size={16} /></button>}</footer>
      </article>
    })}</section>
  </div>
}
