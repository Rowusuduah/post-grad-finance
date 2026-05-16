/* test-smoke.js — jsdom smoke test. Not part of the app; run with `node test-smoke.js`.
   Loads the app the way a browser would and exercises the main paths. */
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name); }
}

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const dom = new JSDOM(html, {
  url: "http://localhost/post-grad-finance/",
  pretendToBeVisual: true,
  runScripts: "outside-only"
});
const win = dom.window;

/* polyfills jsdom lacks */
win.confirm = () => true;
win.alert = () => {};
if (!win.matchMedia) win.matchMedia = () => ({ matches: false, addListener(){}, removeListener(){} });
if (!win.Element.prototype.animate) {
  win.Element.prototype.animate = function () { return { onfinish: null, cancel(){} }; };
}

win.addEventListener("error", (e) => console.log("  window error: " + e.message));

/* load scripts in the same order index.html declares them */
const scripts = ["utils", "storage", "plan-data", "sample",
  "ui-plan", "ui-tracker", "ui-overview", "app"];
for (const s of scripts) {
  try {
    win.eval(fs.readFileSync(path.join(__dirname, "js", s + ".js"), "utf8"));
  } catch (e) {
    console.log("  FAIL " + s + ".js threw: " + e.message);
  }
}

const doc = win.document;
/* in a real browser app.js boots on DOMContentLoaded; fire it for the test */
doc.dispatchEvent(new win.Event("DOMContentLoaded", { bubbles: true }));

/* --- first-run seeded sample data --- */
check("plan panel rendered", doc.getElementById("panel-plan").innerHTML.length > 200);
check("14 step cards present", doc.querySelectorAll("#panel-plan .step").length === 14);
check("progress bar present", !!doc.querySelector("#panel-plan .seg-bar"));
check("sample accounts in storage", win.Store.getArray("accounts").length === 4);

/* --- tab switching --- */
doc.getElementById("tab-tracker").click();
check("tracker panel shows after switch", !doc.getElementById("panel-tracker").hidden);
check("tracker rendered accounts", doc.querySelectorAll("#panel-tracker .row-item").length >= 4);
check("net worth figure present", !!doc.querySelector(".networth-figure"));

doc.getElementById("tab-overview").click();
check("overview KPIs rendered", doc.querySelectorAll("#panel-overview .kpi").length === 5);
check("next moves list present", !!doc.querySelector("#panel-overview .next-list, #panel-overview .empty"));

/* --- plan interaction: cycle a step's status --- */
doc.getElementById("tab-plan").click();
const med = doc.querySelector('#panel-plan .medallion[data-step="s05"]');
const planBefore = win.Store.getPlan();
med.click(); /* todo -> in-progress */
check("medallion click changed status", win.Store.getPlan().s05 &&
  win.Store.getPlan().s05.status === "in-progress");

/* --- toggle a step body open, then re-render, expect it stays open --- */
const toggle = doc.querySelector('#panel-plan .step-toggle[data-step="s06"]');
toggle.click();
check("step body opened", doc.querySelector('.step[data-step="s06"]').classList.contains("is-open"));
doc.querySelector('#panel-plan .medallion[data-step="s05"]').click(); /* triggers re-render */
check("step body still open after re-render",
  doc.querySelector('.step[data-step="s06"]').classList.contains("is-open"));

/* --- filter chips --- */
const doneChip = doc.querySelector('#panel-plan [data-chip-group="status"][data-chip-value="done"]');
doneChip.click();
check("done filter shows only done steps",
  [...doc.querySelectorAll("#panel-plan .step")].every(s => s.classList.contains("is-done")));
doc.querySelector('#panel-plan [data-chip-group="status"][data-chip-value="all"]').click();

/* --- tracker: add an account via the form --- */
doc.getElementById("tab-tracker").click();
doc.getElementById("acc-name").value = "Test Account <script>";
doc.getElementById("acc-balance").value = "500";
doc.querySelector('[data-form="account"]').dispatchEvent(
  new win.Event("submit", { bubbles: true, cancelable: true }));
check("account added", win.Store.getArray("accounts").length === 5);
check("account name is HTML-escaped in DOM",
  doc.getElementById("panel-tracker").innerHTML.indexOf("<script>") === -1 &&
  doc.getElementById("panel-tracker").innerHTML.indexOf("&lt;script&gt;") !== -1);

/* --- bill next-due-date sanity --- */
const nd = win.Store.getNextDueDate({ frequency: "monthly", dayOfMonth: 15 });
check("getNextDueDate returns ISO date", /^\d{4}-\d{2}-\d{2}$/.test(nd));

/* --- export/import round-trip --- */
const backup = win.Store.makeBackupFile();
check("backup file shape", backup._app === "post-grad-finance" && !!backup.data.accounts);
win.Store.clearAll();
check("clearAll empties accounts", win.Store.getArray("accounts").length === 0);
const imp = win.Store.importBackup(backup);
check("importBackup ok", imp.ok === true && win.Store.getArray("accounts").length === 5);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
