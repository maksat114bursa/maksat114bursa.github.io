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
