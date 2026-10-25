import { CalendarClock, Camera, Check, ChevronDown, ChevronRight, FileCheck2, FileSpreadsheet, Image, MapPin, MessageSquare, Navigation, PackageCheck, Phone, Plus, Printer, RotateCcw, Save, Trash2, UserRound, Video } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { EntityDetailModal, type ProfileSubject } from '../components/EntityDetailModal'
import { MediaPreview } from '../components/MediaPreview'
import { useApp } from '../context/AppContext'
import { directionsUrl, isProjectClosed, projectProgress, sortProjectsNewestFirst } from '../lib/domain'
import { buildApproximateMaterials } from '../lib/materials'
import { deleteMediaFile, saveMediaFile } from '../lib/mediaStore'
import type { Project, ProjectMaterial, Role, Survey } from '../types'

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)
const preparationDate = (applicationDate?: string) => {
  if (!applicationDate) return 'Belirlenmedi'
  const date = new Date(`${applicationDate}T12:00:00`)
  date.setDate(date.getDate() - 1)
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

export function Projects() {
  const { projects, customers, users, surveys, products, templates, jobs, updateProject, updateJob, updateTemplate, role, currentUser } = useApp()
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
  const roleProjects = role === 'musteri' ? projects.filter((project) => project.customerId === currentUser.customerId) : role === 'usta' ? projects.filter((project) => project.assignedMasterId === currentUser.id) : projects
  const isApprovalWaiting = (project: Project) => project.stages[project.currentStage]?.toLocaleLowerCase('tr-TR').includes('onaya gönderildi') ?? false
  const visible = sortProjectsNewestFirst(roleProjects.filter((project) => filter === 'all' || (filter === 'open' && !isProjectClosed(project)) || (filter === 'closed' && isProjectClosed(project)) || (filter === 'approval' && isApprovalWaiting(project))))

  const replaceMaterials = (project: Project, materials: ProjectMaterial[]) => {
    updateProject({ ...project, materials })
    const job = jobs.find((item) => item.projectId === project.id)
    if (job) updateJob({ ...job, checklist: materials.map((material) => ({ id: `check-${material.id}`, label: `${material.label} · ${material.quantity} ${material.unit}`, done: material.prepared })) })
  }
  const updateMaterial = (project: Project, material: ProjectMaterial) => replaceMaterials(project, (project.materials ?? []).map((item) => item.id === material.id ? material : item))
  const addMaterial = (project: Project) => {
    if (!newMaterial.label.trim()) return
    replaceMaterials(project, [...(project.materials ?? []), { id: `mat-${Date.now()}`, ...newMaterial, label: newMaterial.label.trim(), prepared: false }])
    setNewMaterial({ label: '', quantity: 1, unit: 'adet' })
  }
  const removeMaterial = (project: Project, id: string) => replaceMaterials(project, (project.materials ?? []).filter((item) => item.id !== id))
  const applyMaterialTemplate = (project: Project) => {
    const survey = surveys.find((item) => item.id === project.surveyId)
    const template = templates.find((item) => item.id === (project.materialTemplateId ?? survey?.templateId))
    replaceMaterials(project, buildApproximateMaterials(survey, template, products))
  }
  const saveMaterialsToTemplate = (project: Project) => {
    const survey = surveys.find((item) => item.id === project.surveyId)
    const template = templates.find((item) => item.id === (project.materialTemplateId ?? survey?.templateId))
    if (!template) return
    updateTemplate({ ...template, materialItems: (project.materials ?? []).map((item, index) => ({ id: `mt-saved-${index + 1}`, productId: item.productId, label: item.label, quantity: item.quantity, unit: item.unit })) })
  }
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
    const rows = [['Sıra', 'Kontrol', 'Malzeme', 'Miktar', 'Birim', 'Not'], ...(project.materials ?? []).map((item, index) => [String(index + 1), item.prepared ? '☑' : '☐', item.label, String(item.quantity), item.unit, ''])]
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
    const master = users.find((item) => item.id === project.assignedMasterId)
    const rows = (project.materials ?? []).map((item, index) => `<tr><td class="number">${index + 1}</td><td class="box">${item.prepared ? '&#9745;' : '&#9744;'}</td><td>${escapeHtml(item.label)}</td><td class="quantity">${item.quantity}</td><td>${escapeHtml(item.unit)}</td><td class="notes"></td></tr>`).join('')
    popup.document.write(`<html><head><meta charset="utf-8"><title>${escapeHtml(project.id)} Malzeme Kontrol Listesi</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#173333;margin:0}header{display:flex;justify-content:space-between;border-bottom:3px solid #176b87;padding-bottom:12px}h1{font-size:22px;margin:0}.brand{color:#176b87;font-weight:700}.meta{display:grid;grid-template-columns:1fr 1fr;gap:7px 20px;margin:16px 0;font-size:12px}.meta span{border-bottom:1px solid #ccd7d5;padding:5px 0}.meta b{display:block;font-size:9px;color:#71817e;margin-bottom:3px}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:11px}th,td{padding:8px;border:1px solid #9caaa7;text-align:left}th{background:#e9f1f4}.number,.quantity{text-align:center;width:46px}.box{width:52px;text-align:center;font-size:22px}.notes{width:125px;height:34px}footer{margin-top:12px;font-size:9px;color:#758481}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:70px;margin-top:38px}.signatures div{border-top:1px solid #758481;padding-top:5px;text-align:center;font-size:10px}@media print{button{display:none}}</style></head><body><header><div><div class="brand">Tesisat PRO</div><h1>Malzeme Kontrol Listesi</h1></div><strong>${escapeHtml(project.id)}</strong></header><div class="meta"><span><b>MÜŞTERİ</b>${escapeHtml(customer?.name ?? '')}</span><span><b>İŞ TÜRÜ</b>${escapeHtml(project.type)}</span><span><b>UYGULAMA GÜNÜ</b>${escapeHtml(project.applicationDate ?? 'Belirlenmedi')}</span><span><b>USTA</b>${escapeHtml(master?.name ?? 'Atanmadı')}</span><span><b>ADRES</b>${escapeHtml(project.siteAddress ?? '')}</span><span><b>HAZIRLIK TARİHİ</b>${escapeHtml(preparationDate(project.applicationDate))}</span></div><table><thead><tr><th>No</th><th>Kontrol</th><th>Malzeme</th><th>Miktar</th><th>Birim</th><th>Not</th></tr></thead><tbody>${rows}</tbody></table><div class="signatures"><div>Hazırlayan usta</div><div>Kontrol eden</div></div><footer>Liste yaklaşık olarak sistem tarafından hazırlanmıştır. Sahaya çıkmadan önce miktarları ve eksikleri kontrol ediniz.</footer><script>window.onload=()=>window.print()</script></body></html>`)
    popup.document.close()
  }

  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">UÇTAN UCA UYGULAMA</span><h1>Proje ve iş takibi</h1><p>Uygulama, malzeme, saha kanıtları ve resmi kurum süreçlerini birlikte yönetin.</p></div><div className="segmented project-filters"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tümü</button><button className={filter === 'open' ? 'active' : ''} onClick={() => setFilter('open')}>Açık</button><button className={filter === 'approval' ? 'active' : ''} onClick={() => setFilter('approval')}>Onay bekleyen</button><button className={filter === 'closed' ? 'active' : ''} onClick={() => setFilter('closed')}>Biten</button></div></section>
    <section className="project-list">{visible.map((project) => {
      const customer = customers.find((item) => item.id === project.customerId)
      const survey = surveys.find((item) => item.id === project.surveyId)
      const master = users.find((user) => user.id === project.assignedMasterId)
      const manager = users.find((user) => user.id === project.ownerId) ?? users.find((user) => user.role === 'proje' && user.name === project.owner)
      const materialTemplate = templates.find((item) => item.id === (project.materialTemplateId ?? survey?.templateId))
      const complete = project.currentStage === project.stages.length - 1
      const expanded = expandedId === project.id
      const preparedCount = (project.materials ?? []).filter((item) => item.prepared).length
      const canAdvance = role === 'admin' || role === 'proje' || (role === 'usta' && project.currentStage === 0)
      const canEditMaterials = role === 'admin' || role === 'usta'
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
          <section className="material-editor"><div className="detail-section-head material-detail-head"><div><span className="eyebrow">MALZEME KONTROL LİSTESİ</span><h4>{materialTemplate?.name ?? project.type} yaklaşık listesi</h4><small>Hazırlık günü: {preparationDate(project.applicationDate)} · Uygulamadan bir gün önce kontrol edin.</small></div><div>{canEditMaterials && materialTemplate && <button onClick={() => applyMaterialTemplate(project)}><RotateCcw size={15} /> Şablonu uygula</button>}{role === 'admin' && materialTemplate && <button onClick={() => saveMaterialsToTemplate(project)}><Save size={15} /> Şablona kaydet</button>}<button onClick={() => printPdf(project)}><Printer size={15} /> PDF checklist</button><button onClick={() => exportExcel(project)}><FileSpreadsheet size={15} /> Excel</button></div></div><div className="material-list">{(project.materials ?? []).map((material) => <div key={material.id}><button disabled={!canEditMaterials} className={`material-check ${material.prepared ? 'checked' : ''}`} onClick={() => updateMaterial(project, { ...material, prepared: !material.prepared })}>{material.prepared && <Check size={13} />}</button><input disabled={!canEditMaterials} value={material.label} onChange={(event) => updateMaterial(project, { ...material, label: event.target.value })} /><input disabled={!canEditMaterials} type="number" min="0" value={material.quantity} onChange={(event) => updateMaterial(project, { ...material, quantity: Number(event.target.value) })} /><input disabled={!canEditMaterials} value={material.unit} onChange={(event) => updateMaterial(project, { ...material, unit: event.target.value })} />{canEditMaterials ? <button className="delete-material" onClick={() => removeMaterial(project, material.id)}><Trash2 size={14} /></button> : <span />}</div>)}</div>{canEditMaterials && <div className="add-material-row"><input value={newMaterial.label} onChange={(event) => setNewMaterial({ ...newMaterial, label: event.target.value })} placeholder="Yeni malzeme" /><input type="number" value={newMaterial.quantity} onChange={(event) => setNewMaterial({ ...newMaterial, quantity: Number(event.target.value) })} /><input value={newMaterial.unit} onChange={(event) => setNewMaterial({ ...newMaterial, unit: event.target.value })} /><button onClick={() => addMaterial(project)}><Plus size={14} /> Ekle</button></div>}</section>
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
