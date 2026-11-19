import { readFileSync, existsSync } from 'node:fs';
const yol = new URL('../index.html', import.meta.url);
if (!existsSync(yol)) { console.error('FAIL: index.html yok'); process.exit(1); }
const h = readFileSync(yol, 'utf8');
const gerekli = [
  'https://www.instagram.com/maksat114bursa',
  'https://www.youtube.com/@maksat114bursa',
  'https://www.tiktok.com/@maksat114bursa',
  'https://whatsapp.com/channel/0029Va69sM6HwXbLIa6p8H2W',
  'https://t.me/maksat114bursa',
  'https://www.facebook.com/maksat114bursa',
  'https://www.instagram.com/harunserkanaktas',
  'list=UUgC81lrIwMJJvAjyKm1ooow',
  'Altınşehir Mahallesi, 204. Sk. No:1',
];
let hata = 0;
for (const g of gerekli) if (!h.includes(g)) { console.error('EKSİK:', g); hata++; }
for (const m of h.matchAll(/<a\s[^>]*href="(https?:[^"]+)"[^>]*>/g)) {
  if (!/target="_blank"/.test(m[0]) || !/rel="noopener"/.test(m[0])) { console.error('target/rel eksik:', m[1]); hata++; }
}
for (const m of h.matchAll(/<iframe\s[^>]*>/g)) if (!/loading="lazy"/.test(m[0])) { console.error('lazy eksik iframe'); hata++; }
if (hata) { console.error(`FAIL (${hata})`); process.exit(1); }
console.log('PASS');
