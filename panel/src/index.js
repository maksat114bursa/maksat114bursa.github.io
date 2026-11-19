import PANEL from './panel.html';
import { veriDogrula } from './dogrula.js';
import { cihaz, kaynak, olayTemizle, imzala, imzaDogrula, ozet } from './yardim.js';

const GUN = 86400000;
const trGun = (t = Date.now()) => new Date(t + 3 * 3600000).toISOString().slice(0, 10); // Türkiye saati (UTC+3)

const json = (veri, durum = 200, ek = {}) =>
  new Response(JSON.stringify(veri), { status: durum, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...ek } });

function corsBasliklari(istek, env) {
  const kaynakAdres = istek.headers.get('origin') || '';
  const izinli = kaynakAdres === env.SITE || /^http:\/\/localhost(:\d+)?$/.test(kaynakAdres);
  return izinli ? { 'access-control-allow-origin': kaynakAdres, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type' } : {};
}

// --- Sayaç ---
async function olayKaydet(istek, env, ctx) {
  const cors = corsBasliklari(istek, env);
  let govde = {};
  try { govde = JSON.parse((await istek.text()).slice(0, 1000)); } catch {}
  const olay = olayTemizle(govde.o);
  if (!olay) return new Response(null, { status: 204, headers: cors });
  const ua = istek.headers.get('user-agent') || '';
  if (/bot|crawl|spider|preview|facebookexternalhit|headless/i.test(ua) && !/Instagram|FBAN|FBAV/i.test(ua))
    return new Response(null, { status: 204, headers: cors });
  const ip = istek.headers.get('cf-connecting-ip') || '';
  const gun = trGun();
  // Günlük tekil ziyaretçi: IP saklanmaz, yalnızca gün + gizli tuzla tek yönlü özet
  const ziyaretci = await ozet(`${ip}|${ua}|${gun}|${env.OTURUM_ANAHTAR}`);
  const cf = istek.cf || {};
  ctx.waitUntil(env.DB.prepare(
    'INSERT INTO olaylar (zaman, gun, olay, ziyaretci, cihaz, kaynak, ulke, sehir) VALUES (?,?,?,?,?,?,?,?)'
  ).bind(Date.now(), gun, olay, ziyaretci, cihaz(ua), kaynak(ua, String(govde.r || '')), cf.country || null, cf.city || null).run());
  return new Response(null, { status: 204, headers: cors });
}

// --- Oturum ---
function cerezAl(istek, ad) {
  const m = (istek.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + ad + '=([^;]+)'));
  return m ? m[1] : null;
}
async function oturumVar(istek, env) {
  return !!(await imzaDogrula(cerezAl(istek, 'oturum'), env.OTURUM_ANAHTAR));
}
async function esit(a, b) {
  const [x, y] = await Promise.all([ozet('s|' + a), ozet('s|' + b)]);
  let f = 0; for (let i = 0; i < x.length; i++) f |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return f === 0;
}
async function giris(istek, env) {
  const kim = await ozet('giris|' + (istek.headers.get('cf-connecting-ip') || '') + '|' + env.OTURUM_ANAHTAR);
  const simdi = Date.now();
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM girisler WHERE kim = ? AND zaman > ? AND basarili = 0').bind(kim, simdi - 15 * 60000).first();
  if (n >= 10) return json({ hata: 'Çok fazla yanlış deneme. 15 dakika sonra tekrar deneyin.' }, 429);
  let sifre = '';
  try { sifre = String((await istek.json()).sifre || ''); } catch {}
  const ok = sifre.length > 0 && await esit(sifre, env.PANEL_SIFRE);
  await env.DB.prepare('INSERT INTO girisler (kim, zaman, basarili) VALUES (?,?,?)').bind(kim, simdi, ok ? 1 : 0).run();
  if (!ok) return json({ hata: 'Şifre yanlış.' }, 401);
  const token = await imzala({ son: simdi + 30 * GUN }, env.OTURUM_ANAHTAR);
  return json({ tamam: true }, 200, { 'set-cookie': `oturum=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 86400}` });
}

// --- İstatistik ---
async function istatistik(url, env) {
  const gunSayisi = Math.min(Math.max(parseInt(url.searchParams.get('gun') || '7', 10) || 7, 1), 365);
  const bas = trGun(Date.now() - (gunSayisi - 1) * GUN);
  const q = (sql, ...p) => env.DB.prepare(sql).bind(bas, ...p).all().then((r) => r.results);
  const [toplam, gunluk, olaylar, cihazlar, kaynaklar, sehirler, ulkeler] = await Promise.all([
    env.DB.prepare(`SELECT SUM(olay='ziyaret') AS ziyaret, COUNT(DISTINCT CASE WHEN olay='ziyaret' THEN ziyaretci END) AS tekil, SUM(olay!='ziyaret') AS tiklama FROM olaylar WHERE gun >= ?`).bind(bas).first(),
    q(`SELECT gun, SUM(olay='ziyaret') AS ziyaret, COUNT(DISTINCT CASE WHEN olay='ziyaret' THEN ziyaretci END) AS tekil, SUM(olay!='ziyaret') AS tiklama FROM olaylar WHERE gun >= ? GROUP BY gun ORDER BY gun`),
    q(`SELECT olay, COUNT(*) AS n, COUNT(DISTINCT ziyaretci) AS kisi FROM olaylar WHERE gun >= ? AND olay != 'ziyaret' GROUP BY olay ORDER BY n DESC`),
    q(`SELECT cihaz AS ad, COUNT(*) AS n FROM olaylar WHERE gun >= ? AND olay='ziyaret' GROUP BY cihaz ORDER BY n DESC`),
    q(`SELECT kaynak AS ad, COUNT(*) AS n FROM olaylar WHERE gun >= ? AND olay='ziyaret' GROUP BY kaynak ORDER BY n DESC LIMIT 8`),
    q(`SELECT sehir AS ad, COUNT(*) AS n FROM olaylar WHERE gun >= ? AND olay='ziyaret' AND sehir IS NOT NULL GROUP BY sehir ORDER BY n DESC LIMIT 10`),
    q(`SELECT ulke AS ad, COUNT(*) AS n FROM olaylar WHERE gun >= ? AND olay='ziyaret' AND ulke IS NOT NULL GROUP BY ulke ORDER BY n DESC LIMIT 8`)
  ]);
  return json({ gunSayisi, bas, bugun: trGun(), toplam, gunluk, olaylar, cihazlar, kaynaklar, sehirler, ulkeler });
}

