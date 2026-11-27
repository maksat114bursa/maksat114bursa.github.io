export function cihaz(ua = '') {
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
  if (/iPhone|iPod|Android|Mobile/i.test(ua)) return 'telefon';
  return 'bilgisayar';
}

export function kaynak(ua = '', ref = '') {
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook';
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return 'TikTok';
  if (/WhatsApp/i.test(ua)) return 'WhatsApp';
  let host = '';
  try { host = new URL(ref).hostname.replace(/^www\./, ''); } catch { return 'Doğrudan'; }
  if (/instagram\.com$/.test(host)) return 'Instagram';
  if (/facebook\.com$|fb\.me$/.test(host)) return 'Facebook';
  if (/google\./.test(host)) return 'Google';
  if (/youtube\.com$|youtu\.be$/.test(host)) return 'YouTube';
  if (/t\.co$|twitter\.com$|x\.com$/.test(host)) return 'X';
  if (/whatsapp\.com$/.test(host)) return 'WhatsApp';
  if (/tiktok\.com$/.test(host)) return 'TikTok';
  return host.slice(0, 60) || 'Doğrudan';
}

export function olayTemizle(o) {
  return typeof o === 'string' && /^[a-z0-9:._-]{1,60}$/.test(o) ? o : null;
}

const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64coz = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const anahtarAl = (a) => crypto.subtle.importKey('raw', enc.encode(a), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

export async function imzala(veri, anahtar) {
  const govde = b64(enc.encode(JSON.stringify(veri)));
  const imza = await crypto.subtle.sign('HMAC', await anahtarAl(anahtar), enc.encode(govde));
  return govde + '.' + b64(imza);
}

export async function imzaDogrula(token, anahtar) {
  try {
    const [govde, imza] = String(token).split('.');
    if (!govde || !imza) return null;
    const ok = await crypto.subtle.verify('HMAC', await anahtarAl(anahtar), b64coz(imza), enc.encode(govde));
    if (!ok) return null;
    const v = JSON.parse(new TextDecoder().decode(b64coz(govde)));
    return v.son > Date.now() ? v : null;
  } catch { return null; }
}

export async function ozet(metin) {
  return b64(await crypto.subtle.digest('SHA-256', enc.encode(metin))).slice(0, 22);
}

// Bir kişi = bir ziyaretçi: tarayıcının rastgele, anonim kimliği (gizli anahtarla özetlenir, kendisi saklanmaz).
// Kimlik yoksa (gizli sekme vb.) IP + cihaz bilgisinden, gün bilgisi olmadan özet çıkarılır. IP hiçbir zaman saklanmaz.
export async function ziyaretciKimligi(z, ip, ua, anahtar) {
  if (typeof z === 'string' && /^[a-z0-9]{16,40}$/i.test(z)) return ozet(`z|${z}|${anahtar}`);
  return ozet(`ip|${ip}|${ua}|${anahtar}`);
}

// Netlify vekilinden gelen isteklerde gerçek ziyaretçi bilgisi başlıklarda taşınır.
// Başlıklara yalnızca gizli vekil anahtarı doğruysa güvenilir.
export function istemci(istek, vekilAnahtar) {
  const h = istek.headers, cf = istek.cf || {};
  if (vekilAnahtar && h.get('x-vekil') === vekilAnahtar) {
    return { ip: h.get('x-istemci-ip') || '', ulke: h.get('x-istemci-ulke') || null, sehir: h.get('x-istemci-sehir') || null };
  }
  return { ip: h.get('cf-connecting-ip') || '', ulke: cf.country || null, sehir: cf.city || null };
}
