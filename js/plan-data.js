/* plan-data.js — canonical content of the Financial Reset action plan.
   The user's progress (status/notes) is stored separately in pgf_plan,
   keyed by step id, so wording here can change with no data migration. */
(function (global) {
  "use strict";

  var PHASES = [
    {
      id: "p1",
      label: "Phase 01",
      title: "First 30 Days",
      titleEm: "Land Safely",
      desc: "Settle the essentials before anything compounds — paperwork, banking, your first paycheck."
    },
    {
      id: "p2",
      label: "Phase 02",
      title: "First 90 Days",
      titleEm: "Build the Base",
      desc: "Credit, a budget, taxes, and insurance — the foundation everything else rests on."
    },
    {
      id: "p3",
      label: "Phase 03",
      title: "Ongoing",
      titleEm: "Grow & Protect",
      desc: "Habits that quietly build wealth and keep your past — and your future — covered."
    }
  ];

  /* Each step: id, phase, title, why, actions[], tags[].
     verify = optional line reminding the user who to double-check with. */
  var PLAN_STEPS = [
    {
      id: "s01", phase: "p1",
      title: "Confirm your work authorization paperwork is in order",
      why: "Everything that follows — payroll, banking, credit — depends on a clean status record. Small gaps now become big problems later.",
      actions: [
        "Locate your EAD card and your I-20 with the OPT recommendation.",
        "Confirm your employment starts within the 90-day OPT unemployment limit.",
        "Report your employer in the SEVP Portal and tell your school's DSO.",
        "File your I-901 SEVIS receipt and I-20 somewhere you won't lose them."
      ],
      tags: ["immigration", "OPT"],
      verify: "Confirm details with your school's DSO and uscis.gov."
    },
    {
      id: "s02", phase: "p1",
      title: "Right-size your bank accounts",
      why: "Student accounts often carry fees, minimums, or limits that no longer fit a salaried worker. Clean this up before direct deposit starts.",
      actions: [
        "Keep one primary checking account and one high-yield savings account.",
        "Close or downgrade student accounts you no longer need.",
        "Turn off overdraft opt-in so a mistake can't snowball into fees.",
        "Check whether a student fee waiver is about to expire."
      ],
      tags: ["banking"]
    },
    {
      id: "s03", phase: "p1",
      title: "Set up payroll and verify your first paycheck",
      why: "Withholding errors are easiest to catch on the very first pay stub — and OPT workers have specific nuances that show up there.",
      actions: [
        "Complete Form W-4 with HR; make sure your name and SSN match your Social Security card.",
        "Set up direct deposit into your primary checking account.",
        "Read your first pay stub line by line — gross, taxes, deductions, net.",
        "Check whether FICA (Social Security + Medicare) is being withheld — see the tax step."
      ],
      tags: ["income", "payroll"],
      verify: "Ask your HR/payroll team to walk through anything unclear."
    },
    {
      id: "s04", phase: "p1",
      title: "Start a starter emergency fund",
      why: "A small cash buffer is what keeps a surprise expense from becoming credit-card debt. Start it before you start spending.",
      actions: [
        "Set an initial target of one month of essential expenses.",
        "Create a savings goal for it in the Tracker tab.",
        "Automate a transfer into savings every payday — even a small one.",
        "Keep this money in high-yield savings, separate from spending money."
      ],
      tags: ["savings"]
    },
    {
      id: "s05", phase: "p1",
      title: "Enroll in employer benefits before the window closes",
      why: "New-hire benefit windows are short — often 30 days — and easy to miss. Missing one can cost you a full year of coverage.",
      actions: [
        "Read the benefits packet the day you get it.",
        "Enroll in health insurance and note the coverage start date.",
        "Write down your 401(k) eligibility date and the employer match formula.",
        "Decide on dental, vision, life, disability, and any HSA/FSA options."
      ],
      tags: ["benefits"],
      verify: "Confirm deadlines and the match formula with HR."
    },
    {
      id: "s06", phase: "p2",
      title: "Start building your US credit",
      why: "Your US credit history barely exists yet. Building it early unlocks housing, cars, and far lower interest rates down the road.",
      actions: [
        "Apply for one starter or secured credit card.",
        "Set autopay for the full statement balance — never carry a balance.",
        "Keep utilization low: under 30%, ideally under 10%.",
        "Check your free credit reports at annualcreditreport.com."
      ],
      tags: ["credit"]
    },
    {
      id: "s07", phase: "p2",
      title: "Create a working monthly budget",
      why: "A salary feels large until fixed costs, savings, and taxes are subtracted. A budget turns a vague number into a real plan.",
      actions: [
        "Start from your take-home pay, not your gross salary.",
        "List every fixed bill and subscription in the Tracker.",
        "Pick a simple split you can live with — for example needs / wants / savings.",
        "Review it once a month and adjust."
      ],
      tags: ["budget"]
    },
    {
      id: "s08", phase: "p2",
      title: "Understand your US tax situation as an OPT worker",
      why: "Many OPT workers are nonresident aliens who file Form 1040-NR and may be exempt from FICA. Getting this wrong costs real money.",
      actions: [
        "Check your residency status using the Substantial Presence Test (F-1 students are usually exempt for their first 5 calendar years).",
        "If FICA was withheld in error, ask your employer to refund it, or file IRS Form 843.",
        "Plan to file Form 1040-NR and keep your W-2 and any 1042-S.",
        "Set aside money for any tax you may owe."
      ],
      tags: ["taxes"],
      verify: "This is not tax advice — confirm with a tax professional who knows nonresident filing."
    },
    {
      id: "s09", phase: "p2",
      title: "Capture your immigration and funding paper trail",
      why: "Future filings — taxes, H-1B, a green card, Ghana matters — all reference these documents. Find them once, back them up forever.",
      actions: [
        "Scan your EAD, I-20s, I-901 receipt, and Flywire tuition receipts.",
        "Scan your W-2, any 1042-S, and prior 1040-NR returns.",
        "Scan your GetFund / scholarship award letters.",
        "Store copies in two secure places and note key reference numbers."
      ],
      tags: ["documents"]
    },
    {
      id: "s10", phase: "p2",
      title: "Right-size your insurance",
      why: "Student health plans end when school does. A coverage gap is a small risk with a very large downside.",
      actions: [
        "Confirm your employer health coverage start date and any gap from the student plan.",
        "Consider renters insurance — it is usually inexpensive.",
        "Review auto insurance if you drive.",
        "Check whether employer life and disability cover is enough for now."
      ],
      tags: ["insurance"]
    },
    {
      id: "s11", phase: "p3",
      title: "Grow your emergency fund to 3–6 months",
      why: "One month covers small shocks. Three to six months covers job loss — which matters even more given the OPT 90-day unemployment limit.",
      actions: [
        "Raise the target on your emergency-fund savings goal.",
        "Keep automating payday transfers until you reach it.",
        "Count only liquid cash toward this — not investments.",
        "Once it's full, redirect that automated transfer to investing."
      ],
      tags: ["savings"]
    },
    {
      id: "s12", phase: "p3",
      title: "Capture the full 401(k) employer match",
      why: "An unmatched contribution leaves guaranteed money on the table — it is the closest thing to free money you will find.",
      actions: [
        "Once eligible, contribute at least enough to get the full match.",
        "Pick a low-cost, diversified default fund if you're unsure.",
        "Understand your vesting schedule.",
        "Raise your contribution rate a little after each pay rise."
      ],
      tags: ["investing", "retirement"]
    },
    {
      id: "s13", phase: "p3",
      title: "Handle your student-funding and GetFund obligations",
      why: "Some education funding carries post-study service or repayment conditions that are easy to forget once you've left campus.",
      actions: [
        "Re-read your GetFund / scholarship terms for any bonding, service, or repayment clause.",
        "Note every deadline and the right contact person.",
        "Set a reminder bill or note in the Tracker so it doesn't slip.",
        "Keep the award letters with your document paper trail."
      ],
      tags: ["education funding"],
      verify: "Confirm the exact terms directly with the funding body."
    },
    {
      id: "s14", phase: "p3",
      title: "Keep your SSNIT pension on track and set long-term goals",
      why: "Ghana pension contributions can quietly lapse while you work abroad, and long-term goals only happen once they have a date.",
      actions: [
        "Check your SSNIT statement and your current contribution status.",
        "Learn the options for contributing or preserving your record while abroad.",
        "Keep MTN Mobile Money active for any Ghana-side payments.",
        "Set one to three dated savings goals — a relocation buffer, a trip home, future legal fees."
      ],
      tags: ["Ghana", "retirement"],
      verify: "Confirm contribution options with SSNIT directly."
    }
  ];

  global.PLAN = { PHASES: PHASES, PLAN_STEPS: PLAN_STEPS, TOTAL: PLAN_STEPS.length };
})(window);
