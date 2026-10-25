import { Edit3, KeyRound, LoaderCircle, Plus, Search, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Modal } from '../components/Modal'
import { EntityDetailModal, type ProfileSubject } from '../components/EntityDetailModal'
import { useApp } from '../context/AppContext'
import { initials } from '../lib/domain'
import type { AppUser, Customer, Role } from '../types'

const roleLabels: Record<Role, string> = { admin: 'Yönetici', usta: 'Usta', proje: 'Proje takipçisi', musteri: 'Müşteri' }
const emptyUser: Omit<AppUser, 'id'> = { name: '', phone: '', email: '', role: 'usta', active: true }

export function Users() {
  const { users, customers, addUser, updateUser, role } = useApp()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [creating, setCreating] = useState(false)
  const [profile, setProfile] = useState<ProfileSubject | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const filtered = useMemo(() => users.filter((user) => `${user.name} ${user.phone} ${user.email} ${roleLabels[user.role]}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))).sort((a, b) => a.name.localeCompare(b.name, 'tr-TR')), [query, users])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const values = {
      name: String(data.get('name')).trim(),
      phone: String(data.get('phone')).trim(),
      email: String(data.get('email')).trim(),
      role: String(data.get('role')) as Role,
      active: data.get('active') === 'on',
      customerId: String(data.get('customerId') ?? '') || undefined,
    }
    if (!values.name) {
      setError('Ad soyad alanını doldurun.')
      return
    }
    const phoneDigits = values.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) {
      setError(`Telefon numarası en az 10 rakam içermelidir. Şu anda ${phoneDigits.length} rakam algılandı.`)
      return
    }
    if (values.role === 'musteri' && !values.customerId) {
      setError('Müşteri rolü için bağlı müşteri/cari kaydını seçin.')
      return
    }
    const password = String(data.get('password') ?? '')
    if (!values.email.trim() && password.length < 8 && !editing) {
      setError('E-postasız kullanıcı için en az 8 karakterli ilk şifre belirleyin.')
      return
    }
    setBusy(true); setError(''); setMessage('')
    try {
      if (editing) {
        await updateUser({ ...editing, ...values }, password)
        setMessage(`${values.name} hesabı güncellendi${password ? ' ve yeni şifresi kaydedildi' : ''}.`)
      } else {
        await addUser(values, password)
        setMessage(values.email ? `${values.email} adresine hesap kurulum e-postası gönderildi.` : `${values.name} telefon ve şifreyle giriş yapabilecek.`)
      }
      setEditing(null)
      setCreating(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kullanıcı işlemi tamamlanamadı.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">YETKİ YÖNETİMİ</span><h1>Kullanıcılar</h1><p>Yönetici, usta ve proje takipçisi hesaplarını oluşturun ve düzenleyin.</p></div><button className="primary-button" onClick={() => setCreating(true)}><Plus size={17} /> Yeni kullanıcı</button></section>
    {message && <div className="page-message success">{message}</div>}{error && <div className="page-message error">{error}</div>}
    <section className="user-metric-grid">
      <div className="panel"><ShieldCheck /><span><strong>{users.filter((user) => user.role === 'admin').length}</strong> yönetici</span></div>
      <div className="panel"><UserCheck /><span><strong>{users.filter((user) => user.role === 'usta' && user.active).length}</strong> aktif usta</span></div>
      <div className="panel"><UserCheck /><span><strong>{users.filter((user) => user.role === 'proje' && user.active).length}</strong> proje takipçisi</span></div>
      <div className="panel"><UserX /><span><strong>{users.filter((user) => !user.active).length}</strong> pasif kullanıcı</span></div>
    </section>
    <section className="toolbar panel"><label className="list-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="İsim, telefon, e-posta veya rol ara…" /></label><div className="result-count"><strong>{filtered.length}</strong> kullanıcı</div></section>
    <section className="panel table-panel"><div className="data-table users-table"><div className="table-row table-head"><span>Kullanıcı</span><span>İletişim</span><span>Rol</span><span>Durum</span><span /></div>{filtered.map((user) => <div className="table-row" key={user.id}><span><i className="avatar">{initials(user.name)}</i>{role === 'admin' && (user.role === 'usta' || user.role === 'proje') ? <button className="entity-name-link" onClick={() => setProfile({ kind: 'user', id: user.id })}>{user.name}</button> : <strong>{user.name}</strong>}</span><span><span><strong>{user.phone}</strong><small>{user.email || 'Telefonla giriş'}</small></span></span><span><em className={`role-badge role-${user.role}`}>{roleLabels[user.role]}</em></span><span><em className={`status-pill ${user.active ? 'status-tamamlandı' : 'status-gecikti'}`}>{user.active ? 'Aktif' : 'Pasif'}</em></span><span><button className="table-action" onClick={() => setEditing(user)}><Edit3 size={14} /> Düzenle</button></span></div>)}</div></section>
    <UserModal open={creating || Boolean(editing)} user={editing} customers={customers} busy={busy} error={error} onClose={() => { setCreating(false); setEditing(null); setError('') }} onSave={save} />
    <EntityDetailModal subject={profile} onClose={() => setProfile(null)} />
  </div>
}

function UserModal({ open, user, customers, busy, error, onClose, onSave }: { open: boolean; user: AppUser | null; customers: Customer[]; busy: boolean; error: string; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const values = user ?? emptyUser
  return <Modal open={open} onClose={onClose} eyebrow="KULLANICI HESABI" title={user ? 'Kullanıcıyı düzenle' : 'Yeni kullanıcı'}>
    <form className="modal-form" key={user?.id ?? 'new'} onSubmit={onSave}>
      <div className="form-grid two"><label><span>Ad soyad</span><input name="name" defaultValue={values.name} required /></label><label><span>Telefon</span><input name="phone" type="tel" inputMode="tel" defaultValue={values.phone} required placeholder="05xx xxx xx xx" /><small>En az 10 rakam girin. E-posta yoksa bu numarayla giriş yapılır.</small></label></div>
      <div className="form-grid two"><label><span>E-posta (isteğe bağlı)</span><input type="email" name="email" defaultValue={values.email} placeholder="E-posta yoksa boş bırakın" /></label><label><span>Rol</span><select name="role" defaultValue={values.role}>{Object.entries(roleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
      <label className="field user-customer-field"><span>Bağlı müşteri / cari</span><select name="customerId" defaultValue={values.customerId ?? ''}><option value="">Personel hesabı / bağlı müşteri yok</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} · {customer.phone}</option>)}</select><small>Rol “Müşteri” ise zorunludur; müşteri sadece kendi proje ve ödemelerini görür.</small></label>
      <label className="field user-password-field"><span>{user ? 'Yönetici yeni şifresi' : 'İlk şifre'}</span><div><KeyRound size={16} /><input type="password" name="password" minLength={8} autoComplete="new-password" placeholder={user ? 'Değişmeyecekse boş bırakın' : 'E-postasız hesapta zorunlu'} /></div><small>{user ? 'Yazarsanız kullanıcının şifresi doğrudan değiştirilir.' : 'E-posta varsa davet bağlantısı gider; e-posta yoksa bu şifreyle telefon numarasından giriş yapılır.'}</small></label>
      <label className="active-user-check"><input type="checkbox" name="active" defaultChecked={values.active} /> Kullanıcı aktif</label>
      {error && <div className="auth-message error">{error}</div>}
      <footer className="modal-footer"><button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Vazgeç</button><button className="primary-button" type="submit" disabled={busy}>{busy && <LoaderCircle className="spin" size={16} />} {user ? 'Kaydet' : 'Kullanıcıyı oluştur'}</button></footer>
    </form>
  </Modal>
}
