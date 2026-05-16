/* storage.js — localStorage persistence layer. Depends on U (utils.js). */
(function (global) {
  "use strict";

  var KEYS = {
    plan:     "pgf_plan",
    accounts: "pgf_accounts",
    goals:    "pgf_goals",
    bills:    "pgf_bills",
    settings: "pgf_settings",
    theme:    "pgf_theme",
    backup:   "pgf_safety_backup"
  };
  /* keys included in user-facing export/import backups */
  var BACKUP_KEYS = ["plan", "accounts", "goals", "bills", "settings", "theme"];

  var DEFAULT_SETTINGS = { fxRateGhsPerUsd: 15, sampleLoaded: false };

  /* ---- low-level safe access ---- */
  function safeParse(raw, fallback) {
    if (raw === null || raw === undefined) return fallback;
    try {
      var parsed = JSON.parse(raw, function (key, value) {
        if (key === "__proto__" || key === "constructor" || key === "prototype") {
          return undefined;
        }
        return value;
      });
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function read(name, fallback) {
    try {
      return safeParse(localStorage.getItem(KEYS[name]), fallback);
    } catch (e) {
      return fallback;
    }
  }

  function write(name, value) {
    try {
      localStorage.setItem(KEYS[name], JSON.stringify(value));
      return true;
    } catch (e) {
      if (e && (e.name === "QuotaExceededError" || e.code === 22)) {
        U.showToast("Storage is full — export a backup and clear old data.", true);
      } else {
        U.showToast("Couldn't save — your browser may be blocking storage.", true);
      }
      return false;
    }
  }

  /* ---- typed getters / setters ---- */
  function getArray(name) {
    var v = read(name, []);
    return Array.isArray(v) ? v : [];
  }
  function setArray(name, arr) {
    return write(name, Array.isArray(arr) ? arr : []);
  }

  function getSettings() {
    var s = read("settings", {});
    if (!s || typeof s !== "object") s = {};
    return {
      fxRateGhsPerUsd: U.safeAmt(s.fxRateGhsPerUsd) > 0
        ? U.safeAmt(s.fxRateGhsPerUsd) : DEFAULT_SETTINGS.fxRateGhsPerUsd,
      sampleLoaded: !!s.sampleLoaded
    };
  }
  function setSettings(patch) {
    var merged = getSettings();
    for (var k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) merged[k] = patch[k];
    }
    return write("settings", merged);
  }

  function getPlan() {
    var p = read("plan", {});
    return p && typeof p === "object" && !Array.isArray(p) ? p : {};
  }
  function setPlan(obj) {
    return write("plan", obj && typeof obj === "object" ? obj : {});
  }

  function getTheme() {
    var t = read("theme", null);
    return t === "dark" || t === "light" ? t : null;
  }
  function setTheme(t) {
    return write("theme", t === "dark" ? "dark" : "light");
  }

  /* ---- has the app ever stored anything? (first-run detection) ---- */
  function isFirstRun() {
    try {
      for (var name in KEYS) {
        if (name === "theme") continue;
        if (localStorage.getItem(KEYS[name]) !== null) return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---- safety snapshot before destructive ops ---- */
  function snapshot() {
    try {
      var snaps = read("backup", []);
      if (!Array.isArray(snaps)) snaps = [];
      snaps.push({ when: new Date().toISOString(), data: exportData() });
      while (snaps.length > 3) snaps.shift();
      write("backup", snaps);
    } catch (e) { /* best effort */ }
  }

  /* ---- export / import ---- */
  function exportData() {
    var data = {};
    BACKUP_KEYS.forEach(function (name) {
      if (name === "settings") data[name] = getSettings();
      else if (name === "plan") data[name] = getPlan();
      else if (name === "theme") data[name] = getTheme() || "light";
      else data[name] = getArray(name);
    });
    return data;
  }

  function makeBackupFile() {
    return {
      _app: "post-grad-finance",
      _version: 1,
      _saved: new Date().toISOString(),
      data: exportData()
    };
  }

  /* Returns { ok:true } or { ok:false, error:"..." }. */
  function importBackup(fileObj) {
    if (!fileObj || fileObj._app !== "post-grad-finance" || !fileObj.data) {
      return { ok: false, error: "This file is not a post-grad-finance backup." };
    }
    var d = fileObj.data;
    snapshot();
    if (Array.isArray(d.accounts)) setArray("accounts", d.accounts);
    if (Array.isArray(d.goals)) setArray("goals", d.goals);
    if (Array.isArray(d.bills)) setArray("bills", d.bills);
    if (d.plan && typeof d.plan === "object") setPlan(d.plan);
    if (d.settings && typeof d.settings === "object") setSettings(d.settings);
    if (d.theme === "dark" || d.theme === "light") setTheme(d.theme);
    return { ok: true };
  }

  function clearAll() {
    snapshot();
    try {
      for (var name in KEYS) {
        if (name === "backup") continue;
        localStorage.removeItem(KEYS[name]);
      }
      return true;
    } catch (e) {
      U.showToast("Couldn't clear data.", true);
      return false;
    }
  }

  /* ---- next-due-date for a recurring bill ----
     Returns an ISO date string for the next occurrence on/after today. */
  function getNextDueDate(bill) {
    var today = U.parseISO(U.todayISO());
    if (!today) return null;

    if (bill.frequency === "once") {
      return bill.anchorDate || null;
    }

    if (bill.frequency === "monthly") {
      var dom = Math.min(Math.max(parseInt(bill.dayOfMonth, 10) || 1, 1), 31);
      var y = today.getFullYear(), m = today.getMonth();
      for (var i = 0; i < 13; i++) {
        var lastDay = new Date(y, m + 1, 0).getDate();
        var day = Math.min(dom, lastDay);
        var candidate = new Date(y, m, day);
        if (candidate >= today) {
          return isoOf(candidate);
        }
        m++;
        if (m > 11) { m = 0; y++; }
      }
      return null;
    }

    /* weekly / biweekly: step forward from the anchor date */
    var anchor = U.parseISO(bill.anchorDate);
    if (!anchor) return null;
    var stepDays = bill.frequency === "weekly" ? 7 : 14;
    var cursor = new Date(anchor.getTime());
    var guard = 0;
    while (cursor < today && guard < 520) {
      cursor = new Date(cursor.getTime() + stepDays * 86400000);
      guard++;
    }
    return isoOf(cursor);
  }
  function isoOf(d) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  global.Store = {
    KEYS: KEYS,
    getArray: getArray,
    setArray: setArray,
    getSettings: getSettings,
    setSettings: setSettings,
    getPlan: getPlan,
    setPlan: setPlan,
    getTheme: getTheme,
    setTheme: setTheme,
    isFirstRun: isFirstRun,
    snapshot: snapshot,
    exportData: exportData,
    makeBackupFile: makeBackupFile,
    importBackup: importBackup,
    clearAll: clearAll,
    getNextDueDate: getNextDueDate
  };
})(window);
