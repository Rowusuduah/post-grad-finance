/* ui-tracker.js — the Tracker tab: net worth, accounts, goals, bills.
   Depends on U, Store. */
(function (global) {
  "use strict";

  var panel;
  var editing = { account: null, goal: null, bill: null };
  var firstPaint = true;
  var animClass = "";   /* " rise" on first render, "" afterwards */

  var ACCOUNT_TYPES = ["checking", "savings", "credit", "cash", "investment", "pension", "other"];
  var FREQUENCIES = ["monthly", "biweekly", "weekly", "once"];

  /* ---- shared helpers ---- */
  function fx() { return Store.getSettings().fxRateGhsPerUsd; }
  function toUSD(amount, currency) {
    var n = U.safeAmt(amount);
    return currency === "GHS" ? n / fx() : n;
  }
  function byId(arr, id) {
    for (var i = 0; i < arr.length; i++) { if (arr[i].id === id) return arr[i]; }
    return null;
  }

  /* ============ render ============ */
  function render() {
    if (!panel) return;
    var accounts = Store.getArray("accounts");
    var goals = Store.getArray("goals");
    var bills = Store.getArray("bills");

    animClass = firstPaint ? " rise" : "";
    firstPaint = false;

    var html = '<div class="grid-col">';
    html += '<div class="hero' + animClass + '">' +
      '<p class="eyebrow">Your accounts</p>' +
      '<h1>Keep it all in <em>check</em>.</h1>' +
      '<p class="hero-sub">A private snapshot of where your money stands. ' +
      'Everything here is stored only on this device.</p>' +
    '</div>';

    html += netWorthCard(accounts);
    html += accountsSection(accounts);
    html += goalsSection(goals, accounts);
    html += billsSection(bills);
    html += '</div>';

    panel.innerHTML = html;
    countUp();
  }

  /* gentle count-up on the net-worth figure */
  function countUp() {
    var el = panel.querySelector("[data-countup]");
    if (!el) return;
    var target = U.safeAmt(el.getAttribute("data-countup"));
    if (global.matchMedia &&
        global.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var start = performance.now(), dur = 600;
    function frame(now) {
      var t = U.clamp((now - start) / dur, 0, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = U.fmtMoney(target * eased, "USD");
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = U.fmtMoney(target, "USD");
    }
    requestAnimationFrame(frame);
  }

  /* ---------- net worth ---------- */
  function netWorthCard(accounts) {
    var assets = 0, debts = 0;
    accounts.forEach(function (a) {
      var usd = toUSD(a.balance, a.currency);
      if (a.isDebt) debts += usd; else assets += usd;
    });
    var net = U.roundMoney(assets - debts);
    var cls = net > 0 ? "delta-up" : net < 0 ? "delta-down" : "delta-flat";

    return '<div class="card networth-card' + animClass + '">' +
      '<p class="eyebrow">Estimated net worth</p>' +
      '<div class="networth-figure" data-countup="' + net + '">' +
        U.fmtMoney(net, "USD") + '</div>' +
      '<span class="delta-chip ' + cls + '">' +
        U.fmtMoney(assets, "USD") + ' assets · ' + U.fmtMoney(debts, "USD") + ' debt</span>' +
      '<div class="form-grid" style="margin-top:18px;max-width:320px">' +
        '<div class="field">' +
          '<label for="fx-rate">GHS per 1 USD (for conversion)</label>' +
          '<input type="number" id="fx-rate" min="0.01" step="0.01" inputmode="decimal" ' +
            'value="' + fx() + '" data-action="set-fx" />' +
        '</div>' +
      '</div>' +
      '<p class="ri-meta" style="margin-top:8px">Conversions are an estimate using the rate ' +
      'you set above — the app never fetches live rates.</p>' +
    '</div>';
  }

  /* ---------- accounts ---------- */
  function accountsSection(accounts) {
    var html = '<div class="card' + animClass + '" style="margin-top:20px">' +
      '<div class="section-head"><h2>Accounts &amp; balances</h2>' +
      '<button class="btn btn-ghost btn-sm" data-action="add-account">+ Add account</button></div>';

    if (!accounts.length) {
      html += emptyState("🏦", "No accounts yet. Add your checking, savings, cards, and pension.");
    } else {
      html += '<div class="list-grid">';
      accounts.forEach(function (a) {
        var amtCls = a.isDebt ? "ri-amount is-debt" : "ri-amount";
        html += '<div class="row-item">' +
          '<div class="ri-top">' +
            '<span class="ri-name">' + U.escapeHTML(a.name) + '</span>' +
            '<span class="' + amtCls + ' tnum">' +
              (a.isDebt ? "−" : "") + U.fmtMoney(a.balance, a.currency) + '</span>' +
          '</div>' +
          '<p class="ri-meta">' + U.escapeHTML(cap(a.type)) + ' · ' +
            U.escapeHTML(a.currency) + (a.isDebt ? ' · debt' : '') + '</p>' +
          (a.note ? '<p class="ri-note">' + U.escapeHTML(a.note) + '</p>' : '') +
          '<div class="ri-actions">' +
            '<button class="btn btn-ghost btn-sm" data-action="edit-account" data-id="' +
              U.escapeHTML(a.id) + '">Edit</button>' +
            '<button class="btn btn-danger btn-sm" data-action="del-account" data-id="' +
              U.escapeHTML(a.id) + '">Delete</button>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
    }
    html += accountForm();
    return html + '</div>';
  }

  function accountForm() {
    var a = editing.account ? byId(Store.getArray("accounts"), editing.account) : null;
    var isEdit = !!a;
    return '<form class="form-card" data-form="account" style="margin-top:18px;' +
      'border-top:1px solid var(--line);padding-top:18px">' +
      '<p class="eyebrow" style="margin-bottom:10px">' +
        (isEdit ? "Edit account" : "New account") + '</p>' +
      '<div class="form-grid">' +
        textField("acc-name", "Name", a ? a.name : "", "e.g. Chase Checking", true) +
        selectField("acc-type", "Type", ACCOUNT_TYPES, a ? a.type : "checking") +
        selectField("acc-currency", "Currency", ["USD", "GHS"], a ? a.currency : "USD") +
        numField("acc-balance", "Balance", a ? a.balance : "", "0.00") +
      '</div>' +
      '<label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-size:14px">' +
        '<input type="checkbox" id="acc-isdebt" style="width:auto" ' +
          (a && a.isDebt ? "checked" : "") + ' /> This is a debt (credit card, loan)</label>' +
      '<div class="field" style="margin-top:12px">' +
        '<label for="acc-note">Note (optional)</label>' +
        '<textarea id="acc-note" placeholder="Anything worth remembering">' +
          U.escapeHTML(a ? a.note : "") + '</textarea>' +
      '</div>' +
      '<div class="form-actions">' +
        '<button type="submit" class="btn btn-primary btn-sm">' +
          (isEdit ? "Save changes" : "Add account") + '</button>' +
        (isEdit ? '<button type="button" class="btn btn-ghost btn-sm" ' +
          'data-action="cancel-account">Cancel</button>' : '') +
      '</div></form>';
  }

  /* ---------- goals ---------- */
  function goalsSection(goals) {
    var html = '<div class="card' + animClass + '" style="margin-top:20px">' +
      '<div class="section-head"><h2>Savings goals</h2>' +
      '<button class="btn btn-ghost btn-sm" data-action="add-goal">+ Add goal</button></div>';

    if (!goals.length) {
      html += emptyState("🎯", "No goals yet. An emergency fund is a great first one.");
    } else {
      html += '<div class="list-grid">';
      goals.forEach(function (g) {
        var target = U.safeAmt(g.target), current = U.safeAmt(g.current);
        var pct = target > 0 ? U.clamp(Math.round((current / target) * 100), 0, 999) : 0;
        var over = pct > 100;
        var due = g.targetDate
          ? '<p class="ri-meta">Target ' + U.fmtDate(g.targetDate) + '</p>' : '';
        html += '<div class="row-item">' +
          '<div class="ri-top">' +
            '<span class="ri-name">' + U.escapeHTML(g.name) + '</span>' +
            '<span class="ri-amount tnum">' + pct + '%</span>' +
          '</div>' +
          '<div class="bar' + (over ? ' over' : '') + '">' +
            '<span style="width:' + U.clamp(pct, 0, 100) + '%"></span></div>' +
          '<p class="ri-meta">' + U.fmtMoney(current, g.currency) + ' of ' +
            U.fmtMoney(target, g.currency) + '</p>' + due +
          '<div class="ri-actions">' +
            '<button class="btn btn-ghost btn-sm" data-action="edit-goal" data-id="' +
              U.escapeHTML(g.id) + '">Edit</button>' +
            '<button class="btn btn-danger btn-sm" data-action="del-goal" data-id="' +
              U.escapeHTML(g.id) + '">Delete</button>' +
          '</div></div>';
      });
      html += '</div>';
    }
    html += goalForm();
    return html + '</div>';
  }

  function goalForm() {
    var g = editing.goal ? byId(Store.getArray("goals"), editing.goal) : null;
    var isEdit = !!g;
    return '<form class="form-card" data-form="goal" style="margin-top:18px;' +
      'border-top:1px solid var(--line);padding-top:18px">' +
      '<p class="eyebrow" style="margin-bottom:10px">' +
        (isEdit ? "Edit goal" : "New goal") + '</p>' +
      '<div class="form-grid">' +
        textField("goal-name", "Name", g ? g.name : "", "e.g. Emergency Fund", true) +
        selectField("goal-currency", "Currency", ["USD", "GHS"], g ? g.currency : "USD") +
        numField("goal-target", "Target amount", g ? g.target : "", "3000") +
        numField("goal-current", "Saved so far", g ? g.current : "", "0") +
        dateField("goal-date", "Target date (optional)", g ? g.targetDate : "") +
      '</div>' +
      '<div class="form-actions">' +
        '<button type="submit" class="btn btn-primary btn-sm">' +
          (isEdit ? "Save changes" : "Add goal") + '</button>' +
        (isEdit ? '<button type="button" class="btn btn-ghost btn-sm" ' +
          'data-action="cancel-goal">Cancel</button>' : '') +
      '</div></form>';
  }

  /* ---------- bills ---------- */
  function billsSection(bills) {
    var html = '<div class="card' + animClass + '" style="margin-top:20px">' +
      '<div class="section-head"><h2>Recurring bills</h2>' +
      '<button class="btn btn-ghost btn-sm" data-action="add-bill">+ Add bill</button></div>';

    if (!bills.length) {
      html += emptyState("📅", "No bills tracked yet. Add rent, phone, subscriptions.");
    } else {
      var withDue = bills.map(function (b) {
        return { bill: b, due: Store.getNextDueDate(b) };
      }).sort(function (x, y) {
        if (!x.due) return 1;
        if (!y.due) return -1;
        return x.due < y.due ? -1 : x.due > y.due ? 1 : 0;
      });
      withDue.forEach(function (item) {
        var b = item.bill, due = item.due;
        var days = due ? U.daysUntil(due) : null;
        var dotCls = "bill-dot", rowCls = "bill-row";
        if (days !== null && days < 0) { dotCls += " overdue"; rowCls += " overdue"; }
        else if (days !== null && days <= 7) dotCls += " soon";
        html += '<div class="' + rowCls + '">' +
          '<span class="' + dotCls + '"></span>' +
          '<div class="bill-main">' +
            '<span class="ri-name">' + U.escapeHTML(b.name) + '</span>' +
            '<p class="bill-due">' + U.escapeHTML(cap(b.frequency)) +
              (b.category ? ' · ' + U.escapeHTML(b.category) : '') +
              (due ? ' · ' + U.escapeHTML(U.relativeDue(due)) : '') + '</p>' +
          '</div>' +
          '<span class="ri-amount tnum">' + U.fmtMoney(b.amount, b.currency) + '</span>' +
          '<div class="ri-actions" style="margin-top:0">' +
            '<button class="btn btn-ghost btn-sm" data-action="edit-bill" data-id="' +
              U.escapeHTML(b.id) + '">Edit</button>' +
            '<button class="btn btn-danger btn-sm" data-action="del-bill" data-id="' +
              U.escapeHTML(b.id) + '">Delete</button>' +
          '</div></div>';
      });
    }
    html += billForm();
    return html + '</div>';
  }

  function billForm() {
    var b = editing.bill ? byId(Store.getArray("bills"), editing.bill) : null;
    var isEdit = !!b;
    return '<form class="form-card" data-form="bill" style="margin-top:18px;' +
      'border-top:1px solid var(--line);padding-top:18px">' +
      '<p class="eyebrow" style="margin-bottom:10px">' +
        (isEdit ? "Edit bill" : "New bill") + '</p>' +
      '<div class="form-grid">' +
        textField("bill-name", "Name", b ? b.name : "", "e.g. Rent", true) +
        numField("bill-amount", "Amount", b ? b.amount : "", "0.00") +
        selectField("bill-currency", "Currency", ["USD", "GHS"], b ? b.currency : "USD") +
        selectField("bill-freq", "Frequency", FREQUENCIES, b ? b.frequency : "monthly") +
        numField("bill-dom", "Day of month (monthly)", b ? b.dayOfMonth : "", "1") +
        dateField("bill-anchor", "Date (weekly/once)", b ? b.anchorDate : "") +
        textField("bill-category", "Category (optional)", b ? b.category : "", "Housing", false) +
      '</div>' +
      '<div class="form-actions">' +
        '<button type="submit" class="btn btn-primary btn-sm">' +
          (isEdit ? "Save changes" : "Add bill") + '</button>' +
        (isEdit ? '<button type="button" class="btn btn-ghost btn-sm" ' +
          'data-action="cancel-bill">Cancel</button>' : '') +
      '</div></form>';
  }

  /* ============ field builders ============ */
  function textField(id, label, val, ph, req) {
    return '<div class="field"><label for="' + id + '">' + U.escapeHTML(label) + '</label>' +
      '<input type="text" id="' + id + '" value="' + U.escapeHTML(val || "") +
      '" placeholder="' + U.escapeHTML(ph || "") + '" maxlength="80"' +
      (req ? " required" : "") + ' /></div>';
  }
  function numField(id, label, val, ph) {
    return '<div class="field"><label for="' + id + '">' + U.escapeHTML(label) + '</label>' +
      '<input type="number" id="' + id + '" value="' + (val === "" || val == null ? "" :
        U.escapeHTML(String(val))) + '" placeholder="' + U.escapeHTML(ph || "") +
      '" step="0.01" inputmode="decimal" /></div>';
  }
  function dateField(id, label, val) {
    return '<div class="field"><label for="' + id + '">' + U.escapeHTML(label) + '</label>' +
      '<input type="date" id="' + id + '" value="' + U.escapeHTML(val || "") + '" /></div>';
  }
  function selectField(id, label, options, selected) {
    var opts = options.map(function (o) {
      return '<option value="' + U.escapeHTML(o) + '"' +
        (o === selected ? " selected" : "") + '>' + U.escapeHTML(cap(o)) + '</option>';
    }).join("");
    return '<div class="field"><label for="' + id + '">' + U.escapeHTML(label) + '</label>' +
      '<select id="' + id + '">' + opts + '</select></div>';
  }
  function emptyState(emoji, text) {
    return '<div class="empty"><div class="emoji">' + emoji + '</div>' +
      '<p>' + U.escapeHTML(text) + '</p></div>';
  }
  function cap(s) {
    s = String(s || "");
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  /* ============ submit handlers ============ */
  function submitAccount() {
    var name = val("acc-name");
    if (!name) { U.showToast("Give the account a name.", true); return; }
    var accounts = Store.getArray("accounts");
    var rec = {
      name: name,
      type: val("acc-type") || "other",
      currency: val("acc-currency") === "GHS" ? "GHS" : "USD",
      balance: U.roundMoney(val("acc-balance")),
      isDebt: !!document.getElementById("acc-isdebt").checked,
      note: val("acc-note"),
      updatedAt: new Date().toISOString()
    };
    if (editing.account) {
      var ex = byId(accounts, editing.account);
      if (ex) { for (var k in rec) ex[k] = rec[k]; }
      editing.account = null;
      U.showToast("Account updated.");
    } else {
      rec.id = U.uid();
      rec.createdAt = rec.updatedAt;
      accounts.push(rec);
      U.showToast("Account added.");
    }
    Store.setArray("accounts", accounts);
    render();
  }

  function submitGoal() {
    var name = val("goal-name");
    if (!name) { U.showToast("Give the goal a name.", true); return; }
    var goals = Store.getArray("goals");
    var rec = {
      name: name,
      currency: val("goal-currency") === "GHS" ? "GHS" : "USD",
      target: U.roundMoney(val("goal-target")),
      current: U.roundMoney(val("goal-current")),
      targetDate: val("goal-date") || null,
      updatedAt: new Date().toISOString()
    };
    if (editing.goal) {
      var ex = byId(goals, editing.goal);
      if (ex) { for (var k in rec) ex[k] = rec[k]; }
      editing.goal = null;
      U.showToast("Goal updated.");
    } else {
      rec.id = U.uid();
      rec.createdAt = rec.updatedAt;
      goals.push(rec);
      U.showToast("Goal added.");
    }
    Store.setArray("goals", goals);
    render();
  }

  function submitBill() {
    var name = val("bill-name");
    if (!name) { U.showToast("Give the bill a name.", true); return; }
    var bills = Store.getArray("bills");
    var freq = val("bill-freq") || "monthly";
    var domRaw = val("bill-dom");
    var rec = {
      name: name,
      amount: U.roundMoney(val("bill-amount")),
      currency: val("bill-currency") === "GHS" ? "GHS" : "USD",
      frequency: freq,
      dayOfMonth: domRaw ? U.clamp(parseInt(domRaw, 10) || 1, 1, 31) : null,
      anchorDate: val("bill-anchor") || null,
      category: val("bill-category"),
      updatedAt: new Date().toISOString()
    };
    if ((freq === "weekly" || freq === "biweekly" || freq === "once") && !rec.anchorDate) {
      U.showToast("Pick a date for a " + freq + " bill.", true);
      return;
    }
    if (editing.bill) {
      var ex = byId(bills, editing.bill);
      if (ex) { for (var k in rec) ex[k] = rec[k]; }
      editing.bill = null;
      U.showToast("Bill updated.");
    } else {
      rec.id = U.uid();
      rec.createdAt = rec.updatedAt;
      bills.push(rec);
      U.showToast("Bill added.");
    }
    Store.setArray("bills", bills);
    render();
  }

  function removeFrom(name, id, label) {
    if (!global.confirm("Delete this " + label + "?")) return;
    var arr = Store.getArray(name).filter(function (x) { return x.id !== id; });
    Store.setArray(name, arr);
    U.showToast(cap(label) + " deleted.");
    render();
  }

  /* ============ events ============ */
  function init() {
    panel = document.getElementById("panel-tracker");
    if (!panel) return;

    panel.addEventListener("submit", function (e) {
      var form = e.target.closest("[data-form]");
      if (!form) return;
      e.preventDefault();
      if (form.dataset.form === "account") submitAccount();
      else if (form.dataset.form === "goal") submitGoal();
      else if (form.dataset.form === "bill") submitBill();
    });

    panel.addEventListener("click", function (e) {
      var t = e.target.closest("[data-action]");
      if (!t) return;
      var a = t.dataset.action, id = t.dataset.id;
      switch (a) {
        case "add-account": editing.account = null; render(); focusForm("account"); break;
        case "edit-account": editing.account = id; render(); focusForm("account"); break;
        case "cancel-account": editing.account = null; render(); break;
        case "del-account": removeFrom("accounts", id, "account"); break;
        case "add-goal": editing.goal = null; render(); focusForm("goal"); break;
        case "edit-goal": editing.goal = id; render(); focusForm("goal"); break;
        case "cancel-goal": editing.goal = null; render(); break;
        case "del-goal": removeFrom("goals", id, "goal"); break;
        case "add-bill": editing.bill = null; render(); focusForm("bill"); break;
        case "edit-bill": editing.bill = id; render(); focusForm("bill"); break;
        case "cancel-bill": editing.bill = null; render(); break;
        case "del-bill": removeFrom("bills", id, "bill"); break;
      }
    });

    panel.addEventListener("change", function (e) {
      if (e.target.id === "set-fx" || e.target.dataset.action === "set-fx") {
        var rate = U.safeAmt(e.target.value);
        if (rate > 0) {
          Store.setSettings({ fxRateGhsPerUsd: rate });
          U.showToast("Conversion rate updated.");
          render();
        }
      }
    });
  }

  function focusForm(which) {
    var form = panel.querySelector('[data-form="' + which + '"]');
    if (form) {
      var first = form.querySelector("input, select, textarea");
      if (first) first.focus();
      form.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  global.UITracker = { init: init, render: render };
})(window);
