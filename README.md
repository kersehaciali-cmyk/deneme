# Tesisat Pro

Doğalgaz, sıhhi tesisat ve ısı pompası firmaları için mobil uyumlu saha operasyonu MVP'si.

## Neler çalışıyor?

- Admin, usta, proje takipçisi ve müşteri rolleri
- Müşteri oluşturma ve arama
- Dört adımlı hızlı keşif akışı
- Hazır oda şablonları ve yeni oda ekleme
- Oda bazında radyatör marka/ölçü seçimi
- Kombi marka ve kapasite seçimi
- Ürün kataloğundan otomatik maliyet, satış, KDV ve kâr hesabı
- Usta randevuları ve malzeme hazırlık listeleri
- Doğalgaz, sıhhi tesisat ve ısı pompası proje aşamaları
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
