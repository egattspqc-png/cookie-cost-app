# Cookie Ledger — เว็บแอปคำนวณต้นทุนคุกกี้

เว็บแอปคำนวณราคาต้นทุนคุกกี้ที่ใช้ "คุกกี้เบส" เดียวกันแต่มี "หน้าคุกกี้" (topping) ต่างกัน
สร้างด้วย Cloudflare Pages + Pages Functions + D1 (SQLite) และ HTML/JS ธรรมดา (ไม่มีขั้นตอน build)

## โครงสร้างข้อมูล

- **ส่วนผสม** (`ingredients`) — ชื่อ + ราคา/กก.
- **คุกกี้เบส** (`bases`) — ชื่อ + รายการส่วนผสมพร้อมน้ำหนัก (กรัม) → คำนวณ "ต้นทุนต่อกรัมของเบส" ได้
- **คุกกี้** (`cookies`) — ชื่อ + เลือกเบส + น้ำหนักเนื้อเบสที่ใช้ต่อชิ้น + รายการหน้าคุกกี้ (ส่วนผสมเพิ่มเติมเฉพาะคุกกี้นั้น)

**สูตรคำนวณราคาต่อชิ้น** = (ต้นทุนต่อกรัมของเบส × น้ำหนักเบสที่ใช้) + Σ(ราคาต่อกรัมของส่วนผสมหน้าคุกกี้ × น้ำหนักที่ใช้)

## หน้าเว็บ

| ไฟล์ | หน้าที่ |
|---|---|
| `public/index.html` | เลือกชื่อคุกกี้ → แสดงราคาต้นทุนต่อชิ้น (สไตล์ใบเสร็จ) |
| `public/cookies.html` | ดู/เพิ่ม/แก้ไข/ลบ รายชื่อคุกกี้ (เบส + น้ำหนัก + หน้าคุกกี้) |
| `public/bases.html` | ดู/เพิ่ม/แก้ไข/ลบ คุกกี้เบส (ส่วนผสม + น้ำหนัก) |
| `public/ingredients.html` | ดู/เพิ่ม/แก้ไข/ลบ ส่วนผสม (ชื่อ + ราคา/กก. + น้ำหนักมาตรฐาน) |

API อยู่ที่ `functions/api/*` (Cloudflare Pages Functions) เรียก D1 ผ่าน binding ชื่อ `DB`

## ขั้นตอนติดตั้งและ deploy

### 1) เตรียมเครื่องมือ

```bash
npm install -g wrangler
wrangler login
```

### 2) สร้างฐานข้อมูล D1

```bash
wrangler d1 create cookie_cost_db
```

คำสั่งนี้จะคืนค่า `database_id` มาให้ — เอาไปแทนที่ `REPLACE_WITH_YOUR_D1_DATABASE_ID` ใน `wrangler.toml`

### 3) รัน schema เข้า D1

```bash
# ทดสอบ local ก่อน
wrangler d1 execute cookie_cost_db --local --file=./schema.sql

# ของจริงบน Cloudflare
wrangler d1 execute cookie_cost_db --remote --file=./schema.sql
```

### 4) ทดสอบ local

```bash
wrangler pages dev public
```

เปิด `http://localhost:8788`

### 5) Push ขึ้น GitHub

```bash
git init
git add .
git commit -m "Cookie cost calculator"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 6) เชื่อมกับ Cloudflare Pages

1. ไปที่ Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. เลือก repo ที่เพิ่ง push ขึ้นไป
3. ตั้งค่า build:
   - **Build command**: (เว้นว่าง — ไม่มี build)
   - **Build output directory**: `public`
4. หลัง deploy ครั้งแรก ไปที่ตั้งค่าโปรเจกต์ → **Functions** → **D1 database bindings** → เพิ่ม binding ชื่อ `DB` ผูกกับฐานข้อมูล `cookie_cost_db` ที่สร้างไว้ (ทำทั้ง Production และ Preview)
5. Deploy ใหม่อีกครั้ง (Retry deployment) เพื่อให้ binding มีผล

> หมายเหตุ: ทุกครั้งที่ `git push` ขึ้น branch `main`, Cloudflare Pages จะ build/deploy ให้อัตโนมัติ

## การใช้งาน

1. เริ่มที่แท็บ **ส่วนผสม** — เพิ่มส่วนผสมทั้งหมดพร้อมราคาต่อกก.
2. ไปแท็บ **คุกกี้เบส** — สร้างสูตรเบส เลือกส่วนผสม + น้ำหนักที่ใช้
3. ไปแท็บ **รายชื่อคุกกี้** — สร้างคุกกี้แต่ละหน้า เลือกเบส + น้ำหนักเนื้อเบสต่อชิ้น + เพิ่มหน้าคุกกี้ (ถ้ามี)
4. กลับมาแท็บ **คำนวณราคา** — เลือกชื่อคุกกี้ดูราคาต้นทุนต่อชิ้นได้ทันที
