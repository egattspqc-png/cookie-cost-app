import { json, badRequest, notFound, readJson } from "../../_utils.js";

export async function onRequestGet({ params, env }) {
  const base = await env.DB.prepare("SELECT id, name FROM bases WHERE id = ?")
    .bind(params.id)
    .first();
  if (!base) return notFound();

  const { results: items } = await env.DB.prepare(
    `SELECT bi.ingredient_id, bi.weight_g, i.name AS ingredient_name, i.price_per_kg
     FROM base_items bi JOIN ingredients i ON i.id = bi.ingredient_id
     WHERE bi.base_id = ?`
  )
    .bind(params.id)
    .all();

  const total_weight_g = items.reduce((s, it) => s + it.weight_g, 0);
  const total_cost = items.reduce(
    (s, it) => s + (it.price_per_kg / 1000) * it.weight_g,
    0
  );

  return json({
    ...base,
    items,
    total_weight_g,
    total_cost,
    cost_per_g: total_weight_g > 0 ? total_cost / total_weight_g : 0,
  });
}

// PUT /api/bases/:id -> แก้ไขชื่อ + แทนที่รายการส่วนผสมทั้งหมด
export async function onRequestPut({ params, request, env }) {
  const body = await readJson(request);
  if (!body || !body.name || !Array.isArray(body.items) || body.items.length === 0) {
    return badRequest("ต้องระบุ name และ items (รายการส่วนผสมอย่างน้อย 1 รายการ)");
  }
  for (const it of body.items) {
    if (!it.ingredient_id || typeof it.weight_g !== "number") {
      return badRequest("แต่ละ item ต้องมี ingredient_id และ weight_g (ตัวเลข)");
    }
  }

  const exists = await env.DB.prepare("SELECT id FROM bases WHERE id = ?")
    .bind(params.id)
    .first();
  if (!exists) return notFound();

  const stmts = [
    env.DB.prepare("UPDATE bases SET name = ? WHERE id = ?").bind(
      body.name.trim(),
      params.id
    ),
    env.DB.prepare("DELETE FROM base_items WHERE base_id = ?").bind(params.id),
    ...body.items.map((it) =>
      env.DB.prepare(
        "INSERT INTO base_items (base_id, ingredient_id, weight_g) VALUES (?, ?, ?)"
      ).bind(params.id, it.ingredient_id, it.weight_g)
    ),
  ];
  await env.DB.batch(stmts);

  return json({ ok: true });
}

export async function onRequestDelete({ params, env }) {
  const usedByCookie = await env.DB.prepare(
    "SELECT id FROM cookies WHERE base_id = ? LIMIT 1"
  )
    .bind(params.id)
    .first();
  if (usedByCookie) {
    return badRequest("ลบไม่ได้ เพราะคุกกี้เบสนี้ถูกใช้อยู่ในรายชื่อคุกกี้ กรุณาลบคุกกี้ที่ใช้เบสนี้ก่อน");
  }

  const result = await env.DB.prepare("DELETE FROM bases WHERE id = ?")
    .bind(params.id)
    .run();
  if (result.meta.changes === 0) return notFound();
  return json({ ok: true });
}
