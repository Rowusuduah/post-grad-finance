/* ui-plan.js — the Action Plan tab. Depends on U, Store, PLAN. */
(function (global) {
  "use strict";

  var STATUSES = ["todo", "in-progress", "done"];
  var panel;
  var filterPhase = "all";
  var filterStatus = "all";
  var celebrated = {};        /* phase id -> true once its banner has fired */
  var seededCelebrated = false;
  var openSteps = {};         /* step id -> true while its detail body is expanded */
  var firstPaint = true;      /* entrance animation only on the first render */

  /* ---- plan-state helpers ---- */
  function entryFor(plan, id) {
    var e = plan[id];
    if (!e || typeof e !== "object") return { status: "todo", note: "" };
    return {
      status: STATUSES.indexOf(e.status) >= 0 ? e.status : "todo",
      note: typeof e.note === "string" ? e.note : ""
    };
  }
  function stepsInPhase(phaseId) {
    return PLAN.PLAN_STEPS.filter(function (s) { return s.phase === phaseId; });
  }
  function doneCount(plan, steps) {
    return steps.filter(function (s) { return entryFor(plan, s.id).status === "done"; }).length;
  }

  /* ---- greeting changes with progress ---- */
  function greeting(pct) {
    if (pct >= 100) return { eyebrow: "Chapter complete", title: "You did <em>it</em>.",
      sub: "Every step checked off. Keep the habits going — revisit the ongoing steps anytime." };
    if (pct >= 60) return { eyebrow: "Your financial reset", title: "Building <em>momentum</em>.",
      sub: "You're well past the hard part. Finish strong." };
    if (pct >= 25) return { eyebrow: "Your financial reset", title: "Finding your <em>footing</em>.",
      sub: "The foundation is taking shape. One step at a time." };
    if (pct > 0) return { eyebrow: "Your financial reset", title: "A fresh <em>start</em>.",
      sub: "You've begun. Each step below tells you exactly what to do next." };
    return { eyebrow: "Your financial reset", title: "School's done. <em>Now what?</em>",
      sub: "This is your step-by-step plan for getting your money in order. Start at the top." };
  }

  /* ============ render ============ */
  function render() {
    if (!panel) return;
    var plan = Store.getPlan();
    var total = PLAN.TOTAL;
    var done = doneCount(plan, PLAN.PLAN_STEPS);
    var pct = total ? Math.round((done / total) * 100) : 0;
    var g = greeting(pct);

    if (!seededCelebrated) {
      PLAN.PHASES.forEach(function (ph) {
        var steps = stepsInPhase(ph.id);
        if (steps.length && doneCount(plan, steps) === steps.length) celebrated[ph.id] = true;
      });
      seededCelebrated = true;
    }

    var r = firstPaint ? " rise" : "";
    firstPaint = false;

    var html = '<div class="read-col">';

    /* hero */
    html += '<div class="hero' + r + '">' +
      '<p class="eyebrow">' + U.escapeHTML(g.eyebrow) + '</p>' +
      '<h1>' + g.title + '</h1>' +
      '<p class="hero-sub">' + g.sub + '</p>' +
    '</div>';

    /* progress panel with one segment per phase */
    html += '<div class="card progress-panel' + r + '">' +
      '<div class="progress-stat"><span class="pct">' + pct + '%</span> of your reset complete</div>' +
      '<p class="progress-line">' + done + ' of ' + total + ' steps done</p>' +
      '<div class="seg-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" ' +
        'aria-valuenow="' + pct + '" aria-label="Overall plan progress">';
    PLAN.PHASES.forEach(function (ph) {
      var steps = stepsInPhase(ph.id);
      var d = doneCount(plan, steps);
      var w = steps.length ? Math.round((d / steps.length) * 100) : 0;
      var full = w === 100 ? " full" : "";
      html += '<span class="seg"><span class="seg-fill' + full + '" style="width:' + w + '%"></span></span>';
    });
    html += '</div></div>';

    /* filters */
    html += '<div class="card' + r + '" style="margin-top:20px">' +
      '<p class="eyebrow" style="margin-bottom:10px">Filter</p>' +
      '<div class="chip-row" data-filter="phase">' +
        chip("phase", "all", "All phases", filterPhase);
    PLAN.PHASES.forEach(function (ph) {
      html += chip("phase", ph.id, ph.title, filterPhase);
    });
    html += '</div><div class="chip-row" data-filter="status" style="margin-top:10px">' +
        chip("status", "all", "All", filterStatus) +
        chip("status", "todo", "To do", filterStatus) +
        chip("status", "in-progress", "In progress", filterStatus) +
        chip("status", "done", "Done", filterStatus) +
      '</div></div>';

    /* current step = first not-done in plan order */
    var currentId = null;
    for (var i = 0; i < PLAN.PLAN_STEPS.length; i++) {
      if (entryFor(plan, PLAN.PLAN_STEPS[i].id).status !== "done") {
        currentId = PLAN.PLAN_STEPS[i].id;
        break;
      }
    }

    /* phases + steps */
    var anyShown = false;
    PLAN.PHASES.forEach(function (ph) {
      if (filterPhase !== "all" && filterPhase !== ph.id) return;
      var steps = stepsInPhase(ph.id);
      var visible = steps.filter(function (s) {
        return filterStatus === "all" || entryFor(plan, s.id).status === filterStatus;
      });
      if (!visible.length) return;
      anyShown = true;
      var d = doneCount(plan, steps);

      html += '<section class="phase">' +
        '<div class="phase-head">' +
          '<p class="eyebrow">' + U.escapeHTML(ph.label) + '</p>' +
          '<h2>' + U.escapeHTML(ph.title) + ' · <em>' + U.escapeHTML(ph.titleEm) + '</em></h2>' +
          '<p class="phase-desc">' + U.escapeHTML(ph.desc) + '</p>' +
          '<p class="phase-meter">' + d + ' of ' + steps.length + ' done</p>' +
        '</div><div class="journey">';

      visible.forEach(function (s) {
        html += stepCard(s, entryFor(plan, s.id), s.id === currentId);
      });
      html += '</div>';

      /* milestone banner when the whole phase is complete */
      if (steps.length && d === steps.length && filterStatus === "all") {
        html += '<div class="milestone" role="status">' +
          '<p>' + U.escapeHTML(ph.title) + ' — complete.</p>' +
          '<p class="stamp">Nicely done. On to the next chapter.</p>' +
        '</div>';
      }
      html += '</section>';
    });

    if (!anyShown) {
      html += '<div class="empty"><div class="emoji">🔍</div>' +
        '<p>No steps match this filter.</p></div>';
    }

    /* reset + disclaimer */
    html += '<div style="margin-top:32px;text-align:center">' +
      '<button class="btn btn-danger btn-sm" data-action="reset-plan">Reset all progress</button>' +
    '</div>';
    html += '</div>'; /* /read-col */

    html += '<footer class="disclaimer">' +
      '<strong>A note:</strong> This checklist is educational and is not financial, tax, ' +
      'or immigration advice. Every situation is different — verify specifics with your ' +
      'HR department, a qualified tax professional, your school’s DSO, and official ' +
      'sources (USCIS, IRS, SSNIT, GetFund) before acting.' +
    '</footer>';

    panel.innerHTML = html;

    /* fire confetti for any phase newly completed since last render */
    PLAN.PHASES.forEach(function (ph) {
      var steps = stepsInPhase(ph.id);
      var complete = steps.length && doneCount(plan, steps) === steps.length;
      if (complete && !celebrated[ph.id]) {
        celebrated[ph.id] = true;
        burstConfetti();
      } else if (!complete) {
        celebrated[ph.id] = false;
      }
    });
  }

  function chip(group, value, label, active) {
    return '<button class="chip" data-chip-group="' + group + '" data-chip-value="' +
      U.escapeHTML(value) + '" aria-pressed="' + (active === value) + '">' +
      U.escapeHTML(label) + '</button>';
  }

  function stepCard(step, entry, isCurrent) {
    var num = step.id.replace(/^s/, "");
    var cls = "step";
    if (entry.status === "done") cls += " is-done";
    else if (entry.status === "in-progress") cls += " is-doing";
    if (isCurrent && entry.status !== "done") cls += " is-current";
    var isOpen = !!openSteps[step.id];
    if (isOpen) cls += " is-open";

    var badge = entry.status === "done"
      ? '<span class="badge badge-done">Done</span>'
      : entry.status === "in-progress"
      ? '<span class="badge badge-doing">In progress</span>'
      : '<span class="badge badge-todo">To do</span>';

    var medLabel = "Mark step " + num + " — currently " + entry.status.replace("-", " ");
    var actions = step.actions.map(function (a) {
      return '<li>' + U.escapeHTML(a) + '</li>';
    }).join("");
    var verify = step.verify
      ? '<p class="step-why" style="margin-top:10px"><em>' + U.escapeHTML(step.verify) + '</em></p>'
      : "";

    return '<article class="' + cls + '" data-step="' + U.escapeHTML(step.id) + '">' +
      '<button class="medallion" data-action="cycle" data-step="' + U.escapeHTML(step.id) +
        '" aria-label="' + U.escapeHTML(medLabel) + '">✓</button>' +
      '<div class="step-top">' +
        (isCurrent && entry.status !== "done"
          ? '<span class="eyebrow step-startflag">Start here</span>' : '') +
        '<span class="step-title"><span class="step-num">' + num + '. </span>' +
          U.escapeHTML(step.title) + '</span>' +
        badge +
      '</div>' +
      '<p class="step-why">' + U.escapeHTML(step.why) + '</p>' +
      '<button class="step-toggle" data-action="toggle-body" data-step="' +
        U.escapeHTML(step.id) + '" aria-expanded="' + (isOpen ? "true" : "false") + '">' +
        (isOpen ? "Hide details ↑" : "What to do →") + '</button>' +
      '<div class="step-body">' +
        '<h4>Concrete actions</h4>' +
        '<ul class="step-actions">' + actions + '</ul>' +
        verify +
        '<div class="step-statusrow">' +
          statusBtn(step.id, "todo", "To do", entry.status) +
          statusBtn(step.id, "in-progress", "In progress", entry.status) +
          statusBtn(step.id, "done", "Done", entry.status) +
        '</div>' +
        '<div class="step-note field">' +
          '<label for="note-' + U.escapeHTML(step.id) + '">Your notes</label>' +
          '<textarea id="note-' + U.escapeHTML(step.id) + '" data-note="' +
            U.escapeHTML(step.id) + '" placeholder="Add a note, a date, a contact…">' +
            U.escapeHTML(entry.note) + '</textarea>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function statusBtn(stepId, value, label, current) {
    return '<button class="chip" data-action="set-status" data-step="' +
      U.escapeHTML(stepId) + '" data-status="' + value + '" aria-pressed="' +
      (current === value) + '">' + U.escapeHTML(label) + '</button>';
  }

  /* ============ mutations ============ */
  function updateStep(stepId, patch) {
    var plan = Store.getPlan();
    var cur = entryFor(plan, stepId);
    var next = { status: cur.status, note: cur.note };
    for (var k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) next[k] = patch[k];
    }
    next.updatedAt = new Date().toISOString();
    plan[stepId] = next;
    Store.setPlan(plan);
  }

  function cycleStatus(stepId) {
    var cur = entryFor(Store.getPlan(), stepId).status;
    var idx = STATUSES.indexOf(cur);
    updateStep(stepId, { status: STATUSES[(idx + 1) % STATUSES.length] });
    render();
  }

  /* ============ confetti ============ */
  function burstConfetti() {
    if (global.matchMedia &&
        global.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var colors = ["#E0613A", "#5E7D5A", "#C44D2A", "#A8721A"];
    for (var i = 0; i < 14; i++) {
      (function (i) {
        var p = document.createElement("div");
        p.className = "confetti-piece";
        p.style.left = (15 + Math.random() * 70) + "vw";
        p.style.top = "-20px";
        p.style.background = colors[i % colors.length];
        p.style.borderRadius = i % 2 ? "50%" : "2px";
        document.body.appendChild(p);
        var dur = 900 + Math.random() * 700;
        p.animate(
          [
            { transform: "translateY(0) rotate(0deg)", opacity: 1 },
            { transform: "translateY(70vh) rotate(" + (360 + Math.random() * 360) +
              "deg)", opacity: 0 }
          ],
          { duration: dur, easing: "cubic-bezier(0.2,0,0.4,1)", delay: i * 35 }
        ).onfinish = function () { p.remove(); };
      })(i);
    }
  }

  /* ============ events ============ */
  var saveNote = U.debounce(function (stepId, value) {
    updateStep(stepId, { note: value });
  }, 400);

  function init() {
    panel = document.getElementById("panel-plan");
    if (!panel) return;

    panel.addEventListener("click", function (e) {
      var t = e.target.closest("[data-action], [data-chip-group]");
      if (!t) return;

      if (t.dataset.chipGroup) {
        if (t.dataset.chipGroup === "phase") filterPhase = t.dataset.chipValue;
        else filterStatus = t.dataset.chipValue;
        render();
        return;
      }
      var action = t.dataset.action;
      if (action === "cycle") {
        cycleStatus(t.dataset.step);
      } else if (action === "set-status") {
        updateStep(t.dataset.step, { status: t.dataset.status });
        render();
      } else if (action === "toggle-body") {
        var card = t.closest(".step");
        var sid = t.dataset.step;
        if (card && sid) {
          var open = card.classList.toggle("is-open");
          if (open) openSteps[sid] = true; else delete openSteps[sid];
          t.setAttribute("aria-expanded", open ? "true" : "false");
          t.textContent = open ? "Hide details ↑" : "What to do →";
        }
      } else if (action === "reset-plan") {
        if (global.confirm("Reset progress on all 14 steps? Your tracker data is not affected.")) {
          Store.snapshot();
          Store.setPlan({});
          celebrated = {};
          seededCelebrated = false;
          U.showToast("Plan progress reset.");
          render();
        }
      }
    });

    panel.addEventListener("input", function (e) {
      var ta = e.target.closest("[data-note]");
      if (ta) saveNote(ta.dataset.note, ta.value);
    });
  }

  global.UIPlan = { init: init, render: render };
})(window);
