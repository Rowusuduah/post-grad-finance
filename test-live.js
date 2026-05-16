/* test-live.js — loads the DEPLOYED site in jsdom, runs its real scripts,
   and checks it boots without errors. Run: node test-live.js */
"use strict";
const { JSDOM } = require("jsdom");

const URL = "https://rowusuduah.github.io/post-grad-finance/";
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name); }
}

JSDOM.fromURL(URL, {
  pretendToBeVisual: true,
  runScripts: "dangerously",
  resources: "usable"
}).then((dom) => {
  const win = dom.window;
  const errors = [];
  win.addEventListener("error", (e) => errors.push(e.message || "error"));
  if (!win.Element.prototype.animate) {
    win.Element.prototype.animate = function () { return { onfinish: null }; };
  }
  /* give external scripts a moment to load and run */
  return new Promise((res) => win.setTimeout(() => res({ win, errors }), 2500));
}).then(({ win, errors }) => {
  const doc = win.document;
  check("no window errors during boot", errors.length === 0);
  if (errors.length) errors.forEach((e) => console.log("    -> " + e));
  check("app modules loaded", typeof win.UIPlan === "object" &&
    typeof win.Store === "object" && typeof win.App === "object");
  check("plan tab rendered 14 steps",
    doc.querySelectorAll("#panel-plan .step").length === 14);
  check("masthead + tabs present",
    doc.querySelectorAll('.nav-tabs [role="tab"]').length === 3);

  win.document.getElementById("tab-tracker").click();
  check("tracker tab renders", !!doc.querySelector(".networth-figure"));
  win.document.getElementById("tab-overview").click();
  check("overview tab renders KPIs",
    doc.querySelectorAll("#panel-overview .kpi").length === 5);

  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}).catch((e) => {
  console.log("  FAIL could not load live site: " + e.message);
  process.exit(1);
});
