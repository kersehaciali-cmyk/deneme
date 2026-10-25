# Tesisat PRO — Windows, bulut ve Android kurulum rehberi

Bu işlemler bir kez yapılır. Sonrasında aynı Supabase projesine bağlanan Windows ve Android uygulamaları ortak veriyi kullanır.

## 1. Gerekli programlar

PowerShell'i normal kullanıcı olarak açın ve sürümleri kontrol edin:

```powershell
node --version
npm.cmd --version
git --version
```

Node.js sürümü 22 veya üzeri olmalıdır. Android APK için ayrıca Android Studio kurun:

```powershell
winget install --id Google.AndroidStudio -e --source winget
```

Android Studio ilk açılışında Android SDK Platform 36, SDK Build-Tools ve SDK Platform-Tools bileşenlerini kurun.

## 2. Supabase projesini oluşturun

1. `https://supabase.com` adresinden hesap açın.
2. Yeni bir proje oluşturun ve proje bölgesi olarak size yakın bir Avrupa bölgesi seçin.
3. Supabase panelinde **SQL Editor** bölümünü açın.
4. Repodaki `supabase/migrations/202610240001_tesisat_pro.sql` dosyasının tamamını yapıştırıp çalıştırın.
5. SQL başarıyla tamamlandıktan sonra **Authentication → Users → Add user** üzerinden ilk yönetici hesabını oluşturun. İlk oluşturulan hesap otomatik olarak yönetici olur.
6. **Authentication → Providers → Email** bölümünde herkese açık yeni hesap oluşturmayı kapalı tutun. Yeni kullanıcıları Tesisat PRO içindeki yönetici oluşturacaktır.

Canlı kullanımda Supabase **Authentication → SMTP Settings** bölümüne şirketinizin SMTP bilgilerini girin. Böylece davet ve şifre yenileme e-postaları şirket adresinizden gönderilir.

## 3. Uygulama bağlantısını ayarlayın

Supabase panelinde **Project Settings → API** bölümünden Project URL ve public `anon` anahtarını alın. PowerShell'de:

```powershell
Copy-Item .env.example .env
notepad .env
```

Dosyayı şu şekilde doldurun:

```text
VITE_SUPABASE_URL=https://PROJE_KODUNUZ.supabase.co
VITE_SUPABASE_ANON_KEY=PUBLIC_ANON_KEY
VITE_PUBLIC_APP_URL=https://uygulama.sirketiniz.com
```

`VITE_PUBLIC_APP_URL`, şifre yenileme e-postasının açacağı HTTPS web adresidir. İlk yerel denemede `http://localhost:4173` kullanılabilir; telefonlardan şifre yenilemek için canlı HTTPS adresi gerekir.

Supabase **Authentication → URL Configuration** bölümünde aynı adresi Site URL yapın ve izin verilen Redirect URL listesine ekleyin.

## 4. Yönetici kullanıcı servisini yayınlayın

PowerShell'de proje klasöründeyken aşağıdaki komutları çalıştırın. `PROJE_KODUNUZ` bölümüne Supabase URL'nizdeki proje kodunu yazın.

```powershell
npx.cmd supabase@latest login
npx.cmd supabase@latest link --project-ref PROJE_KODUNUZ
npx.cmd supabase@latest db push
npx.cmd supabase@latest secrets set PUBLIC_APP_URL=https://uygulama.sirketiniz.com
npx.cmd supabase@latest functions deploy admin-users
```

`db push` komutu rol güvenliği dahil repodaki tüm yeni veritabanı güncellemelerini uygular. Yönetici kullanıcı servisi yalnızca yönetici oturumuyla çağrılabilir. Gizli `service_role` anahtarı Supabase'in sunucusunda kalır.

## 5. Tarayıcıda test edin

```powershell
npm.cmd install
npm.cmd run dev
```

Tarayıcıda `http://localhost:4173` adresini açın ve ilk yönetici hesabıyla giriş yapın. İlk yönetici girişinde örnek ürünler, fiyatlar ve örnek kayıtlar merkezi veritabanına eklenir.

## 6. Windows masaüstü kurulum dosyası

```powershell
npm.cmd run desktop:build
```

Kurulum dosyası şu klasörde oluşur:

```text
release\Tesisat-PRO-Setup-0.1.0.exe
```

Bu dosyayı diğer Windows bilgisayarlara kurabilirsiniz. Ticari dağıtımda Windows SmartScreen uyarısını kaldırmak için şirket adına bir kod imzalama sertifikasıyla kurulum dosyasını imzalamanız önerilir.

Hızlı masaüstü testi için:

```powershell
npm.cmd run desktop:run
```

## 7. Android APK oluşturun

Önce web arayüzünü Android projesine aktarın:

```powershell
npm.cmd run mobile:apk
```

Komut tamamlanınca kurulabilir deneme APK'sı `release\Tesisat-PRO-debug.apk` yolunda oluşur.

Android Studio üzerinden çalıştırmak veya imzalı sürüm almak için:

```powershell
npm.cmd run mobile:open
```

Android Studio açıldığında Gradle eşitlemesinin bitmesini bekleyin. Deneme APK'sı için:

1. **Build → Build App Bundles or APKs → Build APKs** seçin.
2. Oluşan APK'yı `android\app\build\outputs\apk\debug\app-debug.apk` yolundan alın.
3. Telefonda bilinmeyen uygulama yükleme izni vererek APK'yı kurun.

İmzalı canlı APK/AAB için Android Studio'da **Build → Generate Signed App Bundle or APK** seçeneğini kullanın. Oluşturduğunuz `.jks` imza dosyasını güvenli yerde yedekleyin; kaybedilirse aynı uygulamanın güncellemesi yayınlanamaz.

## 8. Yeni kullanıcı akışı

1. Yönetici Tesisat PRO içindeki **Kullanıcılar → Yeni kullanıcı** ekranından hesabı oluşturur.
2. E-posta girilmişse kullanıcıya davet bağlantısı gelir ve kullanıcı ilk şifresini belirler.
3. E-posta girilmemişse yönetici ilk şifreyi belirler; kullanıcı telefon numarası ve bu şifreyle giriş yapar.
4. E-postalı kullanıcı **Şifremi unuttum** bağlantısından şifresini yenileyebilir.
5. Telefonla giriş yapan kullanıcının şifresini yönetici kullanıcı düzenleme ekranından değiştirir.
6. Yönetici gerektiğinde hesabı pasif yapabilir.

## 9. Güncelleme

Yeni sürümü aldıktan sonra:

```powershell
git pull
npm.cmd install
npx.cmd supabase@latest link --project-ref PROJE_KODUNUZ
npx.cmd supabase@latest db push
npm.cmd run build
npm.cmd run mobile:sync
```

Windows kurulum dosyasını yeniden üretmek için `npm.cmd run desktop:build` çalıştırın. Android güncellemesi için `versionCode` değerini artırıp yeniden imzalı APK/AAB üretin.
