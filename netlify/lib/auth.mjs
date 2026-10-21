// امضا، کوکی، هش کد، رمزنگاری کد برای نمایش مدیر، قفل تلاش اشتباه
import crypto from "node:crypto";
import { stores, putNew } from "./store.mjs";

export const FREE = ["00-فهرست.html", "intro.html", "setup-environment.html", "php-1-basics.html"].map((s) => s.normalize("NFC"));

// کلید محرمانه‌ی سرور: یک بار به‌صورت تصادفی ساخته و داخل Netlify Blobs ذخیره می‌شود (نیازی به متغیر محیطی نیست)
let SECRET = "";
export async function getSecret() {
  if (SECRET) return SECRET;
  const { locks } = stores();
  let r = await locks.get("_secret", { type: "json" });
  if (!r || !r.s) {
    await putNew(locks, "_secret", { s: crypto.randomBytes(48).toString("base64url"), at: Date.now() });
    r = await locks.get("_secret", { type: "json" });
  }
  if (!r || !r.s || r.s.length < 32) throw new Error("secret unavailable");
  SECRET = r.s;
  return SECRET;
}

export function sign(obj, key) {
  const p = Buffer.from(JSON.stringify(obj)).toString("base64url");
  const s = crypto.createHmac("sha256", key).update(p).digest("base64url");
  return p + "." + s;
}
export function verify(token, key) {
  if (!token || !key || typeof token !== "string") return null;
  const i = token.indexOf(".");
  if (i < 1) return null;
  const p = token.slice(0, i), s = token.slice(i + 1);
  const good = crypto.createHmac("sha256", key).update(p).digest("base64url");
  const a = Buffer.from(s), b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
    return d && d.exp > Date.now() ? d : null;
  } catch { return null; }
}

export function getCookie(req, name) {
  const h = req.headers.get("cookie") || "";
  for (const part of h.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}
export function setCookie(name, value, { maxAge, path = "/", sameSite = "Lax" }) {
  return `${name}=${value}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=${sameSite}`;
}

export function safeEq(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

const DIG = { "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9", "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
export function normPhone(s) {
  let d = String(s || "").replace(/[۰-۹٠-٩]/g, (c) => DIG[c]).replace(/\D/g, "");
  if (d.startsWith("0098")) d = d.slice(4);
  else if (d.startsWith("98") && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith("9")) d = "0" + d;
  return d;
}

// ---- کد دسترسی: در انبار فقط «هش» آن نگهداری می‌شود
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newCode() {
  const g = () => Array.from(crypto.randomBytes(4), (b) => ALPHA[b % ALPHA.length]).join("");
  return `RV-${g()}-${g()}-${g()}`;
}
export function cleanCode(input) {
  const raw = String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length !== 14 || !raw.startsWith("RV")) return "";
  const b = raw.slice(2);
  return `RV-${b.slice(0, 4)}-${b.slice(4, 8)}-${b.slice(8, 12)}`;
}
export const ID_RE = /^[a-f0-9]{40}$/;
export function codeKey(code, secret) {
  return crypto.createHmac("sha256", secret).update("code:" + code).digest("hex").slice(0, 40);
}
// نسخه‌ی رمزشده‌ی کد فقط برای اینکه مدیر بتواند دوباره ببیند/بفرستد
const encKey = (secret) => crypto.createHash("sha256").update("enc:" + secret).digest();
export function encCode(code, secret) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", encKey(secret), iv);
  const ct = Buffer.concat([c.update(code, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64url");
}
export function decCode(enc, secret) {
  try {
    const b = Buffer.from(enc, "base64url");
    const d = crypto.createDecipheriv("aes-256-gcm", encKey(secret), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
  } catch { return ""; }
}

// ---- مدیر: scrypt روی «شماره|رمز»
export function credHash(phone, password, saltHex) {
  return crypto.scryptSync(normPhone(phone) + "|" + String(password), Buffer.from(saltHex, "hex"), 64, { N: 32768, r: 8, p: 1, maxmem: 96 * 1024 * 1024 }).toString("hex");
}
export function credEq(a, b) {
  const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function clientIp(req, context) {
  return (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}
const ipKey = (prefix, ip) => prefix + "_" + String(ip).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
export async function lockedUntil(store, prefix, ip) {
  const r = await store.get(ipKey(prefix, ip), { type: "json" });
  return r && r.until && r.until > Date.now() ? r.until : 0;
}
export async function addFail(store, prefix, ip, max, lockMs) {
  const k = ipKey(prefix, ip);
  let r = (await store.get(k, { type: "json" })) || { n: 0, first: Date.now() };
  if ((r.until && r.until <= Date.now()) || Date.now() - r.first > 3600 * 1000) r = { n: 0, first: Date.now() };
  r.n++;
  if (r.n >= max) { r.until = Date.now() + lockMs; r.n = 0; }
  await store.setJSON(k, r);
}
export async function clearFails(store, prefix, ip) { await store.delete(ipKey(prefix, ip)); }

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers } });

// درخواست‌های تغییردهنده فقط از همین سایت پذیرفته شوند (لایه‌ی دوم در برابر CSRF، علاوه بر SameSite)
export function sameOrigin(req) {
  const o = req.headers.get("origin");
  if (!o) return true; // مرورگرها در POST همیشه Origin می‌فرستند؛ نبودنش یعنی ابزار غیرمرورگری (بدون کوکی کاربر)
  try { return new URL(o).host === new URL(req.url).host; } catch { return false; }
}
// IP به‌صورت هش (بدون ذخیره‌ی IP خام) برای شناسایی اشتراک‌گذاری کد
export function ipHash(ip, secret) {
  return crypto.createHmac("sha256", secret).update("ip:" + ip).digest("hex").slice(0, 12);
}
