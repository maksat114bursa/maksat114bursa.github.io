CREATE TABLE IF NOT EXISTS olaylar (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zaman INTEGER NOT NULL,
  gun TEXT NOT NULL,
  olay TEXT NOT NULL,
  ziyaretci TEXT NOT NULL,
  cihaz TEXT,
  kaynak TEXT,
  ulke TEXT,
  sehir TEXT
);
CREATE INDEX IF NOT EXISTS olaylar_gun ON olaylar (gun, olay);
CREATE TABLE IF NOT EXISTS girisler (
  kim TEXT NOT NULL,
  zaman INTEGER NOT NULL,
  basarili INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS girisler_kim ON girisler (kim, zaman);
