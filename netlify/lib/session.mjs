// بررسی جلسه‌ی دانشجو: امضا + کد هنوز فعال + هنوز به همین مرورگر قفل است
import { getCookie, verify, getSecret, ID_RE } from "./auth.mjs";
import { stores } from "./store.mjs";

export async function studentSession(req) {
  const key = await getSecret();
  const d = verify(getCookie(req, "rv_session"), key);
  if (!d || !ID_RE.test(d.c || "") || !d.s) return null;
  const { codes, claims } = stores();
  const [rec, claim] = await Promise.all([codes.get(d.c, { type: "json" }), claims.get(d.c, { type: "json" })]);
  if (!rec || !rec.active || !claim || claim.sid !== d.s) return null;
  if (rec.days > 0 && Date.now() > (claim.at || 0) + rec.days * 86400000) return null; // اعتبار تمام شده
  return { name: rec.name, tail: rec.tail || "", id: d.c, sid: d.s };
}
