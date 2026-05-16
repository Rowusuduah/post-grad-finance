/* app.js — init, tab switching, theme, service worker. Loaded last. */
(function (global) {
  "use strict";

  var TABS = [
    { tab: "tab-plan",     panel: "panel-plan",     ui: "UIPlan" },
    { tab: "tab-tracker",  panel: "panel-tracker",  ui: "UITracker" },
    { tab: "tab-overview", panel: "panel-overview", ui: "UIOverview" }
  ];

  /* ---------- Theme ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#1A1714" : "#FBF7F0");
  }
  function initTheme() {
    var saved = Store.getTheme();
    if (!saved && global.matchMedia &&
        global.matchMedia("(prefers-color-scheme: dark)").matches) {
      saved = "dark";
    }
    applyTheme(saved || "light");
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", function () {
        var next = document.documentElement.getAttribute("data-theme") === "dark"
          ? "light" : "dark";
        applyTheme(next);
        Store.setTheme(next);
      });
    }
  }

  /* ---------- Tabs ---------- */
  function activateTab(index, focusPanel) {
    TABS.forEach(function (t, i) {
      var tabEl = document.getElementById(t.tab);
      var panelEl = document.getElementById(t.panel);
      var selected = i === index;
      tabEl.setAttribute("aria-selected", selected ? "true" : "false");
      tabEl.tabIndex = selected ? 0 : -1;
      panelEl.hidden = !selected;
      if (selected) {
        var ui = global[t.ui];
        if (ui && typeof ui.render === "function") ui.render();
        if (focusPanel) panelEl.focus();
      }
    });
  }

  function initTabs() {
    TABS.forEach(function (t, i) {
      var tabEl = document.getElementById(t.tab);
      tabEl.addEventListener("click", function () { activateTab(i, false); });
      tabEl.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
        else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = TABS.length - 1;
        if (next !== null) {
          e.preventDefault();
          document.getElementById(TABS[next].tab).focus();
          activateTab(next, false);
        }
      });
    });
  }

  /* re-render whichever tab is currently visible (called after data changes) */
  function refreshActiveTab() {
    TABS.forEach(function (t) {
      var panelEl = document.getElementById(t.panel);
      if (!panelEl.hidden) {
        var ui = global[t.ui];
        if (ui && typeof ui.render === "function") ui.render();
      }
    });
  }

  /* ---------- Cross-tab sync ---------- */
  function initCrossTabSync() {
    global.addEventListener("storage", function (e) {
      if (e.key && e.key.indexOf("pgf_") === 0) {
        refreshActiveTab();
      }
    });
  }

  /* ---------- Service worker ---------- */
  function initServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    global.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () {
        /* offline support is optional — ignore registration failure */
      });
    });
  }

  /* ---------- Boot ---------- */
  function init() {
    initTheme();

    /* first run: seed sample data so every tab has something to show */
    if (Store.isFirstRun()) {
      Sample.loadSampleData(false);
    }

    initTabs();
    if (global.UIPlan && UIPlan.init) UIPlan.init();
    if (global.UITracker && UITracker.init) UITracker.init();
    if (global.UIOverview && UIOverview.init) UIOverview.init();

    activateTab(0, false);
    initCrossTabSync();
    initServiceWorker();
  }

  /* shared so ui modules can ask the app to re-render the visible tab */
  global.App = { refresh: refreshActiveTab, go: function (name) {
    var idx = TABS.map(function (t) { return t.ui; }).indexOf(name);
    if (idx >= 0) {
      document.getElementById(TABS[idx].tab).focus();
      activateTab(idx, false);
    }
  } };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
