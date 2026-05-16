/* ui-overview.js — the Overview tab: KPIs, next actions, upcoming bills, data tools.
   Depends on U, Store, PLAN. */
(function (global) {
  "use strict";

  var panel;
  var STATUSES = ["todo", "in-progress", "done"];
  var firstPaint = true;

  function fx() { return Store.getSettings().fxRateGhsPerUsd; }
  function toUSD(amount, currency) {
    var n = U.safeAmt(amount);
    return currency === "GHS" ? n / fx() : n;
  }
  function planEntry(plan, id) {
    var e = plan[id];
    return {
      status: e && STATUSES.indexOf(e.status) >= 0 ? e.status : "todo",
      note: e && typeof e.note === "string" ? e.note : ""
    };
  }

  /* ============ render ============ */
  function render() {
    if (!panel) return;
    var accounts = Store.getArray("accounts");
    var goals = Store.getArray("goals");
    var bills = Store.getArray("bills");
    var plan = Store.getPlan();

    /* metrics */
    var assets = 0, debts = 0, cash = 0;
    accounts.forEach(function (a) {
      var usd = toUSD(a.balance, a.currency);
      if (a.isDebt) debts += usd;
      else {
        assets += usd;
        if (a.type === "checking" || a.type === "savings" || a.type === "cash") cash += usd;
      }
    });
    var net = U.roundMoney(assets - debts);

    var done = PLAN.PLAN_STEPS.filter(function (s) {
      return planEntry(plan, s.id).status === "done";
    }).length;
    var pct = PLAN.TOTAL ? Math.round((done / PLAN.TOTAL) * 100) : 0;

    /* upcoming bills (next 30 days, incl. overdue) */
    var upcoming = bills.map(function (b) {
      return { bill: b, due: Store.getNextDueDate(b) };
    }).filter(function (x) {
      if (!x.due) return false;
      var d = U.daysUntil(x.due);
      return d !== null && d <= 30;
    }).sort(function (x, y) { return x.due < y.due ? -1 : x.due > y.due ? 1 : 0; });

    var nextBill = upcoming.length ? upcoming[0] : null;

    /* nearest goal by target date */
    var datedGoals = goals.filter(function (g) { return g.targetDate; })
      .sort(function (a, b) { return a.targetDate < b.targetDate ? -1 : 1; });
    var nearestGoal = datedGoals.length ? datedGoals[0] : (goals.length ? goals[0] : null);

    var r = firstPaint ? " rise" : "";
    firstPaint = false;

    var html = '<div class="grid-col">';
    html += '<div class="hero' + r + '">' +
      '<p class="eyebrow">Overview</p>' +
      '<h1>Where things <em>stand</em>.</h1>' +
      '<p class="hero-sub">Your plan and your money, side by side — with your next moves up top.</p>' +
    '</div>';

    /* KPI tiles */
    html += '<div class="kpi-grid' + r + '">' +
      kpi("Net worth", U.fmtMoney(net, "USD"), accounts.length + " accounts") +
      kpi("Cash on hand", U.fmtMoney(cash, "USD"), "checking + savings") +
      kpi("Plan progress", pct + "%", done + " of " + PLAN.TOTAL + " steps") +
      kpi("Next bill",
        nextBill ? U.fmtMoney(nextBill.bill.amount, nextBill.bill.currency) : "—",
        nextBill ? U.escapeHTML(nextBill.bill.name) + " · " + U.relativeDue(nextBill.due) : "none in 30 days") +
      kpi("Nearest goal",
        nearestGoal ? U.escapeHTML(nearestGoal.name) : "—",
        nearestGoal ? goalProgressLabel(nearestGoal) : "set one in Tracker") +
    '</div>';

    /* next 3 actions */
    var pending = PLAN.PLAN_STEPS.filter(function (s) {
      return planEntry(plan, s.id).status !== "done";
    }).slice(0, 3);

    html += '<div class="card' + r + '" style="margin-top:20px">' +
      '<div class="section-head"><h2>Your next moves</h2>' +
      '<button class="btn btn-ghost btn-sm" data-action="go-plan">Open the plan</button></div>';
    if (!pending.length) {
      html += '<div class="empty"><div class="emoji">🎉</div>' +
        '<p>Every plan step is done. Beautifully handled.</p></div>';
    } else {
      html += '<ul class="next-list">';
      pending.forEach(function (s) {
        var st = planEntry(plan, s.id).status;
        var tag = st === "in-progress"
          ? ' <span class="badge badge-doing">In progress</span>' : '';
        html += '<li><span class="next-num">' + s.id.replace(/^s/, "") + '</span>' +
          '<span>' + U.escapeHTML(s.title) + tag + '</span></li>';
      });
      html += '</ul>';
    }
    html += '</div>';

    /* upcoming bills */
    html += '<div class="card' + r + '" style="margin-top:20px">' +
      '<div class="section-head"><h2>Bills in the next 30 days</h2></div>';
    if (!upcoming.length) {
      html += '<div class="empty"><div class="emoji">📭</div>' +
        '<p>Nothing due in the next 30 days.</p></div>';
    } else {
      upcoming.forEach(function (x) {
        var days = U.daysUntil(x.due);
        var dotCls = "bill-dot", rowCls = "bill-row";
        if (days < 0) { dotCls += " overdue"; rowCls += " overdue"; }
        else if (days <= 7) dotCls += " soon";
        html += '<div class="' + rowCls + '">' +
          '<span class="' + dotCls + '"></span>' +
          '<div class="bill-main"><span class="ri-name">' + U.escapeHTML(x.bill.name) +
            '</span><p class="bill-due">' + U.escapeHTML(U.relativeDue(x.due)) + '</p></div>' +
          '<span class="ri-amount tnum">' +
            U.fmtMoney(x.bill.amount, x.bill.currency) + '</span></div>';
      });
    }
    html += '</div>';

    /* data tools */
    html += '<div class="card' + r + '" style="margin-top:20px">' +
      '<div class="section-head"><h2>Your data</h2></div>' +
      '<p class="ri-meta" style="margin-bottom:14px">Everything lives only in this browser. ' +
        'Back it up regularly — clearing browser data will erase it.</p>' +
      '<div class="form-actions">' +
        '<button class="btn btn-primary btn-sm" data-action="export">Export backup</button>' +
        '<button class="btn btn-ghost btn-sm" data-action="import">Import backup</button>' +
        '<button class="btn btn-ghost btn-sm" data-action="load-sample">Load sample data</button>' +
        '<button class="btn btn-danger btn-sm" data-action="clear">Erase all data</button>' +
      '</div>' +
      '<input type="file" id="import-file" accept="application/json,.json" hidden />' +
    '</div>';

    html += '<footer class="disclaimer">Educational tool — not financial, tax, or ' +
      'immigration advice. No data ever leaves your device.</footer>';
    html += '</div>';

    panel.innerHTML = html;
  }

  function kpi(label, value, sub) {
    return '<div class="kpi"><p class="eyebrow">' + U.escapeHTML(label) + '</p>' +
      '<div class="kpi-value">' + value + '</div>' +
      '<p class="kpi-sub">' + sub + '</p></div>';
  }
  function goalProgressLabel(g) {
    var target = U.safeAmt(g.target);
    var pct = target > 0 ? Math.round((U.safeAmt(g.current) / target) * 100) : 0;
    return pct + "% funded" + (g.targetDate ? " · " + U.fmtDate(g.targetDate) : "");
  }

  /* ============ data tools ============ */
  function exportBackup() {
    try {
      var blob = new Blob([JSON.stringify(Store.makeBackupFile(), null, 2)],
        { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "post-grad-finance-backup-" + U.todayISO() + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      U.showToast("Backup downloaded.");
    } catch (e) {
      U.showToast("Couldn't export backup.", true);
    }
  }

  function importBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try { parsed = JSON.parse(reader.result); }
      catch (e) { U.showToast("That file isn't valid JSON.", true); return; }
      var result = Store.importBackup(parsed);
      if (result.ok) {
        U.showToast("Backup restored.");
        var savedTheme = Store.getTheme();
        if (savedTheme) {
          document.documentElement.setAttribute("data-theme", savedTheme);
        }
        render();
        if (global.App) App.refresh();
      } else {
        U.showToast(result.error, true);
      }
    };
    reader.onerror = function () { U.showToast("Couldn't read that file.", true); };
    reader.readAsText(file);
  }

  /* ============ events ============ */
  function init() {
    panel = document.getElementById("panel-overview");
    if (!panel) return;

    panel.addEventListener("click", function (e) {
      var t = e.target.closest("[data-action]");
      if (!t) return;
      switch (t.dataset.action) {
        case "go-plan":
          if (global.App) App.go("UIPlan");
          break;
        case "export":
          exportBackup();
          break;
        case "import":
          var fi = document.getElementById("import-file");
          if (fi) fi.click();
          break;
        case "load-sample":
          if (global.confirm("Load sample data? This replaces your current accounts, " +
              "goals, bills, and plan progress.")) {
            Sample.loadSampleData(true);
            U.showToast("Sample data loaded.");
            render();
            if (global.App) App.refresh();
          }
          break;
        case "clear":
          if (global.confirm("Erase ALL data — accounts, goals, bills, and plan progress? " +
              "This cannot be undone. Export a backup first if unsure.")) {
            Store.clearAll();
            U.showToast("All data erased.");
            render();
            if (global.App) App.refresh();
          }
          break;
      }
    });

    panel.addEventListener("change", function (e) {
      if (e.target.id === "import-file" && e.target.files && e.target.files[0]) {
        importBackup(e.target.files[0]);
        e.target.value = "";
      }
    });
  }

  global.UIOverview = { init: init, render: render };
})(window);
