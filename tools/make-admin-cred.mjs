// ساخت هش شماره+رمز مدیر.   اجرا:  node tools/make-admin-cred.mjs 09120000000 "رمز-طولانی-و-قوی"
// خروجی را جایگزین محتوای netlify/lib/admin-cred.mjs کن (خود رمز هیچ‌جا ذخیره نمی‌شود).
import crypto from "node:crypto";
import { credHash, normPhone } from "../netlify/lib/auth.mjs";
const [phone, password] = process.argv.slice(2);
if (!phone || !password || password.length < 10) { console.error("استفاده: node tools/make-admin-cred.mjs <شماره> <رمز حداقل ۱۰ حرف>"); process.exit(1); }
const salt = crypto.randomBytes(16).toString("hex");
console.log(`// مدیر پیش‌فرض: فقط «هش» شماره+رمز اینجاست، نه خود رمز.\nexport const DEFAULT_ADMIN = { salt: "${salt}", hash: "${credHash(phone, password, salt)}" };`);
console.error("شماره‌ی نرمال‌شده:", normPhone(phone));
