// POST /api/login { code } -> کوکی امضاشده. اولین ورود، کد را به همین مرورگر قفل می‌کند.
import crypto from "node:crypto";
import { sameOrigin, getSecret, sign, verify, getCookie, setCookie, cleanCode, codeKey, clientIp, lockedUntil, addFail, clearFails, sleep, json } from "../lib/auth.mjs";
import { stores, putNew } from "../lib/store.mjs";

export const config = { path: "/api/login" };
const MONTH = 365 * 24 * 3600 * 1000; // کد بدون مدت: کوکی یک‌ساله؛ با ۳۰ روز، دانشجو بعد از یک ماه قفل می‌شد

async function handle(req, context) {
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
  if (!sameOrigin(req)) return json({ error: "درخواست نامعتبر" }, 403);
  let key;
  try { key = await getSecret(); } catch { return json({ error: "سرور آماده نیست؛ چند ثانیه بعد دوباره امتحان کن." }, 503); }
  const { codes, claims, locks } = stores();
  const ip = clientIp(req, context);

  if (await lockedUntil(locks, "u", ip)) return json({ error: "تلاش‌های اشتباه زیاد بود؛ چند دقیقه بعد دوباره امتحان کن." }, 429);

  let body = {};
  try { body = await req.json(); } catch {}
  if (!body || typeof body !== "object" || Array.isArray(body)) body = {};
  const code = cleanCode(body.code);
  const id = code ? codeKey(code, key) : "";
  const rec = id ? await codes.get(id, { type: "json" }) : null;
  if (!rec) {
    await addFail(locks, "u", ip, 15, 30 * 60 * 1000);
    await sleep(700);
    return json({ error: "کد معتبر نیست" }, 401);
  }
  if (!rec.active) return json({ error: "این کد غیرفعال شده است. با پشتیبانی تماس بگیر." }, 403);

  const issue = (sid, at) => {
    let life = MONTH;
    if (rec.days > 0) life = Math.min(MONTH, Math.max(60000, (at || Date.now()) + rec.days * 86400000 - Date.now()));
    const tok = sign({ c: id, s: sid, exp: Date.now() + life }, key);
    return json({ ok: true }, 200, { "Set-Cookie": setCookie("rv_session", tok, { maxAge: Math.floor(life / 1000), path: "/" }) });
  };

  const existing = await claims.get(id, { type: "json" });
  if (existing) {
    if (rec.days > 0 && Date.now() > (existing.at || 0) + rec.days * 86400000) return json({ error: "مدت اعتبار این کد تمام شده است. برای تمدید با پشتیبانی پیام بده." }, 403);
    const mine = verify(getCookie(req, "rv_session"), key);
    if (mine && mine.c === id && mine.s === existing.sid) { await clearFails(locks, "u", ip); return issue(existing.sid, existing.at); }
    return json({ error: "این کد قبلاً روی یک مرورگر/دستگاه دیگر استفاده شده است (هر کد فقط یک‌بار و روی یک مرورگر). اگر کوکی‌های مرورگر را پاک کرده‌ای یا دستگاهت عوض شده، به پشتیبانی پیام بده تا ریست شود." }, 409);
  }

  const sid = crypto.randomBytes(16).toString("base64url");
  const won = await putNew(claims, id, { sid, at: Date.now(), ua: (req.headers.get("user-agent") || "").slice(0, 160) });
  if (!won) return json({ error: "این کد همین الان روی دستگاه دیگری استفاده شد." }, 409);
  const back = await claims.get(id, { type: "json" }); // تأیید نهایی (برای نسخه‌های قدیمی blobs)
  if (!back || back.sid !== sid) return json({ error: "این کد همین الان روی دستگاه دیگری استفاده شد." }, 409);
  await clearFails(locks, "u", ip);
  return issue(sid, Date.now());
}

export default async (req, context) => {
  try { return await handle(req, context); }
  catch (e) { console.error("login error", e); return json({ error: "خطای موقت سرور؛ چند ثانیه بعد دوباره امتحان کن." }, 500); } // جزئیات خطا فقط در لاگ Netlify، نه برای کاربر
};
