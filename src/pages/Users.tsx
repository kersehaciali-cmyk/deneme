import { Edit3, Plus, Search, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Modal } from '../components/Modal'
import { EntityDetailModal, type ProfileSubject } from '../components/EntityDetailModal'
import { useApp } from '../context/AppContext'
import { initials } from '../lib/domain'
import type { AppUser, Role } from '../types'

const roleLabels: Record<Role, string> = { admin: 'Yönetici', usta: 'Usta', proje: 'Proje takipçisi', musteri: 'Müşteri' }
const emptyUser: Omit<AppUser, 'id'> = { name: '', phone: '', email: '', role: 'usta', active: true }

export function Users() {
  const { users, addUser, updateUser, role } = useApp()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [creating, setCreating] = useState(false)
  const [profile, setProfile] = useState<ProfileSubject | null>(null)
  const filtered = useMemo(() => users.filter((user) => `${user.name} ${user.phone} ${user.email} ${roleLabels[user.role]}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))), [query, users])

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const values = {
      name: String(data.get('name')),
      phone: String(data.get('phone')),
      email: String(data.get('email')),
      role: String(data.get('role')) as Role,
      active: data.get('active') === 'on',
    }
    if (editing) updateUser({ ...editing, ...values })
    else addUser(values)
    setEditing(null)
    setCreating(false)
  }

  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">YETKİ YÖNETİMİ</span><h1>Kullanıcılar</h1><p>Yönetici, usta ve proje takipçisi hesaplarını oluşturun ve düzenleyin.</p></div><button className="primary-button" onClick={() => setCreating(true)}><Plus size={17} /> Yeni kullanıcı</button></section>
    <section className="user-metric-grid">
      <div className="panel"><ShieldCheck /><span><strong>{users.filter((user) => user.role === 'admin').length}</strong> yönetici</span></div>
      <div className="panel"><UserCheck /><span><strong>{users.filter((user) => user.role === 'usta' && user.active).length}</strong> aktif usta</span></div>
      <div className="panel"><UserCheck /><span><strong>{users.filter((user) => user.role === 'proje' && user.active).length}</strong> proje takipçisi</span></div>
      <div className="panel"><UserX /><span><strong>{users.filter((user) => !user.active).length}</strong> pasif kullanıcı</span></div>
    </section>
    <section className="toolbar panel"><label className="list-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="İsim, telefon, e-posta veya rol ara…" /></label><div className="result-count"><strong>{filtered.length}</strong> kullanıcı</div></section>
    <section className="panel table-panel"><div className="data-table users-table"><div className="table-row table-head"><span>Kullanıcı</span><span>İletişim</span><span>Rol</span><span>Durum</span><span /></div>{filtered.map((user) => <div className="table-row" key={user.id}><span><i className="avatar">{initials(user.name)}</i>{role === 'admin' && (user.role === 'usta' || user.role === 'proje') ? <button className="entity-name-link" onClick={() => setProfile({ kind: 'user', id: user.id })}>{user.name}</button> : <strong>{user.name}</strong>}</span><span><span><strong>{user.phone}</strong><small>{user.email}</small></span></span><span><em className={`role-badge role-${user.role}`}>{roleLabels[user.role]}</em></span><span><em className={`status-pill ${user.active ? 'status-tamamlandı' : 'status-gecikti'}`}>{user.active ? 'Aktif' : 'Pasif'}</em></span><span><button className="table-action" onClick={() => setEditing(user)}><Edit3 size={14} /> Düzenle</button></span></div>)}</div></section>
    <UserModal open={creating || Boolean(editing)} user={editing} onClose={() => { setCreating(false); setEditing(null) }} onSave={save} />
    <EntityDetailModal subject={profile} onClose={() => setProfile(null)} />
  </div>
}

function UserModal({ open, user, onClose, onSave }: { open: boolean; user: AppUser | null; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const values = user ?? emptyUser
  return <Modal open={open} onClose={onClose} eyebrow="KULLANICI HESABI" title={user ? 'Kullanıcıyı düzenle' : 'Yeni kullanıcı'}>
    <form className="modal-form" key={user?.id ?? 'new'} onSubmit={onSave}>
      <div className="form-grid two"><label><span>Ad soyad</span><input name="name" defaultValue={values.name} required /></label><label><span>Telefon</span><input name="phone" defaultValue={values.phone} required /></label></div>
      <div className="form-grid two"><label><span>E-posta</span><input type="email" name="email" defaultValue={values.email} required /></label><label><span>Rol</span><select name="role" defaultValue={values.role}>{Object.entries(roleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
      <label className="active-user-check"><input type="checkbox" name="active" defaultChecked={values.active} /> Kullanıcı aktif</label>
      <footer className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>Vazgeç</button><button className="primary-button" type="submit">Kaydet</button></footer>
    </form>
  </Modal>
}
