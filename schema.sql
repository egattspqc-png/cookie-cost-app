-- Cookie Cost Calculator — D1 schema
-- ลบตารางเดิม (ถ้ามี) แล้วสร้างใหม่
DROP TABLE IF EXISTS cookie_toppings;
DROP TABLE IF EXISTS cookies;
DROP TABLE IF EXISTS base_items;
DROP TABLE IF EXISTS bases;
DROP TABLE IF EXISTS ingredients;

-- ส่วนผสมหลัก (แม่แบบ) เช่น แป้ง เนย ไข่ น้ำตาล ช็อกโกแลตชิพ
CREATE TABLE ingredients (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  price_per_kg  REAL NOT NULL DEFAULT 0,   -- ราคาต่อกิโลกรัม (บาท)
  default_weight_g REAL DEFAULT NULL,      -- น้ำหนักที่ใช้บ่อย/มาตรฐาน (กรัม) — ใช้เป็นค่าตั้งต้นตอนเพิ่มลงสูตร ไม่ใช้คำนวณราคา
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- คุกกี้เบส (สูตรฐาน) เช่น "เบสบัตเตอร์คุกกี้"
CREATE TABLE bases (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ส่วนผสมที่อยู่ในคุกกี้เบสแต่ละสูตร + น้ำหนักที่ใช้ (กรัม)
CREATE TABLE base_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  base_id       INTEGER NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  weight_g      REAL NOT NULL DEFAULT 0
);

-- คุกกี้แต่ละหน้า อ้างอิงเบส + น้ำหนักเบสที่ใช้ต่อชิ้น
CREATE TABLE cookies (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  base_id         INTEGER NOT NULL REFERENCES bases(id) ON DELETE RESTRICT,
  base_weight_g   REAL NOT NULL DEFAULT 0,  -- น้ำหนักเนื้อเบสที่ใช้ต่อคุกกี้ 1 ชิ้น (กรัม)
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ส่วนผสม "หน้าคุกกี้" (topping) เฉพาะของคุกกี้แต่ละชนิด + น้ำหนักต่อชิ้น (กรัม)
CREATE TABLE cookie_toppings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  cookie_id     INTEGER NOT NULL REFERENCES cookies(id) ON DELETE CASCADE,
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  weight_g      REAL NOT NULL DEFAULT 0
);

CREATE INDEX idx_base_items_base ON base_items(base_id);
CREATE INDEX idx_cookies_base ON cookies(base_id);
CREATE INDEX idx_toppings_cookie ON cookie_toppings(cookie_id);
