import { readFileSync, existsSync } from 'node:fs';
const kok = new URL('../', import.meta.url);
let hata = 0;
const yanlis = (m) => { console.error('HATA:', m); hata++; };
const h = readFileSync(new URL('index.html', kok), 'utf8');
// Gömülü yedek içerik
for (const g of ['https://www.instagram.com/maksat114bursa','https://www.youtube.com/@maksat114bursa','https://www.tiktok.com/@maksat114bursa','https://whatsapp.com/channel/0029Va69sM6HwXbLIa6p8H2W','https://t.me/maksat114bursa','https://www.facebook.com/maksat114bursa','https://www.instagram.com/harunserkanaktas','list=UULFgC81lrIwMJJvAjyKm1ooow','Altınşehir Mahallesi, 204. Sk. No:1'])
  if (!h.includes(g)) yanlis('index.html eksik: ' + g);
for (const m of h.matchAll(/<a\s[^>]*href="(https?:[^"]+)"[^>]*>/g))
  if (!/target="_blank"/.test(m[0]) || !/rel="noopener"/.test(m[0])) yanlis('target/rel eksik: ' + m[1]);
for (const m of h.matchAll(/<iframe\s[^>]*>/g)) if (!/loading="lazy"/.test(m[0])) yanlis('lazy eksik iframe');
for (const id of ['v-alt','v-hesaplar','v-adres','v-etiket','v-metro','v-sure','v-tarif','v-takip','v-altbilgi'])
  if (!h.includes(`id="${id}"`)) yanlis('id eksik: ' + id);
// veri.json şeması
const v = JSON.parse(readFileSync(new URL('veri.json', kok), 'utf8'));
const { veriDogrula } = await import(new URL('panel/src/dogrula.js', kok));
for (const e of veriDogrula(v)) yanlis('veri.json: ' + e);
for (const t of v.takip || []) if (t.foto?.startsWith('img/') && !existsSync(new URL(t.foto, kok))) yanlis('foto yok: ' + t.foto);
if (hata) { console.error(`FAIL (${hata})`); process.exit(1); }
console.log('PASS');
