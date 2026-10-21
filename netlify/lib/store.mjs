// سه انبار کلید-مقدار در Netlify Blobs (با سازگاری «قوی» تا غیرفعال‌سازی فوراً اعمال شود)
import { getStore } from "@netlify/blobs";

export function stores() {
  if (globalThis.__rvTestStores) return globalThis.__rvTestStores; // فقط برای تست خودکار
  const mk = (name) => getStore({ name, consistency: "strong" });
  return { codes: mk("rv-codes"), claims: mk("rv-claims"), locks: mk("rv-locks") };
}

// نوشتن «فقط اگر وجود ندارد». با نسخه‌های جدید Blobs اتمیک است؛
// اگر نسخه‌ای نتیجه برنگرداند، با خواندن دوباره مقدار را بررسی می‌کند.
export async function putNew(store, key, value) {
  // توجه: set() شرط را درست می‌فرستد؛ setJSON() در برخی نسخه‌ها آن را نادیده می‌گیرد
  const r = await store.set(key, JSON.stringify(value), { onlyIfNew: true });
  if (r && typeof r.modified === "boolean") return r.modified;
  const back = await store.get(key, { type: "json" });
  return !!back && JSON.stringify(back) === JSON.stringify(value);
}
