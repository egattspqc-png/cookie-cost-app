export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function badRequest(message) {
  return json({ error: message }, 400);
}

export function notFound(message = "ไม่พบข้อมูล") {
  return json({ error: message }, 404);
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
