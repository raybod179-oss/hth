// GET /api/me -> { name, id } برای واترمارک؛ ۴۰۱ یعنی مهمان یا کد غیرفعال/ریست‌شده
// نکته: IPهای دیده‌شده فقط به‌صورت هش و در انبار جدا ذخیره می‌شوند (برای تشخیص اشتراک‌گذاری کد در پنل مدیر)
import { json, getSecret, ipHash, clientIp } from "../lib/auth.mjs";
import { studentSession } from "../lib/session.mjs";
import { stores } from "../lib/store.mjs";

export const config = { path: "/api/me" };

async function noteIp(s, req, context) {
  try {
    const { locks } = stores();
    const h = ipHash(clientIp(req, context), await getSecret());
    const k = "seen_" + s.id;
    const rec = (await locks.get(k, { type: "json" })) || { ips: {} };
    const now = Date.now();
    if (rec.ips[h] && now - rec.ips[h] < 6 * 3600 * 1000) return; // کم‌نوشتن: حداکثر هر ۶ ساعت برای هر IP
    rec.ips[h] = now;
    const keep = Object.entries(rec.ips).sort((a, b) => b[1] - a[1]).slice(0, 30); // فقط ۳۰ مورد آخر
    await locks.setJSON(k, { ips: Object.fromEntries(keep) });
  } catch {}
}

export default async (req, context) => {
  try {
    const s = await studentSession(req);
    if (!s) return json({}, 401);
    await noteIp(s, req, context);
    return json({ name: s.name, id: s.tail });
  } catch { return json({}, 401); }
};
