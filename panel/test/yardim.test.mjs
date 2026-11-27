import test from 'node:test';
import assert from 'node:assert/strict';
import { veriDogrula } from '../src/dogrula.js';
import { cihaz, kaynak, imzala, imzaDogrula, olayTemizle } from '../src/yardim.js';
import { readFileSync } from 'node:fs';

const ornek = JSON.parse(readFileSync(new URL('../../veri.json', import.meta.url), 'utf8'));

test('geçerli veri.json hata vermez', () => assert.deepEqual(veriDogrula(ornek), []));
test('https olmayan link reddedilir', () => {
  const v = structuredClone(ornek); v.hesaplar[0].link = 'javascript:alert(1)';
  assert.ok(veriDogrula(v).some((e) => e.includes('link')));
});
test('boş hesap adı reddedilir', () => {
  const v = structuredClone(ornek); v.hesaplar[1].ad = '  ';
  assert.ok(veriDogrula(v).length > 0);
});
test('koordinat Bursa dışında reddedilir', () => {
  const v = structuredClone(ornek); v.konum.enlem = 0;
  assert.ok(veriDogrula(v).some((e) => e.includes('konum')));
});
test('foto yolu sadece img/ veya https', () => {
  const v = structuredClone(ornek); v.takip[0].foto = '../gizli.txt';
  assert.ok(veriDogrula(v).some((e) => e.includes('foto')));
});
test('bilinmeyen tür reddedilir', () => {
  const v = structuredClone(ornek); v.hesaplar[0].tur = 'xyz';
  assert.ok(veriDogrula(v).length > 0);
});

test('cihaz türü', () => {
  assert.equal(cihaz('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Instagram 350.0'), 'telefon');
  assert.equal(cihaz('Mozilla/5.0 (Linux; Android 14; SM-S918B) Mobile Safari'), 'telefon');
  assert.equal(cihaz('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'), 'tablet');
  assert.equal(cihaz('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130'), 'bilgisayar');
});
test('kaynak', () => {
  assert.equal(kaynak('... Instagram 350.0.0 ...', ''), 'Instagram');
  assert.equal(kaynak('Chrome', 'https://l.instagram.com/?u=x'), 'Instagram');
  assert.equal(kaynak('Chrome', 'https://www.google.com/'), 'Google');
  assert.equal(kaynak('Chrome', ''), 'Doğrudan');
  assert.equal(kaynak('... [FBAN/FB4A ...', ''), 'Facebook');
  assert.equal(kaynak('Chrome', 'https://ornek.com/x'), 'ornek.com');
});
test('olay adı temizleme', () => {
  assert.equal(olayTemizle('hesap:instagram'), 'hesap:instagram');
  assert.equal(olayTemizle('takip:harunserkanaktas'), 'takip:harunserkanaktas');
  assert.equal(olayTemizle('<script>'), null);
  assert.equal(olayTemizle('x'.repeat(100)), null);
});
test('imza: doğru anahtarla geçer, değişmiş/eskimiş olan geçmez', async () => {
  const t = await imzala({ son: Date.now() + 60000 }, 'gizli');
  assert.ok(await imzaDogrula(t, 'gizli'));
  assert.equal(await imzaDogrula(t, 'baska'), null);
  assert.equal(await imzaDogrula(t.slice(0, -2) + 'aa', 'gizli'), null);
  const eski = await imzala({ son: Date.now() - 1 }, 'gizli');
  assert.equal(await imzaDogrula(eski, 'gizli'), null);
});

import { istemci } from '../src/yardim.js';
const istek = (h, cf) => ({ headers: new Headers(h), cf });
test('istemci: doğru vekil anahtarıyla Netlify başlıkları kullanılır', () => {
  const r = istemci(istek({ 'x-vekil': 'gizli', 'x-istemci-ip': '1.2.3.4', 'x-istemci-ulke': 'TR', 'x-istemci-sehir': 'Bursa', 'cf-connecting-ip': '9.9.9.9' }, { country: 'US', city: 'Ashburn' }), 'gizli');
  assert.deepEqual(r, { ip: '1.2.3.4', ulke: 'TR', sehir: 'Bursa' });
});
test('istemci: anahtar yanlışsa başlıklar yok sayılır', () => {
  const r = istemci(istek({ 'x-vekil': 'sahte', 'x-istemci-ip': '1.2.3.4', 'x-istemci-ulke': 'TR', 'cf-connecting-ip': '9.9.9.9' }, { country: 'US', city: 'Ashburn' }), 'gizli');
  assert.deepEqual(r, { ip: '9.9.9.9', ulke: 'US', sehir: 'Ashburn' });
});
test('istemci: anahtar tanımlı değilse başlıklar yok sayılır', () => {
  const r = istemci(istek({ 'x-vekil': '', 'x-istemci-ip': '1.2.3.4', 'cf-connecting-ip': '9.9.9.9' }, {}), undefined);
  assert.equal(r.ip, '9.9.9.9');
});

test('tarifLink https değilse reddedilir, boşsa sorun yok', () => {
  const v = structuredClone(ornek); v.konum.tarifLink = 'javascript:alert(1)';
  assert.ok(veriDogrula(v).some((e) => e.includes('yol tarifi')));
  v.konum.tarifLink = ''; assert.deepEqual(veriDogrula(v), []);
  v.konum.tarifLink = 'https://maps.app.goo.gl/PZEqEVYzg2M41p9m7?g_st=aw'; assert.deepEqual(veriDogrula(v), []);
});

test('üst düğmeler: link https olmalı, boş link düğmeyi gizler (hata değil)', () => {
  const v = structuredClone(ornek);
  assert.equal(v.dugmeler.mesajLink, 'https://wa.me/905533368755');
  v.dugmeler.webLink = 'http://maksat114.com';
  assert.ok(veriDogrula(v).some((e) => e.includes('web sitesi')));
  v.dugmeler.webLink = ''; assert.deepEqual(veriDogrula(v), []);
  v.dugmeler.mesajYazi = 'x'.repeat(40);
  assert.ok(veriDogrula(v).some((e) => e.includes('mesaj')));
});