// --- GitHub ---
async function gh(env, yol, ayar = {}) {
  return fetch(`https://api.github.com/repos/${env.REPO}/contents/${yol}`, {
    ...ayar,
    headers: { authorization: `Bearer ${env.GH_TOKEN}`, accept: 'application/vnd.github+json', 'user-agent': 'maksat114-panel', 'x-github-api-version': '2022-11-28', ...(ayar.headers || {}) }
  });
}
const b64Yaz = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const b64Oku = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), (c) => c.charCodeAt(0)));

async function veriOku(env) {
  const r = await gh(env, `veri.json?ref=${env.DAL}`);
  if (!r.ok) return json({ hata: 'Sayfa verisi okunamadı (GitHub ' + r.status + ').' }, 502);
  const d = await r.json();
  return json({ veri: JSON.parse(b64Oku(d.content)), sha: d.sha });
}
async function veriYaz(istek, env) {
  let g; try { g = await istek.json(); } catch { return json({ hata: 'Geçersiz istek.' }, 400); }
  const hatalar = veriDogrula(g.veri);
  if (hatalar.length) return json({ hata: 'Kaydedilmedi, düzeltilmesi gerekenler var.', hatalar }, 422);
  const r = await gh(env, 'veri.json', {
    method: 'PUT',
    body: JSON.stringify({ message: 'Panelden güncelleme', content: b64Yaz(JSON.stringify(g.veri, null, 2) + '\n'), sha: g.sha, branch: env.DAL })
  });
  if (r.status === 409 || r.status === 422) return json({ hata: 'Sayfa bu arada başka yerden değişmiş. Paneli yenileyip tekrar deneyin.' }, 409);
  if (!r.ok) return json({ hata: 'Kaydedilemedi (GitHub ' + r.status + ').' }, 502);
  const d = await r.json();
  return json({ tamam: true, sha: d.content.sha });
}
async function fotoYukle(istek, env) {
  let g; try { g = await istek.json(); } catch { return json({ hata: 'Geçersiz istek.' }, 400); }
  const veri = String(g.jpeg || '');
  if (!/^[A-Za-z0-9+/=]+$/.test(veri) || veri.length > 400000) return json({ hata: 'Fotoğraf çok büyük ya da bozuk.' }, 400);
  const ad = `img/takip-${String(g.ad || 'foto').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-${Date.now().toString(36)}.jpg`;
  const r = await gh(env, ad, { method: 'PUT', body: JSON.stringify({ message: 'Panelden fotoğraf', content: veri, branch: env.DAL }) });
  if (!r.ok) return json({ hata: 'Fotoğraf yüklenemedi (GitHub ' + r.status + ').' }, 502);
  return json({ yol: ad });
}

export default {
  async fetch(istek, env, ctx) {
    const url = new URL(istek.url);
    const yol = url.pathname;
    if (yol === '/o') {
      if (istek.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsBasliklari(istek, env) });
      if (istek.method === 'POST') return olayKaydet(istek, env, ctx);
    }
    if (yol === '/' ) return Response.redirect(url.origin + '/panel', 302);
    if (yol === '/panel') return new Response(PANEL, {
      headers: {
        'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer',
        'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://maksat114bursa.github.io https://raw.githubusercontent.com; connect-src 'self'; frame-ancestors 'none'"
      }
    });
    if (yol.startsWith('/api/')) {
      if (istek.method !== 'GET' && istek.headers.get('x-panel') !== '1') return json({ hata: 'Geçersiz istek.' }, 403);
      if (yol === '/api/giris' && istek.method === 'POST') return giris(istek, env);
      if (!(await oturumVar(istek, env))) return json({ hata: 'Giriş gerekli.' }, 401);
      if (yol === '/api/cikis' && istek.method === 'POST') return json({ tamam: true }, 200, { 'set-cookie': 'oturum=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' });
      if (yol === '/api/istatistik' && istek.method === 'GET') return istatistik(url, env);
      if (yol === '/api/veri' && istek.method === 'GET') return veriOku(env);
      if (yol === '/api/veri' && istek.method === 'PUT') return veriYaz(istek, env);
      if (yol === '/api/foto' && istek.method === 'POST') return fotoYukle(istek, env);
    }
    return new Response('Bulunamadı', { status: 404 });
  }
};
