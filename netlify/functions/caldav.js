// netlify/functions/caldav.js — proxy CORS per CalDAV
// Uso dal client: /.netlify/functions/caldav?url=<URL codificato>
// Limita ALLOWED_HOSTS ai tuoi server per non esporre un proxy aperto.

const ALLOWED_HOSTS = (process.env.CALDAV_HOSTS || "").split(",").map(s => s.trim()).filter(Boolean);
const FWD = ["authorization", "content-type", "depth", "if-match", "if-none-match", "prefer"];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,DELETE,OPTIONS,PROPFIND,REPORT,MKCALENDAR",
  "Access-Control-Allow-Headers": FWD.join(","),
  "Access-Control-Expose-Headers": "ETag,Content-Type",
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const target = new URL(req.url).searchParams.get("url");
  if (!target) return new Response("url mancante", { status: 400, headers: CORS });

  let t;
  try { t = new URL(target); } catch { return new Response("url non valido", { status: 400, headers: CORS }); }
  if (t.protocol !== "https:" || (ALLOWED_HOSTS.length && !ALLOWED_HOSTS.includes(t.host)))
    return new Response("host non consentito", { status: 403, headers: CORS });

  const headers = {};
  for (const h of FWD) { const v = req.headers.get(h); if (v) headers[h] = v; }

  const body = ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : await req.arrayBuffer();
  const up = await fetch(t, { method: req.method, headers, body, redirect: "manual" });

  const out = new Headers(CORS);
  for (const h of ["etag", "content-type"]) { const v = up.headers.get(h); if (v) out.set(h, v); }
  return new Response(await up.arrayBuffer(), { status: up.status, headers: out });
};

export const config = { path: "/.netlify/functions/caldav" };
