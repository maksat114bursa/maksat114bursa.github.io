// veri.json doğrulama — hem panel (kaydetmeden önce) hem Worker (yazmadan önce) kullanır.
export const TURLER = ['instagram', 'youtube', 'whatsapp', 'tiktok', 'telegram', 'facebook', 'x', 'web'];

const metin = (x, en = 120) => typeof x === 'string' && x.trim().length > 0 && x.length <= en;
const https = (x) => typeof x === 'string' && /^https:\/\/[^\s"'<>]+$/.test(x) && x.length <= 500;
const foto = (x) => typeof x === 'string' && (/^img\/[\w.-]+\.(jpe?g|png|webp)$/i.test(x) || https(x));

export function veriDogrula(v) {
  const h = [];
  if (!v || typeof v !== 'object') return ['veri boş'];
  if (!metin(v.altBaslik, 80)) h.push('alt başlık boş ya da çok uzun');
  const d = v.dugmeler;
  if (d !== undefined) {
    if (!d || typeof d !== 'object') h.push('üst düğmeler bozuk');
    else {
      if (d.mesajLink && !https(d.mesajLink)) h.push('mesaj at linki https:// ile başlamalı');
      if (d.webLink && !https(d.webLink)) h.push('web sitesi linki https:// ile başlamalı');
      if (typeof (d.mesajYazi ?? '') !== 'string' || (d.mesajYazi ?? '').length > 30) h.push('mesaj at yazısı çok uzun');
      if (typeof (d.webYazi ?? '') !== 'string' || (d.webYazi ?? '').length > 30) h.push('web sitesi yazısı çok uzun');
    }
  }
  if (!Array.isArray(v.hesaplar) || v.hesaplar.length === 0) h.push('en az bir hesap gerekli');
  else if (v.hesaplar.length > 16) h.push('en fazla 16 hesap');
  else v.hesaplar.forEach((x, i) => {
    const n = `${i + 1}. hesap`;
    if (!TURLER.includes(x?.tur)) h.push(`${n}: tür geçersiz`);
    if (!metin(x?.ad, 40)) h.push(`${n}: ad boş`);
    if (typeof x?.alt !== 'string' || x.alt.length > 60) h.push(`${n}: alt yazı çok uzun`);
    if (!https(x?.link)) h.push(`${n}: link https:// ile başlamalı`);
  });
  const k = v.konum;
  if (!k || typeof k !== 'object') h.push('konum eksik');
  else {
    if (!metin(k.adres1, 100)) h.push('konum: adres boş');
    if (typeof k.adres2 !== 'string' || k.adres2.length > 100) h.push('konum: adres 2. satır çok uzun');
    if (!metin(k.etiket, 50)) h.push('konum: harita etiketi boş');
    if (!metin(k.metroYazi, 50)) h.push('konum: metro yazısı boş');
    if (!metin(k.metroSure, 30)) h.push('konum: yürüme süresi boş');
    if (k.tarifLink && !https(k.tarifLink)) h.push('konum: yol tarifi linki https:// ile başlamalı');
    if (!(k.enlem > 39.5 && k.enlem < 41 && k.boylam > 28 && k.boylam < 30)) h.push('konum: koordinat Bursa dışında');
  }
  if (!Array.isArray(v.takip) || v.takip.length > 8) h.push('takip kartları en fazla 8');
  else v.takip.forEach((x, i) => {
    const n = `${i + 1}. takip kartı`;
    if (!metin(x?.ad, 50)) h.push(`${n}: ad boş`);
    if (typeof x?.kullanici !== 'string' || x.kullanici.length > 40) h.push(`${n}: kullanıcı adı çok uzun`);
    if (!https(x?.link)) h.push(`${n}: link https:// ile başlamalı`);
    if (!foto(x?.foto)) h.push(`${n}: foto yolu geçersiz`);
  });
  if (!metin(v.altBilgi, 100)) h.push('alt bilgi boş');
  return h;
}
