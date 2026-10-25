import { MapPin, Phone, Plus, Search, UserRoundPlus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Modal } from '../components/Modal'
import { EntityDetailModal, type ProfileSubject } from '../components/EntityDetailModal'
import { useApp } from '../context/AppContext'
import { canViewPrices, formatCurrency, initials } from '../lib/domain'

export function Customers() {
  const { customers, addCustomer, role } = useApp()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<ProfileSubject | null>(null)
  const showPrices = canViewPrices(role)
  const filtered = useMemo(() => customers.filter((item) => `${item.name} ${item.phone} ${item.district}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))).sort((a, b) => a.name.localeCompare(b.name, 'tr-TR')), [customers, query])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    addCustomer({
      name: String(data.get('name')),
      phone: String(data.get('phone')),
      address: String(data.get('address')),
      district: String(data.get('district')),
    })
    setOpen(false)
  }

  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">MÜŞTERİ YÖNETİMİ</span><h1>Müşteriler</h1><p>Tüm müşteri, adres ve proje geçmişini tek yerden yönetin.</p></div><button className="primary-button" onClick={() => setOpen(true)}><UserRoundPlus size={18} /> Yeni müşteri</button></section>
    <section className="toolbar panel"><label className="list-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="İsim, telefon veya ilçe ara…" /></label><div className="result-count"><strong>{filtered.length}</strong> müşteri</div></section>
    <section className="customer-grid">
      {filtered.map((customer) => <article className="customer-card panel" key={customer.id}>
        <div className="customer-card-head"><div className="avatar avatar-large">{initials(customer.name)}</div><div>{role === 'admin' ? <button className="entity-name-link" onClick={() => setProfile({ kind: 'customer', id: customer.id })}>{customer.name}</button> : <h3>{customer.name}</h3>}<span>{customer.id.toUpperCase()}</span></div></div>
        <div className="contact-list"><span><Phone size={16} /> {customer.phone}</span><span><MapPin size={16} /> {customer.address}, {customer.district}</span></div>
        <div className={`customer-stats ${showPrices ? '' : 'single'}`}><div><span>Açık proje</span><strong>{customer.openProjectCount}</strong></div>{showPrices && <div><span>Kalan bakiye</span><strong>{formatCurrency(customer.balance)}</strong></div>}</div>
      </article>)}
      <button className="customer-add-card" onClick={() => setOpen(true)}><span><Plus /></span><strong>Yeni müşteri ekle</strong><small>İletişim ve adres bilgileriyle başlayın</small></button>
    </section>

    <Modal open={open} onClose={() => setOpen(false)} eyebrow="YENİ KAYIT" title="Müşteri oluştur">
      <form className="modal-form" onSubmit={submit}>
        <div className="form-grid two"><label><span>Ad soyad</span><input name="name" required placeholder="Örn. Ahmet Yıldız" /></label><label><span>Telefon</span><input name="phone" required placeholder="05xx xxx xx xx" /></label></div>
        <div className="form-grid two"><label><span>İlçe</span><input name="district" required placeholder="Örn. Tepebaşı" /></label><label><span>Adres</span><input name="address" required placeholder="Mahalle, sokak, bina ve daire" /></label></div>
        <footer className="modal-footer"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>Vazgeç</button><button className="primary-button" type="submit">Müşteriyi kaydet</button></footer>
      </form>
    </Modal>
    <EntityDetailModal subject={profile} onClose={() => setProfile(null)} />
  </div>
}
