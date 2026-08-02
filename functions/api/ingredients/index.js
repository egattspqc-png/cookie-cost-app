import { json, badRequest, readJson } from "../../_utils.js";

// GET /api/ingredients -> รายการส่วนผสมทั้งหมด
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, name, price_per_kg, default_weight_g FROM ingredients ORDER BY name COLLATE NOCASE"
  ).all();
  return json(results);
}

// POST /api/ingredients -> เพิ่มส่วนผสมใหม่
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  if (!body || !body.name || typeof body.price_per_kg !== "number") {
    return badRequest("ต้องระบุ name และ price_per_kg (ตัวเลข)");
  }
  const defaultWeight =
    typeof body.default_weight_g === "number" ? body.default_weight_g : null;

  const result = await env.DB.prepare(
    "INSERT INTO ingredients (name, price_per_kg, default_weight_g) VALUES (?, ?, ?)"
  )
    .bind(body.name.trim(), body.price_per_kg, defaultWeight)
    .run();

  return json({ id: result.meta.last_row_id }, 201);
}
