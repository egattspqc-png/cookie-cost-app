import { json, badRequest, notFound, readJson } from "../../_utils.js";

export async function onRequestGet({ params, env }) {
  const cookie = await env.DB.prepare(
    `SELECT c.id, c.name, c.base_id, c.base_weight_g, b.name AS base_name
     FROM cookies c JOIN bases b ON b.id = c.base_id WHERE c.id = ?`
  )
    .bind(params.id)
    .first();
  if (!cookie) return notFound();

  const { results: toppings } = await env.DB.prepare(
    `SELECT ct.ingredient_id, ct.weight_g, i.name AS ingredient_name, i.price_per_kg
     FROM cookie_toppings ct JOIN ingredients i ON i.id = ct.ingredient_id
     WHERE ct.cookie_id = ?`
  )
    .bind(params.id)
    .all();

  const baseAgg = await env.DB.prepare(
    `SELECT SUM(bi.weight_g) AS total_weight_g,
            SUM(bi.weight_g * i.price_per_kg / 1000.0) AS total_cost
     FROM base_items bi JOIN ingredients i ON i.id = bi.ingredient_id
     WHERE bi.base_id = ?`
  )
    .bind(cookie.base_id)
    .first();

  const basePerG =
    baseAgg && baseAgg.total_weight_g > 0
      ? baseAgg.total_cost / baseAgg.total_weight_g
      : 0;
  const base_cost = basePerG * cookie.base_weight_g;
  const topping_cost = toppings.reduce(
    (s, t) => s + (t.price_per_kg / 1000) * t.weight_g,
    0
  );

  return json({
    ...cookie,
    toppings,
    base_cost_per_g: basePerG,
    base_cost,
    topping_cost,
    total_cost: base_cost + topping_cost,
    total_weight_g: cookie.base_weight_g + toppings.reduce((s, t) => s + t.weight_g, 0),
  });
}

// PUT /api/cookies/:id -> แก้ไขคุกกี้ + แทนที่รายการหน้าคุกกี้ทั้งหมด
export async function onRequestPut({ params, request, env }) {
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

  const exists = await env.DB.prepare("SELECT id FROM cookies WHERE id = ?")
    .bind(params.id)
    .first();
  if (!exists) return notFound();

  const stmts = [
    env.DB.prepare(
      "UPDATE cookies SET name = ?, base_id = ?, base_weight_g = ? WHERE id = ?"
    ).bind(body.name.trim(), body.base_id, body.base_weight_g, params.id),
    env.DB.prepare("DELETE FROM cookie_toppings WHERE cookie_id = ?").bind(
      params.id
    ),
    ...body.toppings.map((t) =>
      env.DB.prepare(
        "INSERT INTO cookie_toppings (cookie_id, ingredient_id, weight_g) VALUES (?, ?, ?)"
      ).bind(params.id, t.ingredient_id, t.weight_g)
    ),
  ];
  await env.DB.batch(stmts);

  return json({ ok: true });
}

export async function onRequestDelete({ params, env }) {
  const result = await env.DB.prepare("DELETE FROM cookies WHERE id = ?")
    .bind(params.id)
    .run();
  if (result.meta.changes === 0) return notFound();
  return json({ ok: true });
}
