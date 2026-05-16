/* sample.js — placeholder data for first-run and the "load sample" button.
   Deliberately fake, round numbers. Never put real financial data here. */
(function (global) {
  "use strict";

  function isoOffset(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  var SAMPLE_ACCOUNTS = [
    { name: "Sample Checking",      type: "checking",   currency: "USD", balance: 2400, isDebt: false, note: "Primary account — direct deposit lands here." },
    { name: "Sample High-Yield Savings", type: "savings", currency: "USD", balance: 1500, isDebt: false, note: "Emergency fund lives here." },
    { name: "Sample Credit Card",   type: "credit",     currency: "USD", balance: 320,  isDebt: true,  note: "Paid in full every month." },
    { name: "Sample SSNIT (Ghana)", type: "pension",    currency: "GHS", balance: 30000, isDebt: false, note: "Ghana pension contributions to date." }
  ];

  var SAMPLE_GOALS = [
    { name: "Emergency Fund (1 month)", target: 3000, current: 1500, currency: "USD", targetDate: isoOffset(120) },
    { name: "Trip Home to Ghana",       target: 2000, current: 350,  currency: "USD", targetDate: isoOffset(300) }
  ];

  var SAMPLE_BILLS = [
    { name: "Rent",          amount: 1100, currency: "USD", frequency: "monthly",  dayOfMonth: 1,  anchorDate: null,            category: "Housing" },
    { name: "Phone Plan",    amount: 45,   currency: "USD", frequency: "monthly",  dayOfMonth: 18, anchorDate: null,            category: "Utilities" },
    { name: "Student Health Plan End", amount: 0, currency: "USD", frequency: "once", dayOfMonth: null, anchorDate: isoOffset(20), category: "Insurance" }
  ];

  /* a few plan steps pre-marked, so first-run shows the UI working */
  var SAMPLE_PLAN = {
    s01: { status: "done",        note: "EAD card located, DSO notified.", updatedAt: new Date().toISOString() },
    s02: { status: "done",        note: "", updatedAt: new Date().toISOString() },
    s03: { status: "in-progress", note: "First paycheck arrives next week.", updatedAt: new Date().toISOString() }
  };

  /* Load sample data into storage. force=true overwrites existing data. */
  function loadSampleData(force) {
    if (!force) {
      if (Store.getArray("accounts").length || Store.getArray("goals").length ||
          Store.getArray("bills").length) {
        return false;
      }
    } else {
      Store.snapshot();
    }
    Store.setArray("accounts", SAMPLE_ACCOUNTS.map(withId));
    Store.setArray("goals",    SAMPLE_GOALS.map(withId));
    Store.setArray("bills",    SAMPLE_BILLS.map(withId));
    Store.setPlan(SAMPLE_PLAN);
    Store.setSettings({ sampleLoaded: true });
    return true;
  }

  function withId(obj) {
    var copy = {};
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) copy[k] = obj[k];
    }
    copy.id = U.uid();
    copy.updatedAt = new Date().toISOString();
    if (!copy.createdAt) copy.createdAt = copy.updatedAt;
    return copy;
  }

  global.Sample = { loadSampleData: loadSampleData };
})(window);
