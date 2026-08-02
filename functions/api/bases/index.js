import { json, badRequest, readJson } from "../../_utils.js";

async function attachItems(env, bases) {
  if (bases.length === 0) return bases;
  const ids = bases.map((b) => b.id);
  const placeholders = ids.map(() => "?").join(",");
  const { results: items } = await env.DB.prepare(
    `SELECT bi.base_id, bi.ingredient_id, bi.weight_g, i.name AS ingredient_name, i.price_per_kg
     FROM base_items bi JOIN ingredients i ON i.id = bi.ingredient_id
     WHERE bi.base_id IN (${placeholders})`
  )
    .bind(...ids)
    .all();

  return bases.map((base) => {
    const baseItems = items.filter((it) => it.base_id === base.id);
    const total_weight_g = baseItems.reduce((s, it) => s + it.weight_g, 0);
    const total_cost = baseItems.reduce(
      (s, it) => s + (it.price_per_kg / 1000) * it.weight_g,
      0
    );
    return {
      ...base,
      items: baseItems.map((it) => ({
        ingredient_id: it.ingredient_id,
        ingredient_name: it.ingredient_name,
        weight_g: it.weight_g,
      })),
      total_weight_g,
      total_cost,
      cost_per_g: total_weight_g > 0 ? total_cost / total_weight_g : 0,
    };
  });
}

// GET /api/bases -> คุกกี้เบสทั้งหมด พร้อมรายการส่วนผสมและต้นทุน
export async function onRequestGet({ env }) {
  const { results: bases } = await env.DB.prepare(
    "SELECT id, name FROM bases ORDER BY name COLLATE NOCASE"
  ).all();
  return json(await attachItems(env, bases));
}

// POST /api/bases -> เพิ่มคุกกี้เบสใหม่พร้อมส่วนผสม
// body: { name, items: [{ ingredient_id, weight_g }] }
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body || !body.name || !Array.isArray(body.items) || body.items.length === 0) {
    return badRequest("ต้องระบุ name และ items (รายการส่วนผสมอย่างน้อย 1 รายการ)");
  }
  for (const it of body.items) {
    if (!it.ingredient_id || typeof it.weight_g !== "number") {
      return badRequest("แต่ละ item ต้องมี ingredient_id และ weight_g (ตัวเลข)");
    }
  }

  const insertBase = await env.DB.prepare("INSERT INTO bases (name) VALUES (?)")
    .bind(body.name.trim())
    .run();
  const baseId = insertBase.meta.last_row_id;

  const stmts = body.items.map((it) =>
    env.DB.prepare(
      "INSERT INTO base_items (base_id, ingredient_id, weight_g) VALUES (?, ?, ?)"
    ).bind(baseId, it.ingredient_id, it.weight_g)
  );
  await env.DB.batch(stmts);

  return json({ id: baseId }, 201);
}
