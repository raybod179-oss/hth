// دروازه‌ی محتوا: /lessons/* و /downloads/*
import { FREE } from "../lib/auth.mjs";
import { studentSession } from "../lib/session.mjs";
import { listDir, readFile } from "../lib/content.mjs";
import { SEC } from "../lib/headers.mjs";

export const config = { path: ["/lessons", "/lessons/*", "/downloads", "/downloads/*"] };

const HOME = "/lessons/" + encodeURIComponent("00-فهرست.html");
const TYPES = { ".html": "text/html; charset=utf-8", ".zip": "application/zip" };
const nf = () => new Response("Not Found", { status: 404, headers: { "Cache-Control": "no-store" } });
const goLogin = (url) => new Response(null, { status: 302, headers: { Location: new URL("/login.html?locked=1", url).toString(), "Cache-Control": "no-store" } });

export default async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method Not Allowed", { status: 405 });
  const url = new URL(req.url);
  let segs;
  try { segs = url.pathname.split("/").filter(Boolean).map((s) => decodeURIComponent(s).normalize("NFC")); }
  catch { return nf(); }

  const section = segs[0];
  if (section !== "lessons" && section !== "downloads") return nf();
  if (segs.length === 1) {
    return section === "lessons" ? new Response(null, { status: 302, headers: { Location: new URL(HOME, url).toString() } }) : nf();
  }
  if (segs.length !== 2) return nf();
  const name = segs[1];

  const free = section === "lessons" && FREE.includes(name);
  if (!free) {
    const s = await studentSession(req);
    if (!s) return goLogin(url);
  }

  const files = listDir(section);
  if (!files) return new Response("محتوا روی سرور پیدا نشد؛ در پنل مدیریت «وضعیت سیستم» را بزنید.", { status: 500 });
  const real = files.get(name);
  if (!real) return nf();

  const ext = real.slice(real.lastIndexOf(".")).toLowerCase();
  const headers = {
    ...SEC,
    "Content-Type": TYPES[ext] || "application/octet-stream",
    "Cache-Control": free ? "public, max-age=0, must-revalidate" : "private, no-store, max-age=0",
    "X-Robots-Tag": "noindex",
  };
  if (ext === ".zip") headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(real)}"`;
  const body = readFile(section, real);
  headers["Content-Length"] = String(body.length);
  return new Response(req.method === "HEAD" ? null : body, { status: 200, headers });
};
