import { json, badRequest, readJson } from "../../_utils.js";

// คำนวณต้นทุนต่อกรัมของคุกกี้เบสแต่ละสูตร -> { [base_id]: cost_per_g }
async function getBaseCostPerGram(env) {
  const { results } = await env.DB.prepare(
    `SELECT bi.base_id,
            SUM(bi.weight_g) AS total_weight_g,
            SUM(bi.weight_g * i.price_per_kg / 1000.0) AS total_cost
     FROM base_items bi JOIN ingredients i ON i.id = bi.ingredient_id
     GROUP BY bi.base_id`
  ).all();
  const map = {};
  for (const r of results) {
    map[r.base_id] = r.total_weight_g > 0 ? r.total_cost / r.total_weight_g : 0;
  }
  return map;
}

async function attachDetails(env, cookies) {
  if (cookies.length === 0) return cookies;
  const ids = cookies.map((c) => c.id);
  const placeholders = ids.map(() => "?").join(",");
  const { results: toppings } = await env.DB.prepare(
    `SELECT ct.cookie_id, ct.ingredient_id, ct.weight_g, i.name AS ingredient_name, i.price_per_kg
     FROM cookie_toppings ct JOIN ingredients i ON i.id = ct.ingredient_id
     WHERE ct.cookie_id IN (${placeholders})`
  )
    .bind(...ids)
    .all();

  const baseCostPerGram = await getBaseCostPerGram(env);

  return cookies.map((cookie) => {
    const items = toppings.filter((t) => t.cookie_id === cookie.id);
    const topping_cost = items.reduce(
      (s, t) => s + (t.price_per_kg / 1000) * t.weight_g,
      0
    );
    const basePerG = baseCostPerGram[cookie.base_id] || 0;
    const base_cost = basePerG * cookie.base_weight_g;
    return {
      ...cookie,
      toppings: items.map((t) => ({
        ingredient_id: t.ingredient_id,
        ingredient_name: t.ingredient_name,
        weight_g: t.weight_g,
      })),
      base_cost,
      topping_cost,
      total_cost: base_cost + topping_cost,
      total_weight_g:
        cookie.base_weight_g + items.reduce((s, t) => s + t.weight_g, 0),
    };
  });
}

// GET /api/cookies -> คุกกี้ทั้งหมด พร้อมราคาต้นทุนต่อชิ้น
export async function onRequestGet({ env }) {
  const { results: cookies } = await env.DB.prepare(
    `SELECT c.id, c.name, c.base_id, c.base_weight_g, b.name AS base_name
     FROM cookies c JOIN bases b ON b.id = c.base_id
     ORDER BY c.name COLLATE NOCASE`
  ).all();
  return json(await attachDetails(env, cookies));
}

// POST /api/cookies -> เพิ่มคุกกี้ใหม่
// body: { name, base_id, base_weight_g, toppings: [{ ingredient_id, weight_g }] }
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (
    !body ||
    !body.name ||
    !body.base_id ||
    typeof body.base_weight_g !== "number" ||
    !Array.isArray(body.toppings)
  ) {
    return badRequest(
      "ต้องระบุ name, base_id, base_weight_g (ตัวเลข) และ toppings (อาจเป็น [])"
    );
  }
  for (const t of body.toppings) {
    if (!t.ingredient_id || typeof t.weight_g !== "number") {
      return badRequest("แต่ละ topping ต้องมี ingredient_id และ weight_g (ตัวเลข)");
    }
  }

  const insertCookie = await env.DB.prepare(
    "INSERT INTO cookies (name, base_id, base_weight_g) VALUES (?, ?, ?)"
  )
    .bind(body.name.trim(), body.base_id, body.base_weight_g)
    .run();
  const cookieId = insertCookie.meta.last_row_id;

  if (body.toppings.length > 0) {
    const stmts = body.toppings.map((t) =>
      env.DB.prepare(
        "INSERT INTO cookie_toppings (cookie_id, ingredient_id, weight_g) VALUES (?, ?, ?)"
      ).bind(cookieId, t.ingredient_id, t.weight_g)
    );
    await env.DB.batch(stmts);
  }

  return json({ id: cookieId }, 201);
}
