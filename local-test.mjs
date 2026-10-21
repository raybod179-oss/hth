// اجرای محلی برای تست: فقط به Node و همان `npm install` نیاز دارد.
// اجرا:  node local-test.mjs   ← بعد باز کردن  http://localhost:8888
// داده‌ها فقط در حافظه است و با بستن برنامه پاک می‌شود. فقط برای تست، نه برای انتشار.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
process.chdir(ROOT);
const PORT = Number(process.env.PORT || 8888);

class Mem {
  m = new Map();
  async get(k, o) { const v = this.m.get(k); return v === undefined ? null : (o && o.type === "json" ? JSON.parse(v) : v); }
  async setJSON(k, v, o = {}) { if (o.onlyIfNew && this.m.has(k)) return { modified: false }; this.m.set(k, JSON.stringify(v)); return { modified: true }; }
  async set(k, v, o = {}) { if (o.onlyIfNew && this.m.has(k)) return { modified: false }; this.m.set(k, v); return { modified: true }; }
  async delete(k) { this.m.delete(k); }
  async list() { return { blobs: [...this.m.keys()].map((key) => ({ key })), directories: [] }; }
}
globalThis.__rvTestStores = { codes: new Mem(), claims: new Mem(), locks: new Mem() };

const imp = (f) => import(pathToFileURL(path.join(ROOT, f)).href);
const { SEC } = await imp("netlify/lib/headers.mjs");
const fns = [];
for (const f of ["gate", "me", "login", "admin"]) fns.push(await imp(`netlify/functions/${f}.mjs`));

const match = (p, pat) => pat === p || (pat.endsWith("/*") && p.startsWith(pat.slice(0, -1)));
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain" };
const PUB = path.join(ROOT, "public");

http.createServer(async (rq, rs) => {
  try {
    const url = new URL(rq.url, `http://localhost:${PORT}`);
    const chunks = []; for await (const c of rq) chunks.push(c);
    const pth = decodeURIComponent(url.pathname);
    const fn = fns.find((m) => [].concat(m.config.path).some((p) => match(pth, p)));
    if (fn) {
      const req = new Request(`http://localhost:${PORT}${rq.url}`, { method: rq.method, headers: rq.headers, body: ["GET", "HEAD"].includes(rq.method) ? undefined : Buffer.concat(chunks) });
      const res = await fn.default(req, { ip: rq.socket.remoteAddress || "127.0.0.1" });
      const h = {}; res.headers.forEach((v, k) => (h[k] = v));
      const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      if (sc.length) h["set-cookie"] = sc.map((c) => c.replace("; Secure", ""));
      rs.writeHead(res.status, h);
      return rs.end(Buffer.from(await res.arrayBuffer()));
    }
    let p = pth; if (p.endsWith("/")) p += "index.html"; else if (!path.extname(p)) p += ".html";
    const f = path.join(PUB, p);
    if (f.startsWith(PUB) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      rs.writeHead(200, { ...SEC, "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
      return rs.end(fs.readFileSync(f));
    }
    rs.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); rs.end("404");
  } catch (e) { console.error(e); rs.writeHead(500); rs.end("خطا: " + e.message); }
}).listen(PORT, () => {
  const admin = fs.readdirSync(PUB).find((d) => d.startsWith("rv-admin-"));
  console.log("\nآماده است ✔");
  console.log(`  سایت:  http://localhost:${PORT}/`);
  console.log(`  پنل:   http://localhost:${PORT}/${admin}/\n`);
  console.log("برای بستن: Ctrl+C");
});
