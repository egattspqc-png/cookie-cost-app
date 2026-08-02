import { json, badRequest, notFound, readJson } from "../../_utils.js";

export async function onRequestGet({ params, env }) {
  const row = await env.DB.prepare(
    "SELECT id, name, price_per_kg, default_weight_g FROM ingredients WHERE id = ?"
  )
    .bind(params.id)
    .first();
  if (!row) return notFound();
  return json(row);
}

export async function onRequestPut({ params, request, env }) {
  const body = await readJson(request);
  if (!body || !body.name || typeof body.price_per_kg !== "number") {
    return badRequest("ต้องระบุ name และ price_per_kg (ตัวเลข)");
  }
  const defaultWeight =
    typeof body.default_weight_g === "number" ? body.default_weight_g : null;

  const result = await env.DB.prepare(
    "UPDATE ingredients SET name = ?, price_per_kg = ?, default_weight_g = ? WHERE id = ?"
  )
    .bind(body.name.trim(), body.price_per_kg, defaultWeight, params.id)
    .run();

  if (result.meta.changes === 0) return notFound();
  return json({ ok: true });
}

export async function onRequestDelete({ params, env }) {
  try {
    const result = await env.DB.prepare("DELETE FROM ingredients WHERE id = ?")
      .bind(params.id)
      .run();
    if (result.meta.changes === 0) return notFound();
    return json({ ok: true });
  } catch (e) {
    return badRequest(
      "ลบไม่ได้ เพราะส่วนผสมนี้ถูกใช้อยู่ในคุกกี้เบสหรือหน้าคุกกี้ กรุณาลบการใช้งานก่อน"
    );
  }
}
