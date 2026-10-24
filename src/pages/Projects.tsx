import { CalendarClock, Camera, Check, ChevronDown, ChevronRight, FileCheck2, FileSpreadsheet, Image, MapPin, MessageSquare, Navigation, PackageCheck, Phone, Plus, Printer, Trash2, UserRound, Video } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { EntityDetailModal, type ProfileSubject } from '../components/EntityDetailModal'
import { MediaPreview } from '../components/MediaPreview'
import { useApp } from '../context/AppContext'
import { directionsUrl, isProjectClosed, projectProgress, sortProjectsNewestFirst } from '../lib/domain'
import { deleteMediaFile, saveMediaFile } from '../lib/mediaStore'
import type { Project, ProjectMaterial, Role, Survey } from '../types'

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)

export function Projects() {
  const { projects, customers, users, surveys, updateProject, role } = useApp()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileSubject | null>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'approval' | 'closed'>(() => {
    const requested = sessionStorage.getItem('tesisat-pro-list-filter')
    if (requested === 'projects:approval') {
      sessionStorage.removeItem('tesisat-pro-list-filter')
      return 'approval'
    }
    return 'all'
  })
  const [newMaterial, setNewMaterial] = useState({ label: '', quantity: 1, unit: 'adet' })
  const roleProjects = role === 'musteri' ? projects.filter((project) => project.customerId === 'mus-001') : role === 'usta' ? projects.filter((project) => project.assignedMasterId === 'usr-002') : projects
  const isApprovalWaiting = (project: Project) => project.stages[project.currentStage]?.toLocaleLowerCase('tr-TR').includes('onaya gönderildi') ?? false
  const visible = sortProjectsNewestFirst(roleProjects.filter((project) => filter === 'all' || (filter === 'open' && !isProjectClosed(project)) || (filter === 'closed' && isProjectClosed(project)) || (filter === 'approval' && isApprovalWaiting(project))))

  const updateMaterial = (project: Project, material: ProjectMaterial) => updateProject({ ...project, materials: (project.materials ?? []).map((item) => item.id === material.id ? material : item) })
  const addMaterial = (project: Project) => {
    if (!newMaterial.label.trim()) return
    updateProject({ ...project, materials: [...(project.materials ?? []), { id: `mat-${Date.now()}`, ...newMaterial, label: newMaterial.label.trim(), prepared: false }] })
    setNewMaterial({ label: '', quantity: 1, unit: 'adet' })
  }
  const removeMaterial = (project: Project, id: string) => updateProject({ ...project, materials: (project.materials ?? []).filter((item) => item.id !== id) })
  const upload = (project: Project, event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    const attachments = files.map((file, index) => {
      const id = `application-media-${Date.now()}-${index}-${file.name}`
      void saveMediaFile(id, file).catch(() => undefined)
      return { id, name: file.name, type: file.type.startsWith('video') ? 'video' as const : 'image' as const, url: URL.createObjectURL(file), addedBy: role === 'usta' ? (users.find((user) => user.id === project.assignedMasterId)?.name ?? 'Saha ustası') : role === 'proje' ? project.owner : 'Yönetici', createdAt: new Date().toISOString(), approved: false, description: '', adminComment: '' }
    })
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
    popup.document.write(`<html><head><title>${escapeHtml(project.id)} Malzeme Listesi</title><style>body{font-family:Arial;padding:32px;color:#173333}h1{font-size:24px}p{color:#65736f}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:10px;border:1px solid #dfe3dd;text-align:left}th{background:#eef4f1}</style></head><body><h1>Tesisat PRO · Malzeme Listesi</h1><p>${escapeHtml(project.id)} · ${escapeHtml(customer?.name ?? '')} · ${escapeHtml(project.type)}</p><table><thead><tr><th>Malzeme</th><th>Miktar</th><th>Birim</th><th>Durum</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`)
    popup.document.close()
  }

  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">UÇTAN UCA UYGULAMA</span><h1>Proje ve iş takibi</h1><p>Uygulama, malzeme, saha kanıtları ve resmi kurum süreçlerini birlikte yönetin.</p></div><div className="segmented project-filters"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tümü</button><button className={filter === 'open' ? 'active' : ''} onClick={() => setFilter('open')}>Açık</button><button className={filter === 'approval' ? 'active' : ''} onClick={() => setFilter('approval')}>Onay bekleyen</button><button className={filter === 'closed' ? 'active' : ''} onClick={() => setFilter('closed')}>Biten</button></div></section>
    <section className="project-list">{visible.map((project) => {
      const customer = customers.find((item) => item.id === project.customerId)
      const survey = surveys.find((item) => item.id === project.surveyId)
      const master = users.find((user) => user.id === project.assignedMasterId)
      const manager = users.find((user) => user.id === project.ownerId) ?? users.find((user) => user.role === 'proje' && user.name === project.owner)
      const complete = project.currentStage === project.stages.length - 1
      const expanded = expandedId === project.id
      const preparedCount = (project.materials ?? []).filter((item) => item.prepared).length
      const canAdvance = role === 'admin' || role === 'proje' || (role === 'usta' && project.currentStage === 0)
      const siteAddress = project.siteAddress ?? survey?.siteAddress ?? (customer ? `${customer.address}, ${customer.district}` : '')
      const siteContactName = project.siteContactName ?? survey?.siteContactName ?? customer?.name
      const siteContactPhone = project.siteContactPhone ?? survey?.siteContactPhone ?? customer?.phone
      const routeUrl = directionsUrl(project.latitude ?? survey?.latitude, project.longitude ?? survey?.longitude, siteAddress)
      return <article className="project-card panel" key={project.id}>
        <header><div><span className={`project-type project-${project.type === 'Doğalgaz' ? 'gas' : project.type === 'Isı Pompası' ? 'heat' : project.type === 'Klima' ? 'ac' : 'water'}`}>{project.type}</span>{role === 'admin' && customer ? <button className="entity-name-link project-customer-link" onClick={() => setProfile({ kind: 'customer', id: customer.id })}>{customer.name}</button> : <h3>{customer?.name}</h3>}<p>{project.id}{project.surveyId && ` · ${project.surveyId}`} · {customer?.district}</p></div><div className="project-progress-number"><strong>%{projectProgress(project.currentStage, project.stages.length)}</strong><span>tamamlandı</span></div></header>
        <div className="project-progress"><span style={{ width: `${projectProgress(project.currentStage, project.stages.length)}%` }} /></div>
        <div className="stage-track" style={{ gridTemplateColumns: `repeat(${project.stages.length}, minmax(70px, 1fr))` }}>{project.stages.map((stage, index) => <div className={index < project.currentStage ? 'done' : index === project.currentStage ? 'current' : ''} key={stage}><span>{index < project.currentStage ? <Check size={13} /> : index + 1}</span><small>{stage}</small></div>)}</div>
        <div className="project-site-info"><div><MapPin size={17} /><span>Uygulama adresi<strong>{siteAddress || 'Adres girilmedi'}</strong></span></div><div><Phone size={17} /><span>Randevu kişisi<strong>{siteContactName ?? 'Belirlenmedi'}{siteContactPhone && ` · ${siteContactPhone}`}</strong></span></div><button disabled={!routeUrl} onClick={() => routeUrl && window.open(routeUrl, '_blank', 'noopener,noreferrer')}><Navigation size={16} /> Yol tarifi al</button></div>
        <footer><div><UserRound size={16} /><span>Usta{role === 'admin' && master ? <button className="entity-name-link compact" onClick={() => setProfile({ kind: 'user', id: master.id })}>{master.name}</button> : <strong>{master?.name ?? 'Atanmadı'}</strong>}</span></div><div><UserRound size={16} /><span>Proje takipçisi{role === 'admin' && manager ? <button className="entity-name-link compact" onClick={() => setProfile({ kind: 'user', id: manager.id })}>{manager.name}</button> : <strong>{project.owner}</strong>}</span></div><div><CalendarClock size={16} /><span>Uygulama günü<strong>{project.applicationDate ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${project.applicationDate}T12:00:00`)) : 'Belirlenmedi'}</strong></span></div><div><PackageCheck size={16} /><span>Malzemeler<strong>{preparedCount}/{project.materials?.length ?? 0} hazır</strong></span></div>{!complete && canAdvance && <button onClick={() => updateProject({ ...project, currentStage: project.currentStage + 1 })}>{role === 'usta' ? 'Uygulama tamamlandı' : 'Aşamayı tamamla'} <ChevronRight size={16} /></button>}<button className="project-detail-toggle" onClick={() => setExpandedId(expanded ? null : project.id)}>Detaylar <ChevronDown size={15} /></button></footer>
        {expanded && <div className="project-detail-panel">
          <section className="material-editor"><div className="detail-section-head"><div><span className="eyebrow">MALZEME LİSTESİ</span><h4>Düzenle ve dışa aktar</h4></div><div><button onClick={() => printPdf(project)}><Printer size={15} /> PDF</button><button onClick={() => exportExcel(project)}><FileSpreadsheet size={15} /> Excel</button></div></div><div className="material-list">{(project.materials ?? []).map((material) => <div key={material.id}><button className={`material-check ${material.prepared ? 'checked' : ''}`} onClick={() => updateMaterial(project, { ...material, prepared: !material.prepared })}>{material.prepared && <Check size={13} />}</button><input value={material.label} onChange={(event) => updateMaterial(project, { ...material, label: event.target.value })} /><input type="number" min="0" value={material.quantity} onChange={(event) => updateMaterial(project, { ...material, quantity: Number(event.target.value) })} /><input value={material.unit} onChange={(event) => updateMaterial(project, { ...material, unit: event.target.value })} /><button className="delete-material" onClick={() => removeMaterial(project, material.id)}><Trash2 size={14} /></button></div>)}</div>{role !== 'musteri' && <div className="add-material-row"><input value={newMaterial.label} onChange={(event) => setNewMaterial({ ...newMaterial, label: event.target.value })} placeholder="Yeni malzeme" /><input type="number" value={newMaterial.quantity} onChange={(event) => setNewMaterial({ ...newMaterial, quantity: Number(event.target.value) })} /><input value={newMaterial.unit} onChange={(event) => setNewMaterial({ ...newMaterial, unit: event.target.value })} /><button onClick={() => addMaterial(project)}><Plus size={14} /> Ekle</button></div>}</section>
          <ProjectEvidenceEditor project={project} survey={survey} role={role} onUpdate={updateProject} onUpload={(event) => upload(project, event)} />
        </div>}
      </article>
    })}{visible.length === 0 && <div className="empty-list panel">Bu listede gösterilecek proje bulunmuyor.</div>}</section>
    <EntityDetailModal subject={profile} onClose={() => setProfile(null)} />
  </div>
}

function ProjectEvidenceEditor({ project, survey, role, onUpdate, onUpload }: { project: Project; survey?: Survey; role: Role; onUpdate: (project: Project) => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void }) {
  const attachments = project.attachments ?? []
  const updateAttachment = (id: string, patch: Partial<(typeof attachments)[number]>) => onUpdate({ ...project, attachments: attachments.map((item) => item.id === id ? { ...item, ...patch } : item) })
  const removeAttachment = (id: string) => {
    void deleteMediaFile(id).catch(() => undefined)
    onUpdate({ ...project, attachments: attachments.filter((item) => item.id !== id) })
  }
  return <section className="evidence-editor">
    <div className="detail-section-head"><div><span className="eyebrow">SAHA MEDYALARI</span><h4>Keşif ve uygulama kayıtları</h4></div>{role !== 'musteri' && <label className="upload-button"><Camera size={15} /> Fotoğraf / video ekle<input type="file" accept="image/*,video/*" multiple onChange={onUpload} /></label>}</div>
    {(survey?.attachments?.length ?? 0) > 0 && <div className="evidence-subsection"><div className="evidence-subtitle"><Image size={15} /><span><strong>Keşif fotoğrafları</strong><small>{survey?.attachments?.length} kayıt</small></span></div><div className="readonly-media-grid">{survey?.attachments?.map((photo) => <article key={photo.id}><MediaPreview id={photo.id} url={photo.url} type="image" alt={photo.description || photo.name} /><div><strong>{photo.name}</strong><p>{photo.description || 'Açıklama eklenmemiş.'}</p><small>{photo.addedBy}</small></div></article>)}</div></div>}
    <div className="evidence-subsection application-evidence"><div className="evidence-subtitle"><Video size={15} /><span><strong>Uygulama fotoğraf ve videoları</strong><small>{attachments.length} kayıt</small></span></div>{attachments.length === 0 ? <div className="empty-evidence"><Image size={25} /><span>Henüz uygulama fotoğrafı veya videosu eklenmedi.</span></div> : <div className="application-media-list">{attachments.map((attachment) => <article key={attachment.id}><MediaPreview id={attachment.id} url={attachment.url} type={attachment.type} alt={attachment.description || attachment.name} /><div className="application-media-content"><header><div><strong>{attachment.name}</strong><small>{attachment.addedBy} · {new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(attachment.createdAt))}</small></div><em className={attachment.approved ? 'approved' : ''}>{attachment.approved ? 'Onaylandı' : 'Onay bekliyor'}</em></header><label><span>Uygulama açıklaması</span><textarea value={attachment.description ?? ''} disabled={role === 'musteri'} onChange={(event) => updateAttachment(attachment.id, { description: event.target.value })} placeholder="Yapılan işlem, kullanılan bölüm veya dikkat edilecek nokta…" /></label>{role === 'admin' ? <label className="admin-media-comment"><span><MessageSquare size={13} /> Yönetici yorumu</span><textarea value={attachment.adminComment ?? ''} onChange={(event) => updateAttachment(attachment.id, { adminComment: event.target.value })} placeholder="Ustaya geri bildirim veya düzeltme notu…" /></label> : attachment.adminComment && <div className="admin-comment-readonly"><MessageSquare size={14} /><span><strong>Yönetici yorumu</strong>{attachment.adminComment}</span></div>}<footer>{role === 'admin' && <button className="media-approve" onClick={() => updateAttachment(attachment.id, { approved: !attachment.approved })}><Check size={14} /> {attachment.approved ? 'Onayı kaldır' : 'Medyayı onayla'}</button>}{role !== 'musteri' && <button className="media-delete" onClick={() => removeAttachment(attachment.id)}><Trash2 size={14} /> Sil</button>}</footer></div></article>)}</div>}</div>
    {role === 'admin' && <button className={`admin-approval ${project.adminApproved ? 'approved' : ''}`} onClick={() => onUpdate({ ...project, adminApproved: !project.adminApproved })}><FileCheck2 size={16} /> {project.adminApproved ? 'Uygulama admin tarafından onaylandı' : 'Uygulamayı tamamlandı olarak onayla'}</button>}
  </section>
}
