// صفحه‌ی فروش و ورود: تم، ورود با کد، حالت خریدار، ترمینال زنده، سؤالات متداول، انیمیشن اسکرول
(function () {
  "use strict";
  var d = document, root = d.documentElement, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("js");

  /* ---------- تم (پیش‌فرض تیره) ---------- */
  var t = $("#themeBtn");
  if (t) t.addEventListener("click", function () {
    var v = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", v);
    try { localStorage.setItem("rayvo:theme", v); } catch (e) {}
    var m = $('meta[name="theme-color"]'); if (m) m.setAttribute("content", v === "dark" ? "#030612" : "#f6f9fd");
  });

  /* ---------- ورود با کد ---------- */
  var f = $("#f");
  if (f) f.addEventListener("submit", function (e) {
    e.preventDefault();
    var b = f.querySelector("button"), er = $("#err"), c = $("#code");
    er.textContent = ""; b.disabled = true;
    fetch("/api/login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: c.value.trim() }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (x) { return [r.ok, x]; }); })
      .then(function (x) {
        if (x[0]) { location.href = "/lessons/00-%D9%81%D9%87%D8%B1%D8%B3%D8%AA.html"; }
        else { er.textContent = x[1].error || "کد معتبر نیست"; b.disabled = false; }
      })
      .catch(function () { er.textContent = "خطا در ارتباط؛ دوباره تلاش کن"; b.disabled = false; });
  });

  /* ---------- حالت خریدار: اگر وارد شده، «مشاهده‌ی کل دوره» نشان بده ---------- */
  if ($("#navCourse") && window.fetch) {
    fetch("/api/me", { credentials: "same-origin", cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (u) {
        if (!u) return;
        root.classList.add("is-buyer");
        ["#navCourse", "#drCourse"].forEach(function (s) { var el = $(s); if (el) el.hidden = false; });
        ["#navLogin", "#navBuy", "#drLogin", "#drBuy"].forEach(function (s) { var el = $(s); if (el) el.hidden = true; });
        var eb = $("#enterBox"), wb = $("#welcomeBox");
        if (eb && wb) { eb.hidden = true; wb.hidden = false; var n = $("#welcomeName"); if (n && u.name) n.textContent = "سلام " + u.name + " 👋 خوش آمدی"; }
      }).catch(function () {});
  }

  /* ---------- منوی موبایل ---------- */
  var mb = $("#menuBtn"), dr = $("#drawer");
  function menu(open) {
    if (!mb || !dr) return;
    mb.setAttribute("aria-expanded", open ? "true" : "false");
    mb.classList.toggle("on", open);
    if (open) { dr.hidden = false; requestAnimationFrame(function () { dr.classList.add("open"); }); }
    else { dr.classList.remove("open"); setTimeout(function () { if (!dr.classList.contains("open")) dr.hidden = true; }, 260); }
  }
  if (mb) {
    mb.addEventListener("click", function () { menu(mb.getAttribute("aria-expanded") !== "true"); });
    if (dr) dr.addEventListener("click", function (e) { if (e.target.closest("a")) menu(false); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape") menu(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 900) menu(false); });
  }

  /* ---------- هدر: نوار پیشرفت اسکرول + فشرده‌شدن + اسکرول‌اسپای ---------- */
  var nav = $("#nav"), bar = $("#sProg"), ticking = false;
  var spy = $$("[data-sp]").filter(function (a, i, arr) { return arr.findIndex(function (x) { return x.dataset.sp === a.dataset.sp; }) === i; });
  var secs = spy.map(function (a) { return d.getElementById(a.dataset.sp); }).filter(Boolean);
  function onScroll() {
    ticking = false;
    var y = window.pageYOffset || 0, h = (d.body.scrollHeight - window.innerHeight) || 1;
    if (bar) bar.style.transform = "scaleX(" + Math.min(1, y / h).toFixed(4) + ")";
    if (nav) nav.classList.toggle("scrolled", y > 12);
    var cur = "";
    for (var i = 0; i < secs.length; i++) { if (secs[i].getBoundingClientRect().top < window.innerHeight * 0.38) cur = secs[i].id; }
    $$("[data-sp]").forEach(function (a) { a.classList.toggle("on", a.dataset.sp === cur); });
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- نمایش نرم بخش‌ها هنگام اسکرول (با اسکرول به بالا هم دوباره انیمیت می‌شود) ---------- */
  if ("IntersectionObserver" in window && !reduce) {
    var els = $$(".s-sec > .s-wrap, .s-hero-txt, .s-visual, .s-card, .s-lv, .s-enter-in, .s-fq, .s-cover, .s-week, .s-box, .s-price, .s-free > *");
    els.forEach(function (el, i) { el.classList.add("rv-rev"); el.style.setProperty("--d", ((i % 4) * 70) + "ms"); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) en.target.classList.add("in");
        else if (en.boundingClientRect.top > 0 || en.boundingClientRect.bottom < 0) en.target.classList.remove("in"); // کاملاً خارج شد → دفعه‌ی بعد دوباره بیاید
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- سؤالات متداول: همیشه فقط یکی باز ---------- */
  var fqs = $$(".s-fq");
  function setFq(it, open) {
    it.classList.toggle("open", open);
    var b = $(".s-fq-h", it); if (b) b.setAttribute("aria-expanded", open ? "true" : "false");
  }
  fqs.forEach(function (it) {
    var b = $(".s-fq-h", it);
    b.addEventListener("click", function () {
      var wasOpen = it.classList.contains("open");
      fqs.forEach(function (o) { setFq(o, false); });
      if (!wasOpen) setFq(it, true);
    });
  });

  /* ---------- ترمینال زنده: مدام دستور لاراول می‌نویسد؛ بعد از ۱ دقیقه پاک و از اول ---------- */
  var out = $("#termOut");
  if (out) {
    var SCRIPT = [
      ["$", "composer create-project laravel/laravel shop"],
      ["o", "Creating a \"laravel/laravel\" project at \"./shop\""],
      ["i", "Application ready! Build something amazing."],
      ["$", "cd shop"],
      ["$", "php artisan make:model Product -mcr"],
      ["i", "Model [app/Models/Product.php] created successfully."],
      ["i", "Migration [database/migrations/create_products_table.php] created successfully."],
      ["i", "Controller [app/Http/Controllers/ProductController.php] created successfully."],
      ["$", "php artisan make:request StoreProductRequest"],
      ["i", "Request [app/Http/Requests/StoreProductRequest.php] created successfully."],
      ["$", "php artisan make:policy ProductPolicy --model=Product"],
      ["$", "php artisan make:factory ProductFactory"],
      ["$", "php artisan migrate"],
      ["i", "Running migrations."],
      ["o", "create_products_table ............ 14ms DONE"],
      ["$", "php artisan db:seed"],
      ["i", "Seeding database."],
      ["$", "php artisan make:event OrderPlaced"],
      ["$", "php artisan make:job SendOrderEmail"],
      ["$", "php artisan route:list --path=api"],
      ["o", "GET|HEAD  api/products ........ products.index"],
      ["o", "POST      api/products ........ products.store"],
      ["$", "php artisan test"],
      ["o", "Tests:    24 passed (58 assertions)"],
      ["$", "php artisan optimize"],
      ["i", "Caching framework bootstrap, configuration, and metadata."],
      ["$", "php artisan serve"],
      ["i", "Server running on [http://127.0.0.1:8000]."]
    ];
    var esc = function (x) { return x.replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
    var render = function (done, typing) {
      var h = "";
      done.forEach(function (l) {
        if (l[0] === "$") h += '<span class="c">$</span> ' + esc(l[1]) + "\n";
        else if (l[0] === "i") h += '<span class="o">INFO</span>  ' + esc(l[1]).replace(/(\[[^\]]+\])/g, '<span class="u">$1</span>') + "\n";
        else h += '<span class="k">' + esc(l[1]) + "</span>\n";
      });
      if (typing != null) h += '<span class="c">$</span> ' + esc(typing);
      out.innerHTML = h;
      var pre = out.parentNode; pre.scrollTop = pre.scrollHeight;
    };
    if (reduce) { render(SCRIPT.slice(0, 8)); }
    else {
      var run = 0;
      (function start() {
        var my = ++run, t0 = Date.now(), done = [], i = 0;
        render([]);
        function sleep(ms, fn) { setTimeout(function () { if (my === run) fn(); }, ms); }
        function next() {
          if (Date.now() - t0 > 60000 || i >= SCRIPT.length) { return sleep(1800, function () { start(); }); } // بعد از ۱ دقیقه (یا پایان) پاک و از اول
          var L = SCRIPT[i++];
          if (L[0] !== "$") { done.push(L); render(done); return sleep(220 + Math.random() * 380, next); }
          var n = 0;
          (function ty() {
            if (n <= L[1].length) { render(done, L[1].slice(0, n++)); sleep(26 + Math.random() * 55, ty); }
            else { done.push(L); render(done); sleep(300 + Math.random() * 420, next); }
          })();
        }
        sleep(500, next);
      })();
    }
  }
})();
