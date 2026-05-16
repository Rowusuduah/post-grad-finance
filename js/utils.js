/* utils.js — shared helpers. No dependencies. */
(function (global) {
  "use strict";

  /* ---- HTML escaping (use before inserting any user string into innerHTML) ---- */
  function escapeHTML(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ---- Numbers / money ---- */
  function safeAmt(value) {
    var n = typeof value === "number" ? value : parseFloat(value);
    return isFinite(n) ? n : 0;
  }
  function roundMoney(value) {
    return Math.round((safeAmt(value) + Number.EPSILON) * 100) / 100;
  }
  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }

  var SYMBOL = { USD: "$", GHS: "GH₵" };

  /* Format an amount with a currency symbol. */
  function fmtMoney(value, currency) {
    var cur = currency === "GHS" ? "GHS" : "USD";
    var n = roundMoney(value);
    var sign = n < 0 ? "-" : "";
    var abs = Math.abs(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return sign + (SYMBOL[cur] || "") + abs;
  }

  /* ---- Dates (ISO YYYY-MM-DD, local) ---- */
  function todayISO() {
    var d = new Date();
    return isoFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  function isoFromParts(y, m, d) {
    return y + "-" + pad2(m) + "-" + pad2(d);
  }
  function pad2(n) {
    n = String(n);
    return n.length < 2 ? "0" + n : n;
  }
  /* Parse an ISO date string to a local Date at midnight; null if invalid. */
  function parseISO(iso) {
    if (typeof iso !== "string") return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  /* Whole days from today to an ISO date (negative = past). */
  function daysUntil(iso) {
    var target = parseISO(iso);
    if (!target) return null;
    var now = parseISO(todayISO());
    return Math.round((target - now) / 86400000);
  }
  /* Human-friendly date, e.g. "Aug 14, 2026". */
  function fmtDate(iso) {
    var d = parseISO(iso);
    if (!d) return "—";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }
  /* Friendly relative phrase for a due date. */
  function relativeDue(iso) {
    var n = daysUntil(iso);
    if (n === null) return "";
    if (n < 0) return Math.abs(n) + (Math.abs(n) === 1 ? " day overdue" : " days overdue");
    if (n === 0) return "due today";
    if (n === 1) return "due tomorrow";
    if (n <= 30) return "in " + n + " days";
    return "on " + fmtDate(iso);
  }

  /* ---- IDs ---- */
  function uid() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  }

  /* ---- Misc ---- */
  function debounce(fn, wait) {
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  /* ---- Toast ---- */
  var toastTimer;
  function showToast(message, isError) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("err", !!isError);
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("show");
    }, 3200);
  }

  global.U = {
    escapeHTML: escapeHTML,
    safeAmt: safeAmt,
    roundMoney: roundMoney,
    clamp: clamp,
    fmtMoney: fmtMoney,
    todayISO: todayISO,
    parseISO: parseISO,
    daysUntil: daysUntil,
    fmtDate: fmtDate,
    relativeDue: relativeDue,
    uid: uid,
    debounce: debounce,
    showToast: showToast
  };
})(window);
