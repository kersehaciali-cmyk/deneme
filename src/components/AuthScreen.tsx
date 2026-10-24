import { ArrowLeft, CheckCircle2, Droplets, KeyRound, LoaderCircle, LockKeyhole, LogIn, Mail, Wifi } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'
  if (error.message.includes('Invalid login credentials')) return 'E-posta veya şifre hatalı.'
  if (error.message.includes('Email not confirmed')) return 'E-posta hesabı henüz doğrulanmamış.'
  return error.message
}

export function AuthBoundary({ children }: { children: ReactNode }) {
  const auth = useAuth()
  if (!auth.configured) return <CloudSetupRequired />
  if (auth.loading) return <AuthLayout><div className="auth-status"><LoaderCircle className="spin" /><strong>Güvenli oturum kontrol ediliyor…</strong></div></AuthLayout>
  if (auth.passwordRecovery && auth.session) return <NewPasswordForm />
  if (!auth.session) return <LoginForm />
  if (!auth.profile) return <AuthLayout><div className="auth-status"><LockKeyhole /><strong>Kullanıcı profili bulunamadı.</strong><p>Yönetici hesabınızın profil kaydını kontrol etmelidir.</p><button className="secondary-button" onClick={() => void auth.signOut()}>Çıkış yap</button></div></AuthLayout>
  if (!auth.profile.active) return <AuthLayout><div className="auth-status"><LockKeyhole /><strong>Hesabınız pasif durumda.</strong><p>Tekrar erişim için yöneticinizle görüşün.</p><button className="secondary-button" onClick={() => void auth.signOut()}>Çıkış yap</button></div></AuthLayout>
  return children
}

function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="auth-page">
    <section className="auth-brand-panel">
      <div className="auth-brand"><span><Droplets size={28} fill="currentColor" /></span><div><strong>Tesisat PRO</strong><small>saha operasyonları</small></div></div>
      <div className="auth-brand-copy"><span>TEK MERKEZDEN YÖNETİM</span><h1>Keşiften uygulamaya, bütün işleriniz yanınızda.</h1><p>Ofiste Windows bilgisayarınızdan, sahada Android telefonunuzdan aynı güncel verilere güvenli biçimde ulaşın.</p></div>
      <div className="auth-cloud-note"><Wifi size={18} /><span><strong>İnternet üzerinden anlık eşitleme</strong><small>Keşifler, projeler, randevular ve görseller tüm yetkili kullanıcılarda güncel kalır.</small></span></div>
    </section>
    <section className="auth-form-panel">{children}</section>
  </main>
}

function LoginForm() {
  const { signIn, sendPasswordReset } = useAuth()
  const [resetMode, setResetMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    try {
      if (resetMode) {
        await sendPasswordReset(email)
        setMessage('Şifre yenileme bağlantısı e-posta adresinize gönderildi.')
      } else await signIn(email, password)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return <AuthLayout><form className="auth-form" onSubmit={submit}>
    <span className="eyebrow">{resetMode ? 'ŞİFRE YENİLEME' : 'GÜVENLİ GİRİŞ'}</span>
    <h2>{resetMode ? 'Şifrenizi sıfırlayın' : 'Hesabınıza giriş yapın'}</h2>
    <p>{resetMode ? 'Kayıtlı e-posta adresinizi yazın; size güvenli yenileme bağlantısı gönderelim.' : 'Yöneticinizin oluşturduğu e-posta ve şifrenizle devam edin.'}</p>
    <label><span>E-posta adresi</span><div><Mail size={18} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ornek@sirket.com" required /></div></label>
    {!resetMode && <label><span>Şifre</span><div><KeyRound size={18} /><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" minLength={8} required /></div></label>}
    {error && <div className="auth-message error">{error}</div>}
    {message && <div className="auth-message success"><CheckCircle2 size={16} /> {message}</div>}
    <button className="auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : resetMode ? <Mail size={18} /> : <LogIn size={18} />}{busy ? 'İşleniyor…' : resetMode ? 'Bağlantı gönder' : 'Giriş yap'}</button>
    <button type="button" className="auth-link" onClick={() => { setResetMode((value) => !value); setError(''); setMessage('') }}>{resetMode ? <><ArrowLeft size={15} /> Giriş ekranına dön</> : 'Şifremi unuttum'}</button>
  </form></AuthLayout>
}

function NewPasswordForm() {
  const { updateOwnPassword, finishPasswordRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password !== confirmation) return setError('Şifreler birbiriyle aynı değil.')
    setBusy(true); setError('')
    try {
      await updateOwnPassword(password)
      finishPasswordRecovery()
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setBusy(false)
    }
  }
  return <AuthLayout><form className="auth-form" onSubmit={submit}><span className="eyebrow">YENİ ŞİFRE</span><h2>Yeni şifrenizi belirleyin</h2><p>En az 8 karakterden oluşan güçlü bir şifre kullanın.</p><label><span>Yeni şifre</span><div><KeyRound size={18} /><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></div></label><label><span>Yeni şifre tekrar</span><div><KeyRound size={18} /><input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} required /></div></label>{error && <div className="auth-message error">{error}</div>}<button className="auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <LockKeyhole size={18} />}Şifreyi kaydet</button></form></AuthLayout>
}

function CloudSetupRequired() {
  return <AuthLayout><div className="auth-form setup-required"><span className="eyebrow">İLK KURULUM</span><h2>Bulut bağlantısı bekleniyor</h2><p>Uygulama güvenli giriş ve internet üzerinden ortak veri kullanmak üzere hazır. Supabase proje bilgilerinizi <code>.env</code> dosyasına ekleyin.</p><ol><li><code>.env.example</code> dosyasını <code>.env</code> adıyla kopyalayın.</li><li>Supabase URL ve anon anahtarını yazın.</li><li>Veritabanı kurulum dosyasını Supabase SQL Editor’da çalıştırın.</li><li>Uygulamayı yeniden başlatın.</li></ol></div></AuthLayout>
}
