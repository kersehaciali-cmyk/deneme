# Tesisat PRO

Doğalgaz, ısı pompası, sıhhi tesisat ve klima firmaları için mobil uyumlu saha operasyonu MVP'si.

## Neler çalışıyor?

- Admin, usta, proje takipçisi ve müşteri rolleri
- Yönetici kullanıcı oluşturma, düzenleme ve aktif/pasif yönetimi
- Müşteri oluşturma ve arama
- Dört adımlı hızlı keşif akışı
- Hazır oda şablonları ve yeni oda ekleme
- Oda bazında radyatör marka/ölçü seçimi
- Keşif adresi, saha iletişim kişisi ve müşteri/cari bilgilerinin ayrı tutulması
- Tarayıcı konum izniyle GPS alma, manuel enlem-boylam ve Google Maps yol tarifi
- Keşif, biten iş ve proje onayı bekleyen hızlı listeleri
- Kombi marka ve kapasite seçimi
- Düzenlenebilir keşif şablonları ve serbest iş kalemi seçimi
- Klima ve ısı pompası marka/güç seçenekleri
- Ürün kataloğundan otomatik maliyet, satış, KDV ve kâr hesabı
- Tarih bazlı alış/satış fiyat geçmişi
- Usta randevuları ve malzeme hazırlık listeleri
- Kabul edilen keşfi usta ve gün atayarak projeye dönüştürme
- Düzenlenebilir malzeme listesi ile PDF/Excel çıktısı
- Usta fotoğraf/video yükleme ve admin onay akışı
- AKSA proje, onay, abonelik, randevu ve gaz açılış aşamaları
- Tahsilat kaydı ve kalan bakiye takibi
- Ürün maliyet/satış fiyatı güncelleme
- Yönetim raporları ve mobil uyumlu arayüz

Bu sürüm verileri tarayıcının `localStorage` alanında saklar. Çok kullanıcılı canlı kullanım için API, PostgreSQL, dosya depolama ve gerçek kimlik doğrulama sonraki üretim katmanıdır.

## Geliştirme

Node.js 20 veya üzeri gereklidir.

```bash
npm install --no-audit --no-fund
npm run dev
```

Uygulama varsayılan olarak `http://localhost:4173` adresinde açılır.

## Doğrulama

```bash
npm test
npm run build
```

Rol seçici üzerinden dört kullanıcı görünümü denenebilir. Oluşturulan müşteri, keşif, ödeme ve fiyat değişiklikleri aynı tarayıcıda korunur.
