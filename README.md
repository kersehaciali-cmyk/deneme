# Tesisat PRO

Doğalgaz, ısı pompası, sıhhi tesisat ve klima firmaları için internet bağlantılı saha ve ofis uygulaması.

## Uygulama sürümleri

- Web: Tarayıcıdan ve kurulabilir PWA olarak çalışır.
- Android: Capacitor tabanlı yerel Android projesi ve APK üretimi hazırdır.
- Windows: Electron tabanlı masaüstü kurulum paketi üretimi hazırdır.

## Merkezi sistem

Uygulama Supabase üzerinde çalışır:

- Her kullanıcıya ayrı e-posta ve şifre
- Yönetici, usta, proje takipçisi ve müşteri yetkileri
- E-postayla şifre yenileme
- Yönetici tarafından kullanıcı daveti, rol/aktiflik ve şifre yönetimi
- PostgreSQL üzerinde ortak müşteri, keşif, proje, iş, ödeme ve katalog kayıtları
- Telefon ve bilgisayarlar arasında anlık veri eşitleme
- Özel dosya alanında fotoğraf ve video saklama
- Şirket ve rol bazlı veritabanı güvenlik kuralları

Şifreler uygulama kayıtlarında tutulmaz. Kimlik doğrulama servisi tarafından güvenli biçimde yönetilir. Supabase `service_role` anahtarı hiçbir zaman masaüstü, web veya mobil uygulamanın `.env` dosyasına yazılmamalıdır.

## Hızlı geliştirme

Node.js 22 veya üzeri gereklidir.

```bash
npm install
npm run dev
```

Bulut bağlantısı için `.env.example` dosyasını `.env` olarak kopyalayıp Supabase bilgilerini girin.

## Paket komutları

```bash
# Kontrol
npm test
npm run build

# Windows masaüstü uygulamasını çalıştır
npm run desktop:run

# Windows kurulum dosyası üret
npm run desktop:build

# Android web dosyalarını yerel projeye aktar
npm run mobile:sync

# Deneme APK'sını tek komutla üret
npm run mobile:apk

# Android Studio'da aç
npm run mobile:open
```

Ayrıntılı ilk kurulum, Supabase ve APK/Windows paketleme adımları için [Windows Kurulum Rehberi](docs/KURULUM-WINDOWS.md) dosyasını izleyin.
