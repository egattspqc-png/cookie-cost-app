const API = "/api";

async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    throw new Error((data && data.error) || `เกิดข้อผิดพลาด (${res.status})`);
  }
  return data;
}

const api = {
  ingredients: {
    list: () => apiFetch("/ingredients"),
    create: (body) => apiFetch("/ingredients", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => apiFetch(`/ingredients/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id) => apiFetch(`/ingredients/${id}`, { method: "DELETE" }),
  },
  bases: {
    list: () => apiFetch("/bases"),
    get: (id) => apiFetch(`/bases/${id}`),
    create: (body) => apiFetch("/bases", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => apiFetch(`/bases/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id) => apiFetch(`/bases/${id}`, { method: "DELETE" }),
  },
  cookies: {
    list: () => apiFetch("/cookies"),
    get: (id) => apiFetch(`/cookies/${id}`),
    create: (body) => apiFetch("/cookies", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => apiFetch(`/cookies/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id) => apiFetch(`/cookies/${id}`, { method: "DELETE" }),
  },
};

function toast(message, isError = false) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2600);
}

function fmtBaht(n) {
  return (n ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtG(n) {
  const v = n ?? 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function renderNav(active) {
  const items = [
    { href: "index.html", label: "คำนวณราคา" },
    { href: "cookies.html", label: "รายชื่อคุกกี้" },
    { href: "bases.html", label: "คุกกี้เบส" },
    { href: "ingredients.html", label: "ส่วนผสม" },
  ];
  const nav = document.createElement("nav");
  nav.className = "tabs";
  nav.innerHTML = items
    .map(
      (it) =>
        `<a href="${it.href}" class="${it.href === active ? "active" : ""}">${it.label}</a>`
    )
    .join("");
  document.querySelector("#nav-slot").replaceWith(nav);
}
