import {
  Bell,
  ChartNoAxesCombined,
  ClipboardPenLine,
  Cloud,
  CloudOff,
  Droplets,
  LayoutDashboard,
  LogOut,
  Menu,
  Milestone,
  PackageSearch,
  Search,
  ShieldCheck,
  UsersRound,
  WalletCards,
  Wrench,
  X,
} from 'lucide-react'
import { useState, type ComponentType, type ReactNode } from 'react'
import { canAccess, initials } from '../lib/domain'
import type { PageKey, Role } from '../types'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'

interface NavItem {
  key: PageKey
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Genel bakış', icon: LayoutDashboard },
  { key: 'users', label: 'Kullanıcılar', icon: ShieldCheck },
  { key: 'customers', label: 'Müşteriler', icon: UsersRound },
  { key: 'surveys', label: 'Keşifler', icon: ClipboardPenLine },
  { key: 'jobs', label: 'İşler & ustalar', icon: Wrench },
  { key: 'projects', label: 'Proje takibi', icon: Milestone },
  { key: 'payments', label: 'Ödemeler', icon: WalletCards },
  { key: 'catalog', label: 'Ürün & fiyatlar', icon: PackageSearch },
  { key: 'reports', label: 'Raporlar', icon: ChartNoAxesCombined },
]

const roleLabels: Record<Role, string> = {
  admin: 'Yönetici',
  usta: 'Usta',
  proje: 'Proje takipçisi',
  musteri: 'Müşteri',
}

export function Shell({ page, onNavigate, children }: { page: PageKey; onNavigate: (page: PageKey) => void; children: ReactNode }) {
  const { role, currentUser, syncStatus } = useApp()
  const { signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const visibleItems = navItems.filter((item) => canAccess(role, item.key))
  const current = navItems.find((item) => item.key === page)

  const navigate = (target: PageKey) => {
    onNavigate(target)
    setMobileOpen(false)
  }

  return (
    <div className="app-shell">
      {mobileOpen && <button className="sidebar-scrim" aria-label="Menüyü kapat" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><Droplets size={22} fill="currentColor" /></div>
          <div><strong>Tesisat PRO</strong><span>saha operasyonları</span></div>
          <button className="mobile-close icon-button" onClick={() => setMobileOpen(false)}><X size={19} /></button>
        </div>
        <nav className="side-nav" aria-label="Ana menü">
          <p className="side-label">ÇALIŞMA ALANI</p>
          {visibleItems.map(({ key, label, icon: Icon }) => (
            <button key={key} className={page === key ? 'active' : ''} onClick={() => navigate(key)}>
              <Icon size={19} strokeWidth={1.9} />
              <span>{label}</span>
              {key === 'jobs' && <small className="nav-count">3</small>}
            </button>
          ))}
        </nav>
        <div className={`sidebar-help sync-${syncStatus}`}>
          {syncStatus === 'error' ? <CloudOff size={17} /> : <Cloud size={17} />}
          <div><strong>{syncStatus === 'error' ? 'Bağlantı sorunu' : syncStatus === 'loading' ? 'Veriler eşitleniyor' : 'Bulut bağlantısı aktif'}</strong><small>{syncStatus === 'online' ? 'Tüm cihazlarda güncel' : syncStatus === 'error' ? 'İnternetinizi kontrol edin' : 'Lütfen bekleyin'}</small></div>
        </div>
        <div className="profile-mini">
          <div className="avatar">{initials(currentUser.name)}</div>
          <div><strong>{currentUser.name}</strong><span>{roleLabels[role]}</span></div>
          <button onClick={() => void signOut()} title="Çıkış yap" aria-label="Çıkış yap"><LogOut size={16} /></button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Menüyü aç"><Menu size={21} /></button>
          <div className="page-identity">
            <span>Çalışma alanı</span>
            <strong>{current?.label}</strong>
          </div>
          <label className="global-search">
            <Search size={18} />
            <input aria-label="Genel arama" placeholder="Müşteri, iş veya proje ara…" />
            <kbd>⌘ K</kbd>
          </label>
          <div className="topbar-actions">
            <button className="notification-button" aria-label="Bildirimler"><Bell size={20} /><span /></button>
            <div className={`account-chip sync-${syncStatus}`}><span>{syncStatus === 'online' ? <Cloud size={15} /> : <CloudOff size={15} />}</span><div><strong>{currentUser.name}</strong><small>{roleLabels[role]}</small></div></div>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}
