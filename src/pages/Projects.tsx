import { CalendarClock, Camera, Check, ChevronDown, ChevronRight, FileCheck2, FileSpreadsheet, Image, PackageCheck, Plus, Printer, Trash2, UserRound, Video } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { useApp } from '../context/AppContext'
import { projectProgress } from '../lib/domain'
import type { Project, ProjectMaterial } from '../types'

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)

export function Projects() {
  const { projects, customers, users, updateProject, role } = useApp()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newMaterial, setNewMaterial] = useState({ label: '', quantity: 1, unit: 'adet' })
  const visible = role === 'musteri' ? projects.filter((project) => project.customerId === 'mus-001') : role === 'usta' ? projects.filter((project) => project.assignedMasterId === 'usr-002') : projects

  const updateMaterial = (project: Project, material: ProjectMaterial) => updateProject({ ...project, materials: (project.materials ?? []).map((item) => item.id === material.id ? material : item) })
  const addMaterial = (project: Project) => {
    if (!newMaterial.label.trim()) return
    updateProject({ ...project, materials: [...(project.materials ?? []), { id: `mat-${Date.now()}`, ...newMaterial, label: newMaterial.label.trim(), prepared: false }] })
    setNewMaterial({ label: '', quantity: 1, unit: 'adet' })
  }
  const removeMaterial = (project: Project, id: string) => updateProject({ ...project, materials: (project.materials ?? []).filter((item) => item.id !== id) })
  const upload = (project: Project, event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    const attachments = files.map((file) => ({ id: `att-${Date.now()}-${file.name}`, name: file.name, type: file.type.startsWith('video') ? 'video' as const : 'image' as const, url: URL.createObjectURL(file), addedBy: users.find((user) => user.id === project.assignedMasterId)?.name ?? 'Saha ekibi', createdAt: new Date().toISOString(), approved: false }))
    updateProject({ ...project, attachments: [...(project.attachments ?? []), ...attachments] })
    event.target.value = ''
  }
  const exportExcel = (project: Project) => {
    const rows = [['Malzeme', 'Miktar', 'Birim', 'Hazır'], ...(project.materials ?? []).map((item) => [item.label, String(item.quantity), item.unit, item.prepared ? 'Evet' : 'Hayır'])]
    const blob = new Blob([`\ufeff${rows.map((row) => row.join('\t')).join('\n')}`], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${project.id}-malzeme-listesi.xls`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const printPdf = (project: Project) => {
    const customer = customers.find((item) => item.id === project.customerId)
    const popup = window.open('', '_blank', 'width=850,height=700')
    if (!popup) return
    const rows = (project.materials ?? []).map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${item.quantity}</td><td>${escapeHtml(item.unit)}</td><td>${item.prepared ? 'Hazır' : 'Bekliyor'}</td></tr>`).join('')
    popup.document.write(`<html><head><title>${escapeHtml(project.id)} Malzeme Listesi</title><style>body{font-family:Arial;padding:32px;color:#173333}h1{font-size:24px}p{color:#65736f}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:10px;border:1px solid #dfe3dd;text-align:left}th{background:#eef4f1}</style></head><body><h1>Tesisat Pro · Malzeme Listesi</h1><p>${escapeHtml(project.id)} · ${escapeHtml(customer?.name ?? '')} · ${escapeHtml(project.type)}</p><table><thead><tr><th>Malzeme</th><th>Miktar</th><th>Birim</th><th>Durum</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`)
    popup.document.close()
  }

  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">UÇTAN UCA UYGULAMA</span><h1>Proje ve iş takibi</h1><p>Uygulama, malzeme, saha kanıtları ve resmi kurum süreçlerini birlikte yönetin.</p></div></section>
    <section className="project-list">{visible.map((project) => {
      const customer = customers.find((item) => item.id === project.customerId)
      const master = users.find((user) => user.id === project.assignedMasterId)
      const complete = project.currentStage === project.stages.length - 1
      const expanded = expandedId === project.id
      const preparedCount = (project.materials ?? []).filter((item) => item.prepared).length
      const canAdvance = role === 'admin' || role === 'proje' || (role === 'usta' && project.currentStage === 0)
      return <article className="project-card panel" key={project.id}>
        <header><div><span className={`project-type project-${project.type === 'Doğalgaz' ? 'gas' : project.type === 'Isı Pompası' ? 'heat' : project.type === 'Klima' ? 'ac' : 'water'}`}>{project.type}</span><h3>{customer?.name}</h3><p>{project.id}{project.surveyId && ` · ${project.surveyId}`} · {customer?.district}</p></div><div className="project-progress-number"><strong>%{projectProgress(project.currentStage, project.stages.length)}</strong><span>tamamlandı</span></div></header>
        <div className="project-progress"><span style={{ width: `${projectProgress(project.currentStage, project.stages.length)}%` }} /></div>
        <div className="stage-track" style={{ gridTemplateColumns: `repeat(${project.stages.length}, minmax(70px, 1fr))` }}>{project.stages.map((stage, index) => <div className={index < project.currentStage ? 'done' : index === project.currentStage ? 'current' : ''} key={stage}><span>{index < project.currentStage ? <Check size={13} /> : index + 1}</span><small>{stage}</small></div>)}</div>
        <footer><div><UserRound size={16} /><span>Usta<strong>{master?.name ?? 'Atanmadı'}</strong></span></div><div><CalendarClock size={16} /><span>Uygulama günü<strong>{project.applicationDate ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${project.applicationDate}T12:00:00`)) : 'Belirlenmedi'}</strong></span></div><div><PackageCheck size={16} /><span>Malzemeler<strong>{preparedCount}/{project.materials?.length ?? 0} hazır</strong></span></div>{!complete && canAdvance && <button onClick={() => updateProject({ ...project, currentStage: project.currentStage + 1 })}>{role === 'usta' ? 'Uygulama tamamlandı' : 'Aşamayı tamamla'} <ChevronRight size={16} /></button>}<button className="project-detail-toggle" onClick={() => setExpandedId(expanded ? null : project.id)}>Detaylar <ChevronDown size={15} /></button></footer>
        {expanded && <div className="project-detail-panel">
          <section className="material-editor"><div className="detail-section-head"><div><span className="eyebrow">MALZEME LİSTESİ</span><h4>Düzenle ve dışa aktar</h4></div><div><button onClick={() => printPdf(project)}><Printer size={15} /> PDF</button><button onClick={() => exportExcel(project)}><FileSpreadsheet size={15} /> Excel</button></div></div><div className="material-list">{(project.materials ?? []).map((material) => <div key={material.id}><button className={`material-check ${material.prepared ? 'checked' : ''}`} onClick={() => updateMaterial(project, { ...material, prepared: !material.prepared })}>{material.prepared && <Check size={13} />}</button><input value={material.label} onChange={(event) => updateMaterial(project, { ...material, label: event.target.value })} /><input type="number" min="0" value={material.quantity} onChange={(event) => updateMaterial(project, { ...material, quantity: Number(event.target.value) })} /><input value={material.unit} onChange={(event) => updateMaterial(project, { ...material, unit: event.target.value })} /><button className="delete-material" onClick={() => removeMaterial(project, material.id)}><Trash2 size={14} /></button></div>)}</div>{role !== 'musteri' && <div className="add-material-row"><input value={newMaterial.label} onChange={(event) => setNewMaterial({ ...newMaterial, label: event.target.value })} placeholder="Yeni malzeme" /><input type="number" value={newMaterial.quantity} onChange={(event) => setNewMaterial({ ...newMaterial, quantity: Number(event.target.value) })} /><input value={newMaterial.unit} onChange={(event) => setNewMaterial({ ...newMaterial, unit: event.target.value })} /><button onClick={() => addMaterial(project)}><Plus size={14} /> Ekle</button></div>}</section>
          <section className="evidence-editor"><div className="detail-section-head"><div><span className="eyebrow">SAHA KANITLARI</span><h4>Fotoğraf ve videolar</h4></div>{role !== 'musteri' && <label className="upload-button"><Camera size={15} /> Görsel ekle<input type="file" accept="image/*,video/*" multiple onChange={(event) => upload(project, event)} /></label>}</div>{(project.attachments ?? []).length === 0 ? <div className="empty-evidence"><Image size={25} /><span>Henüz fotoğraf veya video eklenmedi.</span></div> : <div className="attachment-grid">{project.attachments?.map((attachment) => <article key={attachment.id}>{attachment.type === 'image' ? <Image size={22} /> : <Video size={22} />}<div><strong>{attachment.name}</strong><small>{attachment.addedBy}</small></div>{attachment.approved ? <em><Check size={12} /> Onaylandı</em> : role === 'admin' ? <button onClick={() => updateProject({ ...project, attachments: project.attachments?.map((item) => item.id === attachment.id ? { ...item, approved: true } : item) })}>Onayla</button> : <em>Onay bekliyor</em>}</article>)}</div>}{role === 'admin' && <button className={`admin-approval ${project.adminApproved ? 'approved' : ''}`} onClick={() => updateProject({ ...project, adminApproved: !project.adminApproved })}><FileCheck2 size={16} /> {project.adminApproved ? 'Uygulama admin tarafından onaylandı' : 'Uygulamayı tamamlandı olarak onayla'}</button>}</section>
        </div>}
      </article>
    })}</section>
  </div>
}
