# Maksat 114 bio sayfası — Yönetim + istatistik paneli (tasarım)

## Amaç
Kullanıcı tek panelden (1) bio sayfasının içeriğini kod bilmeden düzenlesin, (2) kaç kişinin girdiğini ve neye tıkladığını görsün. Panele şifreyle girilir; ekipten birine şifre verilebilir.

## Hedefler
- İçerik düzenleme: alt başlık ("Gençlik Merkezi · Bursa"), 6+ hesap butonu (ad, alt yazı, link, sıra; ekle/çıkar), adres metni + harita koordinatı, metro etiketi metni ("3 dk yürüme"), "Takip edin" kartları (ad, kullanıcı adı, link, fotoğraf; ekle/çıkar), alt bilgi.
- İstatistik: günlük/haftalık/aylık ziyaret, tekil ziyaretçi (yaklaşık), her butonun tıklanma sayısı, cihaz (telefon/bilgisayar), şehir/ülke, nereden geldiği (Instagram uygulaması vs. diğer).
- Kaydet → ~1 dk içinde canlı sayfada.

## Hedef dışı
- Çoklu kullanıcı/rol, değişiklik geçmişi arayüzü (geçmiş GitHub commit'lerinde zaten var), YouTube son video yönetimi (kendiliğinden güncel), harita rotasının panelden çizilmesi.

## Anti-hedefler
- Ziyaretçi takibi kişisel veri toplamamalı: IP saklanmaz, çerez konmaz (tekil sayım günlük tuzlu hash ile).
- Panel çökerse/istatistik servisi yanıt vermezse bio sayfası bozulmamalı.
- Ücretli servis yok.

## Yaklaşımlar
1. **Kendi panelimiz — Cloudflare Worker + D1 (SEÇİLDİ):** tek adres, şifreli giriş, istatistik ve düzenleme aynı ekranda; kullanıcı ücretsiz Cloudflare hesabı açar.
2. Hazır araçlar (Sveltia/Decap CMS + GoatCounter): daha kısa kurulum, ama iki ayrı yer ve GitHub girişi — "tek panel" isteğine uymadığı için seçilmedi.

## Mimari (Claude'un kararları)
- **Bio sayfası** (GitHub Pages, değişmiyor): içerik `veri.json`'dan okunur ve sayfaya basılır. veri.json gelmezse HTML içindeki son sürüm görünür (sayfa hiç boş kalmaz).
- **Sayaç:** sayfa açılınca ve her tıklamada `navigator.sendBeacon` ile Worker'a `/o` (olay adı, yol, referrer). Worker Cloudflare başlıklarından ülke/şehir, User-Agent'tan cihaz türü çıkarır; D1 tablosuna yazar. Instagram uygulama içi tarayıcı UA'dan tanınır.
- **Panel:** Worker `/panel` adresinde tek sayfa (Türkçe, marka renkleri, telefonda rahat). Giriş: tek şifre (Worker secret), HttpOnly imzalı oturum çerezi, 30 gün; 10 yanlış/15 dk kilidi.
- **Kaydetme:** Worker, sadece bu repoya yazma yetkili GitHub fine-grained token (Worker secret) ile `veri.json`'u commit'ler → Pages yayınlar. Fotoğraf yükleme: panelden seçilen görsel küçültülüp `img/` altına commit'lenir.
- **Adres:** `https://<worker-adi>.<hesap>.workers.dev` (ücretsiz). Panel linki gizli tutulur, bio sayfasında görünmez.

## Kullanıcıdan gerekenler
- Ücretsiz Cloudflare hesabı + bir kez `wrangler login` onayı (tarayıcıda "Allow").
- Panel şifresi seçimi (Claude güçlü bir şifre üretip kullanıcıya verebilir; hafızaya yazılmaz).
- GitHub fine-grained token oluşturma (yalnız maksat114bursa.github.io reposu, Contents: Read/Write) — Claude adımları gösterir ya da gh ile mümkünse kendisi oluşturur.

## Builder'a kalan
Panel ekran düzeni ayrıntıları, grafik kütüphanesi seçimi (hafif), D1 şema ayrıntısı, tekil ziyaretçi hash'i.
