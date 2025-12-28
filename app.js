/* ===========================
   Cele — lokalny tracker (v1.3)
   - 100% offline (localStorage)
   - Daily: odznaczane per dzień + cel roczny (target) -> % liczy się automatycznie
   - Task: checklista (podzadania bez dat) -> % = wykonane / wszystkie
   - Widoki: Dzisiaj / Cele / Taski
=========================== */

const LS_KEY = "goals_tracker_v1";
const GYM_LS_KEY = "gym_tracker_v1";
const DIET_LS_KEY = "diet_tracker_v1";
const APPEAR_LS_KEY = "walawka_bg_preset";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ======= UI modal (custom alert/confirm) ======= */
let __uiResolve = null;
let __uiMode = "alert"; // "alert" | "confirm"

function openUiModal({ title="Powiadomienie", message="", mode="alert" } = {}){
  const modal = $("#uiModal");
  if(!modal) return;
  __uiMode = mode;

  const t = $("#uiTitle");
  const msg = $("#uiMessage");
  if(t) t.textContent = title;
  if(msg) msg.textContent = message;

  // show/hide cancel depending on mode
  const cancel = $("#uiCancel");
  if(cancel) cancel.style.display = (mode === "confirm") ? "" : "none";

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden","false");

  // focus OK for quick action
  $("#uiOk")?.focus();
}

function closeUiModal(){
  const modal = $("#uiModal");
  if(!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden","true");
}

function uiAlert(message, title="Powiadomienie"){
  return new Promise((resolve) => {
    __uiResolve = () => resolve(true);
    openUiModal({ title, message, mode: "alert" });
  });
}

function uiConfirm(message, title="Potwierdź"){
  return new Promise((resolve) => {
    __uiResolve = (val) => resolve(Boolean(val));
    openUiModal({ title, message, mode: "confirm" });
  });
}

function bindUiModal(){
  // allow calling even if modal not present
  $("#uiBackdrop")?.addEventListener("click", () => {
    // click outside behaves like cancel for confirm, ok for alert
    if(__uiMode === "confirm") return uiModalCancel();
    return uiModalOk();
  });
  $("#uiClose")?.addEventListener("click", () => {
    if(__uiMode === "confirm") return uiModalCancel();
    return uiModalOk();
  });
  $("#uiOk")?.addEventListener("click", uiModalOk);
  $("#uiCancel")?.addEventListener("click", uiModalCancel);

  document.addEventListener("keydown", (e) => {
    const modal = $("#uiModal");
    if(!modal || !modal.classList.contains("is-open")) return;
    if(e.key === "Escape"){
      e.preventDefault();
      if(__uiMode === "confirm") uiModalCancel();
      else uiModalOk();
    }
    if(e.key === "Enter"){
      // Enter confirms in both modes
      if(__uiMode === "confirm") e.preventDefault();
      uiModalOk();
    }
  });
}

function uiModalOk(){
  closeUiModal();
  const r = __uiResolve;
  __uiResolve = null;
  if(typeof r === "function") r(true);
}

function uiModalCancel(){
  closeUiModal();
  const r = __uiResolve;
  __uiResolve = null;
  if(typeof r === "function") r(false);
}

function openSettings(){
  const modal = $("#settingsModal");
  if(!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden","false");
}
function closeSettings(){
  const modal = $("#settingsModal");
  if(!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden","true");
}
const GRADIENT_PRESETS = {
  blue:  { g1:"37,99,235",  g2:"16,185,129", g3:"99,102,241" },
  purple:{ g1:"168,85,247", g2:"99,102,241", g3:"236,72,153" },
  green: { g1:"34,197,94",  g2:"16,185,129", g3:"59,130,246" },
  red:   { g1:"239,68,68",  g2:"245,158,11", g3:"59,130,246" },
  mono:  { g1:"148,163,184",g2:"100,116,139",g3:"71,85,105" },
};
function applyGradientPreset(key){
  const preset = GRADIENT_PRESETS[key] || GRADIENT_PRESETS.blue;
  document.documentElement.style.setProperty("--g1", preset.g1);
  document.documentElement.style.setProperty("--g2", preset.g2);
  document.documentElement.style.setProperty("--g3", preset.g3);
  localStorage.setItem(APPEAR_LS_KEY, key || "blue");

  // mark active
  $$("#gradientPresets .preset-btn").forEach(b => {
    b.classList.toggle("is-active", b.dataset.preset === (key || "blue"));
  });
}
function loadAppearance(){
  const key = localStorage.getItem(APPEAR_LS_KEY) || "blue";
  applyGradientPreset(key);
}



const state = {
  data: loadData(),
  gym: loadGymData(),
  diet: loadDietData(),
  selectedDate: todayISO(),
  gymWeek: isoWeekKey(todayISO()),
  dietWeek: isoWeekKey(todayISO()),
  gymWorkout: "A",
  filter: "all", // all | daily | task (w "Cele")
  view: "today", // today | goals | tasks
  calendarMonth: null, // YYYY-MM (current calendar month)
  pendingFocus: null, // { id, type } for scrolling/highlight after render
  pendingEditId: null, // open edit modal after navigation
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function yearFromISO(iso) {
  return String(iso).slice(0, 4);
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function loadData() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { version: 1, goals: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.goals)) return { version: 1, goals: [] };

    // Migracja:
    // - stare "task (cel roczny)" -> nowe Daily (zachowujemy log i target)
    // - stare daily bez targetu -> default 150
    // - nowe taski -> items[]
    for (const g of parsed.goals) {
      // usuwamy stare pola, jeśli istnieją
      if ("progress" in g) delete g.progress;

      // Stare taski roczne: taskLog/taskTarget
      if (g.type === "task" && (g.taskLog || g.taskTarget)) {
        g.type = "daily";
        g.dailyLog = (g.taskLog && typeof g.taskLog === "object") ? g.taskLog : {};
        g.dailyTarget = Number.isFinite(Number(g.taskTarget)) ? Math.max(1, Math.floor(Number(g.taskTarget))) : 150;
        delete g.taskLog;
        delete g.taskTarget;
      }

      if (g.type === "daily") {
        if (!g.dailyLog || typeof g.dailyLog !== "object") g.dailyLog = {};
        const t = Number(g.dailyTarget);
        g.dailyTarget = (Number.isFinite(t) && t > 0) ? Math.floor(t) : 150;
      }

      if (g.type === "task") {
        if (!Array.isArray(g.items)) g.items = [];
        // normalizacja elementów
        g.items = g.items
          .filter(x => x && typeof x.text === "string")
          .map(x => ({ text: x.text.trim(), done: Boolean(x.done) }))
          .filter(x => x.text.length > 0);
      }
    }


    // normalize logs to: logs[weekKey][workoutKey][exerciseId] = {sets, weight, updatedAt}
    if(!parsed.logs || typeof parsed.logs !== "object") parsed.logs = {};
    for(const [wk, v] of Object.entries(parsed.logs)){
      if(!v || typeof v !== "object") { parsed.logs[wk] = {}; continue; }
      // backward compat: if v has exercise ids directly, wrap into workout A
      const looksFlat = Object.values(v).some(x => x && typeof x === "object" && ("sets" in x || "weight" in x));
      if(looksFlat){
        parsed.logs[wk] = { A: v };
      }
      for(const wKey of ["A","B","C"]){
        if(!parsed.logs[wk][wKey] || typeof parsed.logs[wk][wKey] !== "object") parsed.logs[wk][wKey] = {};
      }
    }
    return parsed;
  } catch {
    return { version: 1, goals: [] };
  }
}

function saveData() {
  localStorage.setItem(LS_KEY, JSON.stringify(state.data));
}

/* ======= Gym (weekly) ======= */
function loadGymData(){
  try{
    const raw = localStorage.getItem(GYM_LS_KEY);
    if(!raw) return { version: 1, exercises: [], logs: {} };
    const parsed = JSON.parse(raw);
    if(!parsed || !Array.isArray(parsed.exercises)) return { version: 1, exercises: [], logs: {} };
    if(!parsed.logs || typeof parsed.logs !== "object") parsed.logs = {};
    // normalize
    parsed.exercises = parsed.exercises
      .filter(e => e && typeof e.name === "string")
      .map(e => ({
        id: e.id || uid(),
        name: e.name.trim(),
        scheme: (e.scheme || "").trim(),
        note: (e.note || "").trim(),
        createdAt: e.createdAt || Date.now(),
        workout: (e.workout === "B" || e.workout === "C") ? e.workout : "A",
      }))
      .filter(e => e.name.length > 0);

    // normalize logs to: logs[weekKey][workoutKey][exerciseId] = {sets, weight, updatedAt}
    if(!parsed.logs || typeof parsed.logs !== "object") parsed.logs = {};
    for(const [wk, v] of Object.entries(parsed.logs)){
      if(!v || typeof v !== "object") { parsed.logs[wk] = {}; continue; }
      // backward compat: if v has exercise ids directly, wrap into workout A
      const looksFlat = Object.values(v).some(x => x && typeof x === "object" && ("sets" in x || "weight" in x));
      if(looksFlat){
        parsed.logs[wk] = { A: v };
      }
      for(const wKey of ["A","B","C"]){
        if(!parsed.logs[wk][wKey] || typeof parsed.logs[wk][wKey] !== "object") parsed.logs[wk][wKey] = {};
      }
    }
    return parsed;
  }catch{
    return { version: 1, exercises: [], logs: {} };
  }
}
function saveGymData(){
  localStorage.setItem(GYM_LS_KEY, JSON.stringify(state.gym));
}


/* ======= Diet (daily macros + weekly summary) ======= */
function loadDietData(){
  try{
    const raw = localStorage.getItem(DIET_LS_KEY);
    if(!raw) return { version: 1, targets: { kcal: 0, p: 0, c: 0, f: 0 }, logs: {} };
    const parsed = JSON.parse(raw);
    if(!parsed || typeof parsed !== "object") return { version: 1, targets: { kcal: 0, p: 0, c: 0, f: 0 }, logs: {} };
    if(!parsed.targets || typeof parsed.targets !== "object") parsed.targets = { kcal: 0, p: 0, c: 0, f: 0 };
    if(!parsed.logs || typeof parsed.logs !== "object") parsed.logs = {};
    // normalize targets
    parsed.targets = {
      kcal: Number.isFinite(Number(parsed.targets.kcal)) ? Math.max(0, Math.floor(Number(parsed.targets.kcal))) : 0,
      p: Number.isFinite(Number(parsed.targets.p)) ? Math.max(0, Math.floor(Number(parsed.targets.p))) : 0,
      c: Number.isFinite(Number(parsed.targets.c)) ? Math.max(0, Math.floor(Number(parsed.targets.c))) : 0,
      f: Number.isFinite(Number(parsed.targets.f)) ? Math.max(0, Math.floor(Number(parsed.targets.f))) : 0,
    };
    // normalize logs
    for(const [iso, v] of Object.entries(parsed.logs)){
      if(!v || typeof v !== "object"){ delete parsed.logs[iso]; continue; }
      parsed.logs[iso] = {
        kcal: Number.isFinite(Number(v.kcal)) ? Math.max(0, Math.floor(Number(v.kcal))) : 0,
        p: Number.isFinite(Number(v.p)) ? Math.max(0, Math.floor(Number(v.p))) : 0,
        c: Number.isFinite(Number(v.c)) ? Math.max(0, Math.floor(Number(v.c))) : 0,
        f: Number.isFinite(Number(v.f)) ? Math.max(0, Math.floor(Number(v.f))) : 0,
      };
    }
    return parsed;
  }catch{
    return { version: 1, targets: { kcal: 0, p: 0, c: 0, f: 0 }, logs: {} };
  }
}
function saveDietData(){
  localStorage.setItem(DIET_LS_KEY, JSON.stringify(state.diet));
}

function setDietTargets(payload){
  state.diet.targets = {
    kcal: Number.isFinite(Number(payload.kcal)) ? Math.max(0, Math.floor(Number(payload.kcal))) : 0,
    p: Number.isFinite(Number(payload.p)) ? Math.max(0, Math.floor(Number(payload.p))) : 0,
    c: Number.isFinite(Number(payload.c)) ? Math.max(0, Math.floor(Number(payload.c))) : 0,
    f: Number.isFinite(Number(payload.f)) ? Math.max(0, Math.floor(Number(payload.f))) : 0,
  };
  saveDietData();
}

function setDietLog(dateISO, payload){
  if(!state.diet.logs || typeof state.diet.logs !== "object") state.diet.logs = {};
  state.diet.logs[dateISO] = {
    kcal: Number.isFinite(Number(payload.kcal)) ? Math.max(0, Math.floor(Number(payload.kcal))) : 0,
    p: Number.isFinite(Number(payload.p)) ? Math.max(0, Math.floor(Number(payload.p))) : 0,
    c: Number.isFinite(Number(payload.c)) ? Math.max(0, Math.floor(Number(payload.c))) : 0,
    f: Number.isFinite(Number(payload.f)) ? Math.max(0, Math.floor(Number(payload.f))) : 0,
  };
  saveDietData();
}

function getDietLog(dateISO){
  const row = state.diet.logs?.[dateISO] || {};
  return {
    kcal: Number.isFinite(Number(row.kcal)) ? Number(row.kcal) : 0,
    p: Number.isFinite(Number(row.p)) ? Number(row.p) : 0,
    c: Number.isFinite(Number(row.c)) ? Number(row.c) : 0,
    f: Number.isFinite(Number(row.f)) ? Number(row.f) : 0,
  };
}

function isoWeekToMonday(weekKey){
  // weekKey: YYYY-Www ; returns ISO date (Monday)
  const [yy, ww] = String(weekKey).split("-W");
  const year = Number(yy);
  const week = Number(ww);
  const jan4 = new Date(year,0,4);
  const jan4Day = (jan4.getDay()+6)%7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - jan4Day); // Monday of week 1
  const target = new Date(monday);
  target.setDate(monday.getDate() + (week-1)*7);
  return isoFromYMD(target.getFullYear(), target.getMonth()+1, target.getDate());
}

function weekDatesFromWeekKey(weekKey){
  const start = isoWeekToMonday(weekKey);
  const days = [];
  for(let i=0;i<7;i++) days.push(shiftISODate(start, i));
  return days;
}

function dietInRangeStatus(val, target, mode){
  // mode: "le" (<=) or "ge" (>=) ; if target=0 -> treat as no target (neutral)
  const t = Number(target);
  if(!Number.isFinite(t) || t <= 0) return { ok: null, diff: 0 };
  const v = Number(val) || 0;
  if(mode === "ge") return { ok: v >= t, diff: v - t };
  return { ok: v <= t, diff: t - v };
}

function renderDiet(){
  const view = $("#dietView");
  if(!view) return;

  // header
  const title = $("#dietWeekTitle");
  if(title) title.textContent = weekTitlePL(state.dietWeek);

  const dateLabel = $("#dietDateLabel");
  if(dateLabel) dateLabel.textContent = state.selectedDate;

  // fill targets
  const t = state.diet.targets || { kcal:0,p:0,c:0,f:0 };
  const tK = $("#dietTargetKcal");
  const tP = $("#dietTargetP");
  const tC = $("#dietTargetC");
  const tF = $("#dietTargetF");
  if(tK) tK.value = t.kcal ? String(t.kcal) : "";
  if(tP) tP.value = t.p ? String(t.p) : "";
  if(tC) tC.value = t.c ? String(t.c) : "";
  if(tF) tF.value = t.f ? String(t.f) : "";

  // fill day inputs
  const d = getDietLog(state.selectedDate);
  const iK = $("#dietInKcal");
  const iP = $("#dietInP");
  const iC = $("#dietInC");
  const iF = $("#dietInF");
  if(iK) iK.value = d.kcal ? String(d.kcal) : "";
  if(iP) iP.value = d.p ? String(d.p) : "";
  if(iC) iC.value = d.c ? String(d.c) : "";
  if(iF) iF.value = d.f ? String(d.f) : "";

  // mini status for selected day
  const mini = $("#dietMiniStatus");
  if(mini){
    const sK = dietInRangeStatus(d.kcal, t.kcal, "le");
    const sP = dietInRangeStatus(d.p, t.p, "ge");
    const sC = dietInRangeStatus(d.c, t.c, "le");
    const sF = dietInRangeStatus(d.f, t.f, "le");

    const pill = (label, s, mode) => {
      if(s.ok === null) return `<span class="pill">• ${label}: brak celu</span>`;
      if(mode === "ge"){
        return `<span class="pill ${s.ok ? "pill--ok" : "pill--bad"}">${label}: ${s.ok ? "OK" : "brakuje"} (${Math.abs(s.diff)})</span>`;
      }
      return `<span class="pill ${s.ok ? "pill--ok" : "pill--bad"}">${label}: ${s.ok ? "OK" : "za dużo"} (${Math.abs(s.diff)})</span>`;
    };

    mini.innerHTML = `
      <div class="diet-pills">
        ${pill("Kcal", sK, "le")}
        ${pill("Białko", sP, "ge")}
        ${pill("Węgle", sC, "le")}
        ${pill("Tłuszcze", sF, "le")}
      </div>
    `;
  }

  // weekly summary
  const box = $("#dietWeekSummary");
  if(!box) return;

  const days = weekDatesFromWeekKey(state.dietWeek);
  const totals = { kcal:0,p:0,c:0,f:0 };
  let filledDays = 0;

  const perDay = days.map(iso => {
    const row = getDietLog(iso);
    const hasAny = (row.kcal||row.p||row.c||row.f) > 0;
    if(hasAny) filledDays++;
    totals.kcal += row.kcal||0;
    totals.p += row.p||0;
    totals.c += row.c||0;
    totals.f += row.f||0;

    const okK = dietInRangeStatus(row.kcal, t.kcal, "le").ok;
    const okP = dietInRangeStatus(row.p, t.p, "ge").ok;
    const okC = dietInRangeStatus(row.c, t.c, "le").ok;
    const okF = dietInRangeStatus(row.f, t.f, "le").ok;

    const tag = (ok) => ok === null ? "•" : (ok ? "✓" : "✕");

    return {
      iso,
      row,
      hasAny,
      ok: { kcal: okK, p: okP, c: okC, f: okF },
      tag: { kcal: tag(okK), p: tag(okP), c: tag(okC), f: tag(okF) },
    };
  });

  const avg = {
    kcal: filledDays ? Math.round(totals.kcal / filledDays) : 0,
    p: filledDays ? Math.round(totals.p / filledDays) : 0,
    c: filledDays ? Math.round(totals.c / filledDays) : 0,
    f: filledDays ? Math.round(totals.f / filledDays) : 0,
  };

  const countOk = (key) => perDay.filter(d => d.hasAny && d.ok[key] === true).length;
  const countBad = (key) => perDay.filter(d => d.hasAny && d.ok[key] === false).length;

  const weeklyInfo = (key, target, mode) => {
    const tar = Number(target) || 0;
    const total = Number(totals[key]) || 0;
    if(!(tar > 0)){
      return { weeklyTarget: 0, total, text: "Brak celu tygodniowego" };
    }
    const weeklyTarget = tar * 7;

    // mode: "le" => limit (kcal/c/f), "ge" => minimum (protein)
    if(mode === "ge"){
      const remaining = Math.max(0, weeklyTarget - total);
      const extra = Math.max(0, total - weeklyTarget);
      const text = remaining > 0
        ? `Zostało do celu: ${remaining}`
        : `Nadwyżka: +${extra}`;
      return { weeklyTarget, total, text };
    }

    const remaining = weeklyTarget - total;
    const text = remaining >= 0
      ? `Pozostało: ${remaining}`
      : `Przekroczone o: ${Math.abs(remaining)}`;
    return { weeklyTarget, total, text };
  };

  const summaryLine = (label, key, target, mode) => {
    const tar = Number(target)||0;
    const shownTarget = tar > 0 ? tar : "—";
    const okN = countOk(key);
    const badN = countBad(key);
    const modeTxt = mode === "ge" ? "≥" : "≤";

    const wk = weeklyInfo(key, target, mode);
    const wkTargetShown = wk.weeklyTarget > 0 ? wk.weeklyTarget : "—";
    const wkMain = `Tydzień: ${wk.total} / ${wkTargetShown}`;
    return `
      <div class="diet-sum-row">
        <div class="diet-sum-left">
          <div class="diet-sum-label">${label}</div>
          <div class="diet-sum-sub">Cel: ${modeTxt} ${shownTarget} • dni OK: ${okN}/${filledDays || 0}${badN ? ` • poza: ${badN}` : ""}</div>
          <div class="diet-sum-sub">${wkMain} • ${wk.text}</div>
        </div>
        <div class="diet-sum-right">
          <div class="diet-sum-num">${filledDays ? avg[key] : 0}</div>
          <div class="diet-sum-sub">średnio / dzień</div>
        </div>
      </div>
    `;
  };

  const rows = perDay.map(dy => `
    <div class="diet-day ${dy.hasAny ? "" : "diet-day--empty"}">
      <div class="diet-day__date">${dy.iso}</div>
      <div class="diet-day__vals">${dy.row.kcal || "—"} / ${dy.row.p || "—"} / ${dy.row.c || "—"} / ${dy.row.f || "—"}</div>
      <div class="diet-day__tags">${dy.tag.kcal} ${dy.tag.p} ${dy.tag.c} ${dy.tag.f}</div>
    </div>
  `).join("");

  box.innerHTML = `
    <div class="diet-summary-top">
      ${summaryLine("Kcal", "kcal", t.kcal, "le")}
      ${summaryLine("Białko (g)", "p", t.p, "ge")}
      ${summaryLine("Węgle (g)", "c", t.c, "le")}
      ${summaryLine("Tłuszcze (g)", "f", t.f, "le")}
    </div>

    <div class="diet-days-head">
      <div class="diet-days-head__left">Dzień</div>
      <div class="diet-days-head__mid">Kcal / B / W / T</div>
      <div class="diet-days-head__right">OK</div>
    </div>
    <div class="diet-days">
      ${rows}
    </div>
  `;
}


// ISO week key: YYYY-Www (Monday start)
function isoWeekKey(dateISO){
  const [y,m,d] = String(dateISO).split("-").map(Number);
  const dt = new Date(y, m-1, d);
  // ISO week algorithm
  const day = (dt.getDay() + 6) % 7; // Mon=0..Sun=6
  dt.setDate(dt.getDate() - day + 3); // Thursday of current week
  const firstThu = new Date(dt.getFullYear(), 0, 4);
  const firstDay = (firstThu.getDay() + 6) % 7;
  firstThu.setDate(firstThu.getDate() - firstDay + 3);
  const week = 1 + Math.round((dt - firstThu) / (7*24*60*60*1000));
  const ww = String(week).padStart(2,"0");
  return `${dt.getFullYear()}-W${ww}`;
}
function shiftWeek(weekKey, delta){
  // weekKey YYYY-Www
  const [yy, ww] = weekKey.split("-W");
  const year = Number(yy);
  const week = Number(ww);
  // get Monday of week
  const jan4 = new Date(year,0,4);
  const jan4Day = (jan4.getDay()+6)%7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - jan4Day); // Monday of week 1
  const target = new Date(monday);
  target.setDate(monday.getDate() + (week-1+delta)*7);
  return isoWeekKey(`${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,"0")}-${String(target.getDate()).padStart(2,"0")}`);
}
function weekTitlePL(weekKey){
  return `Tydzień ${weekKey.replace("-", " ")}`;
}

/* Gym CRUD */
function addExercise(payload){
  const ex = {
    id: uid(),
    name: payload.name.trim(),
    scheme: (payload.scheme || "").trim(),
    note: (payload.note || "").trim(),
    workout: (payload.workout === "B" || payload.workout === "C") ? payload.workout : (payload.workout || state.gymWorkout || "A"),
    createdAt: Date.now(),
  };
  if(!ex.name) return;
  state.gym.exercises.unshift(ex);
  saveGymData();
  renderGym();
}
function updateExercise(id, payload){
  const idx = state.gym.exercises.findIndex(e => e.id === id);
  if(idx === -1) return;
  const cur = state.gym.exercises[idx];
  const upd = {
    ...cur,
    name: payload.name.trim(),
    scheme: (payload.scheme || "").trim(),
    note: (payload.note || "").trim(),
    workout: (payload.workout === "B" || payload.workout === "C") ? payload.workout : (payload.workout || cur.workout || "A"),
  };
  if(!upd.name) return;
  state.gym.exercises[idx] = upd;
  saveGymData();
  renderGym();
}
function deleteExercise(id){
  state.gym.exercises = state.gym.exercises.filter(e => e.id !== id);
  // keep logs but remove entries for cleanliness
  for(const wk of Object.keys(state.gym.logs || {})){
    if(state.gym.logs[wk] && typeof state.gym.logs[wk] === "object"){
      delete state.gym.logs[wk][id];
    }
  }
  saveGymData();
  renderGym();
}

// iOS (PL keyboard) often uses comma as decimal separator. We normalize it to dot
// before parsing/saving so values like "60,5" are preserved and appear in history.
function normalizeDecimalString(v){
  const s = String(v ?? "").trim();
  if(!s) return "";
  // keep digits, comma, dot (basic safety) and convert comma to dot
  return s.replace(/,/g, ".");
}
function toNumberLocale(v){
  const s = normalizeDecimalString(v);
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function setGymLog(weekKey, workoutKey, exId, sets, reps, weight){
  const wk = (workoutKey === "B" || workoutKey === "C") ? workoutKey : "A";
  if(!state.gym.logs || typeof state.gym.logs !== "object") state.gym.logs = {};
  if(!state.gym.logs[weekKey] || typeof state.gym.logs[weekKey] !== "object") state.gym.logs[weekKey] = {};
  if(!state.gym.logs[weekKey][wk] || typeof state.gym.logs[weekKey][wk] !== "object") state.gym.logs[weekKey][wk] = {};
  state.gym.logs[weekKey][wk][exId] = {
    sets: Number.isFinite(Number(sets)) ? Math.max(0, Number(sets)) : 0,
    reps: Number.isFinite(Number(reps)) ? Math.max(0, Number(reps)) : 0,
    // allow decimals with comma ("60,5")
    weight: Math.max(0, toNumberLocale(weight)),
    updatedAt: Date.now(),
  };
  saveGymData();
}
function getGymLog(weekKey, workoutKey, exId){
  const wkKey = (workoutKey === "B" || workoutKey === "C") ? workoutKey : "A";
  const wk = state.gym.logs?.[weekKey]?.[wkKey];
  const row = wk?.[exId];
  return {
    sets: Number.isFinite(Number(row?.sets)) ? Number(row.sets) : "",
    reps: Number.isFinite(Number(row?.reps)) ? Number(row.reps) : "",
    weight: (() => {
      const v = row?.weight;
      const n = toNumberLocale(v);
      return n > 0 ? n : "";
    })(),
  };
}

/* Gym UI */
function openGymModal(mode, ex=null){
  const modal = $("#gymModal");
  if(!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden","false");

  $("#gymModalTitle").textContent = mode === "edit" ? "Edytuj ćwiczenie" : "Dodaj ćwiczenie";
  $("#editingExId").value = ex?.id || "";
  $("#exName").value = ex?.name || "";
  $("#exScheme").value = ex?.scheme || "";
  $("#exNote").value = ex?.note || "";
  const wSel = $("#exWorkout");
  if (wSel) wSel.value = (ex?.workout === "B" || ex?.workout === "C") ? ex.workout : (state.gymWorkout || "A");
}
function closeGymModal(){
  const modal = $("#gymModal");
  if(!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden","true");
}
function renderGym(){
  const wrap = $("#gymView");
  const list = $("#gymList");
  const title = $("#gymWeekTitle");
  if(!wrap || !list || !title) return;

  title.textContent = weekTitlePL(state.gymWeek);

  // sync workout chips
  const wkKey = state.gymWorkout || "A";
  const aBtn = $("#gymWorkoutA");
  const bBtn = $("#gymWorkoutB");
  const cBtn = $("#gymWorkoutC");
  if (aBtn) aBtn.classList.toggle("chip--active", wkKey === "A");
  if (bBtn) bBtn.classList.toggle("chip--active", wkKey === "B");
  if (cBtn) cBtn.classList.toggle("chip--active", wkKey === "C");

  const exercisesAll = Array.isArray(state.gym.exercises) ? state.gym.exercises : [];
  const exercises = exercisesAll.filter(e => (e.workout || "A") === wkKey);
  list.innerHTML = "";

  if(exercises.length === 0){
    list.innerHTML = `<div class="card"><div class="card__label">Brak ćwiczeń</div><div class="card__value">Dodaj pierwsze ćwiczenie</div></div>`;
    return;
  }

  for(const ex of exercises){
    const log = getGymLog(state.gymWeek, wkKey, ex.id);

    const row = document.createElement("div");
    row.className = "gym-row";
    row.innerHTML = `
      <div class="gym-row__left">
        <p class="gym-row__name">${escapeHtml(ex.name)}</p>
        <div class="gym-row__scheme">${ex.scheme ? `Plan: ${escapeHtml(ex.scheme)}` : ""}</div>
      </div>

      <div class="gym-row__right">
        <div class="gym-field">
          <label>Serie (tydzień)</label>
          <input type="number" inputmode="numeric" min="0" step="1"
                 value="${log.sets}"
                 data-action="gymLog"
                 data-id="${ex.id}"
                 data-field="sets" />
        </div>
        <div class="gym-field">
          <label>Powt. (na serię)</label>
          <input type="number" inputmode="numeric" min="0" step="1"
                 value="${log.reps}"
                 data-action="gymLog"
                 data-id="${ex.id}"
                 data-field="reps" />
        </div>
        <div class="gym-field">
          <label>Ciężar (kg)</label>
          <!--
            iOS Safari (PL locale) can treat decimals in <input type="number"> as invalid
            (especially when the keyboard uses comma). Using type="text" + inputmode="decimal"
            keeps the raw value stable, and we normalize comma->dot in JS before saving.
          -->
          <input type="text" inputmode="decimal" autocomplete="off" spellcheck="false"
                 placeholder=""
                 value="${log.weight}"
                 data-action="gymLog"
                 data-id="${ex.id}"
                 data-field="weight" />
        </div>

        <div class="gym-actions">
          <button class="small-btn" data-action="gymHistory" data-id="${ex.id}">Historia</button>
          <button class="small-btn" data-action="gymEdit" data-id="${ex.id}">Edytuj</button>
          <button class="small-btn small-btn--danger" data-action="gymDelete" data-id="${ex.id}">Usuń</button>
        </div>
      </div>
    `;
    list.appendChild(row);
  }
}

/* ======= Gym: history (progress) ======= */
function openGymHistory(exId){
  const modal = $("#gymHistoryModal");
  if(!modal) return;

  const wkKey = state.gymWorkout || "A";
  const ex = state.gym.exercises.find(e => e.id === exId);
  if(!ex) return;

  // gather weeks where we have logs for this exercise in current workout
  const weekKeys = Object.keys(state.gym.logs || {}).sort(); // YYYY-Www sorts correctly
  const rows = [];
  for(const wk of weekKeys){
    const entry = state.gym.logs?.[wk]?.[wkKey]?.[exId];
    if(!entry) continue;
    const sets = Number.isFinite(Number(entry.sets)) ? Number(entry.sets) : 0;
    const reps = Number.isFinite(Number(entry.reps)) ? Number(entry.reps) : 0;
    const weight = Math.max(0, toNumberLocale(entry.weight));
    if(sets === 0 && weight === 0) continue;
    rows.push({ wk, sets, reps, weight, updatedAt: entry.updatedAt || 0 });
  }

  // newest first in table
  const rowsDesc = [...rows].sort((a,b) => (b.wk > a.wk ? 1 : (b.wk < a.wk ? -1 : 0)));

  $("#gymHistoryTitle").textContent = "Historia progresu";
  $("#gymHistoryMeta").textContent = `${ex.name} • Trening ${wkKey}`;

  // table
  const tbody = $("#gymHistoryRows");
  if(tbody){
    if(rowsDesc.length === 0){
      tbody.innerHTML = `<tr><td colspan="4" style="color:var(--muted); font-weight:800;">Brak danych dla tego ćwiczenia. Wpisz serie/powt./ciężar w tygodniu.</td></tr>`;
    }else{
      tbody.innerHTML = rowsDesc.map(r => `
        <tr>
          <td>${r.wk}</td>
          <td>${r.sets || ""}</td>
          <td>${r.reps || ""}</td>
          <td>${r.weight || ""}</td>
        </tr>
      `).join("");
    }
  }

  // chart (weight over time) using simple SVG
  const chartBox = $("#gymHistoryChart");
  if(chartBox){
    chartBox.innerHTML = renderGymHistoryChart(rows);
  }

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden","false");
}

function closeGymHistory(){
  const modal = $("#gymHistoryModal");
  if(!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden","true");
}

function renderGymHistoryChart(rowsAsc){
  const rows = [...rowsAsc].sort((a,b) => (a.wk > b.wk ? 1 : (a.wk < b.wk ? -1 : 0)));
  const pts = rows.filter(r => Number.isFinite(Number(r.weight)) && Number(r.weight) > 0);
  if(pts.length < 2){
    return `<div style="color:var(--muted); font-weight:800; font-size:12px;">Wykres pojawi się, gdy wpiszesz ciężar w co najmniej 2 tygodniach.</div>`;
  }

  const w = 560, h = 160, pad = 18;
  const minV = Math.min(...pts.map(p => p.weight));
  const maxV = Math.max(...pts.map(p => p.weight));
  const range = Math.max(1, maxV - minV);

  const xStep = (w - pad*2) / (pts.length - 1);
  const toX = (i) => pad + i*xStep;
  const toY = (val) => (h - pad) - ((val - minV) / range) * (h - pad*2);

  const d = pts.map((p,i) => `${i===0?'M':'L'} ${toX(i).toFixed(2)} ${toY(p.weight).toFixed(2)}`).join(" ");
  const circles = pts.map((p,i) => `<circle cx="${toX(i)}" cy="${toY(p.weight)}" r="4" fill="currentColor"></circle>`).join("");

  const first = pts[0].weight;
  const last = pts[pts.length-1].weight;
  const delta = (last - first);
  const deltaTxt = (delta === 0) ? "0" : (delta > 0 ? `+${delta}` : `${delta}`);

  const labels = `
    <div style="display:flex; justify-content:space-between; gap:10px; margin-bottom:10px;">
      <div style="color:var(--muted); font-weight:900; font-size:12px;">Min: ${minV} kg • Max: ${maxV} kg</div>
      <div style="font-weight:1000; font-size:12px;">Zmiana: ${deltaTxt} kg</div>
    </div>
  `;

  return labels + `
  <div style="width:100%; overflow:auto;">
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="color: rgba(37,99,235,.95);">
      <path d="${d}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path>
      ${circles}
    </svg>
  </div>`;
}


/* ======= Charts (SVG) ======= */
function pieSVG(percent, color) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const r = 28;
  const c = 2 * Math.PI * r;
  const filled = (p / 100) * c;

  const bg = `rgba(255,255,255,.10)`;
  return `
  <svg width="72" height="72" viewBox="0 0 72 72" aria-label="Wykres kołowy">
    <g transform="translate(36,36)">
      <circle r="${r}" fill="none" stroke="${bg}" stroke-width="10"></circle>
      <circle r="${r}" fill="none"
        stroke="${color}"
        stroke-width="10"
        stroke-linecap="round"
        stroke-dasharray="${filled} ${c - filled}"
        transform="rotate(-90)"></circle>
      <circle r="${r - 11}" fill="rgba(0,0,0,.15)"></circle>
      <text text-anchor="middle" dominant-baseline="central"
        font-size="14" font-weight="900" fill="white">${p}%</text>
    </g>
  </svg>`;
}


/* ======= Charts (SVG) — BIG tiles ======= */
function bigPieSVG(percent, color) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const r = 56;
  const c = 2 * Math.PI * r;
  const filled = (p / 100) * c;
  const bg = `rgba(255,255,255,.10)`;

  return `
  <svg width="160" height="160" viewBox="0 0 160 160" aria-label="Wykres kołowy">
    <g transform="translate(80,80)">
      <circle r="${r}" fill="none" stroke="${bg}" stroke-width="14"></circle>
      <circle r="${r}" fill="none"
        stroke="${color}"
        stroke-width="14"
        stroke-linecap="round"
        stroke-dasharray="${filled} ${c - filled}"
        transform="rotate(-90)"></circle>
    </g>
  </svg>`;
}

/* ======= Daily logic ======= */
function dailyGoals() {
  return state.data.goals.filter(g => g.type === "daily");
}

function getDailyDoneCount(dateISO) {
  const goals = dailyGoals();
  let done = 0;
  for (const g of goals) if (g.dailyLog?.[dateISO] === true) done++;
  return { done, total: goals.length };
}

function dailyPercentForDay(dateISO) {
  const { done, total } = getDailyDoneCount(dateISO);
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

function getDailyTarget(goal) {
  const t = Number(goal?.dailyTarget);
  return Number.isFinite(t) && t > 0 ? Math.floor(t) : 150;
}

function getDailyCountInYear(goal, year) {
  const log = goal?.dailyLog;
  if (!log || typeof log !== "object") return 0;
  let c = 0;
  for (const [k, v] of Object.entries(log)) {
    if (v === true && String(k).startsWith(year + "-")) c++;
  }
  return c;
}

function getDailyPercentYear(goal, year) {
  const target = getDailyTarget(goal);
  const count = getDailyCountInYear(goal, year);
  return Math.min(100, Math.round((count / target) * 100));
}


/* ======= Streaks (Daily) ======= */
// Current streak counts consecutive checked days ending on dateISO (inclusive).
function getDailyCurrentStreak(goal, dateISO) {
  const log = goal?.dailyLog;
  if (!log || typeof log !== "object") return 0;

  let streak = 0;
  let d = String(dateISO);

  // Limit to avoid infinite loops on corrupted data
  for (let i = 0; i < 2000; i++) {
    if (log?.[d] === true) {
      streak++;
      d = shiftISODate(d, -1);
    } else {
      break;
    }
  }
  return streak;
}

// Best streak across all time for a given daily goal.
function getDailyBestStreak(goal) {
  const log = goal?.dailyLog;
  if (!log || typeof log !== "object") return 0;

  // collect checked dates
  const dates = Object.keys(log).filter(k => log[k] === true).sort(); // ISO sorts lexicographically
  if (dates.length === 0) return 0;

  let best = 1;
  let cur = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1];
    const expected = shiftISODate(prev, +1);
    if (dates[i] === expected) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 1;
    }
  }
  return best;
}


/* ======= Tasks (checklist) ======= */
function taskGoals() {
  return state.data.goals.filter(g => g.type === "task");
}

function getTaskPercent(goal) {
  const items = Array.isArray(goal?.items) ? goal.items : [];
  if (items.length === 0) return 0;
  const done = items.filter(i => i.done).length;
  return Math.round((done / items.length) * 100);
}

/* ======= Overall % (rok) ======= */
function overallPercentForYear(year) {
  const goals = dailyGoals();
  if (goals.length === 0) return 0;

  let sumCount = 0;
  let sumTarget = 0;

  for (const g of goals) {
    if (g.showInOverview === false) continue;
    sumCount += getDailyCountInYear(g, year);
    sumTarget += getDailyTarget(g);
  }

  if (sumTarget <= 0) return 0;
  return Math.min(100, Math.round((sumCount / sumTarget) * 100));
}

/* ======= CRUD ======= */
function addGoal(payload) {
  const type = payload.type;

  const goal = {
    id: uid(),
    name: payload.name.trim(),
    type, // daily | task
    color: payload.color || "#3b82f6",
    note: payload.note || "",
    createdAt: Date.now(),
    showInOverview: payload.showInOverview !== false,
  };

  if (type === "daily") {
    goal.dailyLog = {};
    goal.dailyTarget = Math.max(1, Math.floor(Number(payload.dailyTarget) || 150));
  } else {
    goal.items = Array.isArray(payload.items) ? payload.items : [];
  }

  state.data.goals.unshift(goal);
  saveData();
  render();
}

function updateGoal(id, payload) {
  const idx = state.data.goals.findIndex(g => g.id === id);
  if (idx === -1) return;

  const g = state.data.goals[idx];
  const newType = payload.type;

  const updated = {
    ...g,
    name: payload.name.trim(),
    type: newType,
    color: payload.color,
    note: payload.note || "",
    showInOverview: payload.showInOverview !== false,
  };

  if (newType === "daily") {
    updated.dailyLog = g.type === "daily" ? (g.dailyLog || {}) : {};
    updated.dailyTarget = Math.max(1, Math.floor(Number(payload.dailyTarget) || (g.dailyTarget || 150)));
    delete updated.items;
  } else {
    // zachowaj "done" dla tych samych tekstów
    const prev = (g.type === "task" && Array.isArray(g.items)) ? g.items : [];
    const prevMap = new Map(prev.map(it => [it.text, Boolean(it.done)]));

    const lines = Array.isArray(payload.items) ? payload.items : [];
    updated.items = lines.map(it => {
      const text = String(it.text || "").trim();
      return { text, done: prevMap.get(text) ?? false };
    }).filter(it => it.text.length > 0);

    delete updated.dailyLog;
    delete updated.dailyTarget;
  }

  state.data.goals[idx] = updated;
  saveData();
  render();
}

function deleteGoal(id) {
  state.data.goals = state.data.goals.filter(g => g.id !== id);
  saveData();
  render();
}

function toggleDaily(id, dateISO) {
  const g = state.data.goals.find(x => x.id === id && x.type === "daily");
  if (!g) return;
  if (!g.dailyLog) g.dailyLog = {};
  g.dailyLog[dateISO] = !g.dailyLog[dateISO];
  saveData();
  render();
}

function toggleTaskItem(id, idx) {
  const g = state.data.goals.find(x => x.id === id && x.type === "task");
  if (!g || !Array.isArray(g.items) || !g.items[idx]) return;
  g.items[idx].done = !g.items[idx].done;
  saveData();
  render();
}

/* ======= UI ======= */

function renderOverviewTiles() {
  const grid = $("#overviewGrid");
  if (!grid) return;

  const year = state.selectedDate.slice(0, 4);
  const goals = Array.isArray(state.data.goals) ? state.data.goals : [];

  const visibleGoals = goals.filter(g => g && g.showInOverview !== false);

  grid.innerHTML = "";

  if (visibleGoals.length === 0) {
    grid.innerHTML = `<div class="card">
      <div class="card__label">Brak celów</div>
      <div class="card__value">Dodaj pierwszy cel</div>
    </div>`;
    return;
  }

  for (const g of visibleGoals) {
    if (g.showInOverview === false) continue;
    let pct = 0;
    let sub = "";

    if (g.type === "daily") {
      pct = getDailyPercentYear(g, year);
      sub = `🔥${getDailyCurrentStreak(g, state.selectedDate)} 🏆${getDailyBestStreak(g)}`;
    } else {
      pct = getTaskPercent(g);
      const items = Array.isArray(g.items) ? g.items : [];
      const done = items.filter(i => i && i.done === true).length;
      sub = `${done}/${items.length || 0}`;
    }

    const tile = document.createElement("div");
    tile.className = "overview-tile overview-tile--click";
    tile.setAttribute("role","button");
    tile.setAttribute("tabindex","0");
    tile.dataset.action = "focusFromOverview";
    tile.dataset.id = g.id;
    tile.dataset.type = g.type;
    tile.innerHTML = `
      <div class="overview-name">${escapeHtml(g.name)}</div>
      ${bigPieSVG(pct, g.color)}
      <div class="overview-progress-label">PROGRESS</div>
      <div class="overview-percent">${pct}%</div>
      <div class="overview-sub">${sub}</div>
    `;
    grid.appendChild(tile);
  }
}

function goalCompletionForCard(goal, year) {
  if (goal.type === "daily") return getDailyPercentYear(goal, year);
  return getTaskPercent(goal);
}

function goalBadge(goal) {
  return goal.type === "daily" ? "Daily" : "Task";
}

function renderTodayDaily() {
  const box = $("#todayDailyList");
  if (!box) return;

  const goals = dailyGoals();
  const yr = yearFromISO(state.selectedDate);

  if (goals.length === 0) {
    box.innerHTML = `<div class="card">
      <div class="card__label">Brak celów Daily</div>
      <div class="card__value">Dodaj Daily w zakładce „Cele”</div>
    </div>`;
    return;
  }

  box.innerHTML = "";

  for (const g of goals) {
    const done = g.dailyLog?.[state.selectedDate] === true;
    const countY = getDailyCountInYear(g, yr);
    const target = getDailyTarget(g);
    const pctY = getDailyPercentYear(g, yr);

    const row = document.createElement("div");
    row.className = "today-item";
    row.id = `today-${g.id}`;
    row.innerHTML = `
      <div class="today-left">
        <span class="dot" style="background:${g.color}"></span>
        <div class="today-name" title="${escapeHtml(g.name)}">${escapeHtml(g.name)}</div>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <span class="pill" title="Streak">🔥${getDailyCurrentStreak(g, state.selectedDate)}</span>
        <button class="today-btn ${done ? "today-btn--on" : ""}"
                data-action="toggleDailyToday"
                data-id="${g.id}">
          ${done ? "✓ Zrobione" : "Zrób teraz"}
        </button>
      </div>
    `;
    box.appendChild(row);
  }
}

function renderGoals() {
  const list = $("#goalsList");
  if (!list) return;

  list.innerHTML = "";

  let goals = [...state.data.goals];

  // Filtry działają tylko w zakładce "Cele"
  if (state.filter !== "all") goals = goals.filter(g => g.type === state.filter);

  if (goals.length === 0) {
    list.innerHTML = `<div class="card"><div class="card__label">Brak celów</div><div class="card__value">Dodaj pierwszy cel</div></div>`;
    return;
  }

  const yr = yearFromISO(state.selectedDate);

  for (const g of goals) {
    const pct = goalCompletionForCard(g, yr);

    const el = document.createElement("div");
    el.className = "goal";

    el.id = `goal-${g.id}`;

    if (g.type === "daily") {
      const isDoneToday = g.dailyLog?.[state.selectedDate] === true;
      const countY = getDailyCountInYear(g, yr);
      const target = getDailyTarget(g);

      el.innerHTML = `
        <div class="goal__left">${pieSVG(pct, g.color)}</div>
        <div class="goal__body">
          <div class="goal__title">
            <p class="goal__name">${escapeHtml(g.name)}</p>
            <span class="badge">${goalBadge(g)}</span>
          </div>
          ${g.note ? `<div class="goal__note">${escapeHtml(g.note)}</div>` : `<div class="goal__note"> </div>`}

          <div class="goal__actions">
            <button class="small-btn" data-action="toggleDaily" data-id="${g.id}">
              ${isDoneToday ? "✓ Odznaczone" : "Odznacz na ten dzień"}
            </button>
            <button class="small-btn" data-action="edit" data-id="${g.id}">Edytuj</button>
            <button class="small-btn small-btn--danger" data-action="delete" data-id="${g.id}">Usuń</button>
            <span class="pill">🔥${getDailyCurrentStreak(g, state.selectedDate)} 🏆${getDailyBestStreak(g)}</span>
          </div>
        </div>
      `;
    } else {
      // task checklista w zakładce "Cele" może się pojawić (jeśli filtr=task), ale główny widok to "Taski"
      const items = Array.isArray(g.items) ? g.items : [];
      const done = items.filter(i => i.done).length;

      el.innerHTML = `
        <div class="goal__left">${pieSVG(pct, g.color)}</div>
        <div class="goal__body">
          <div class="goal__title">
            <p class="goal__name">${escapeHtml(g.name)}</p>
            <span class="badge">${goalBadge(g)}</span>
          </div>
          ${g.note ? `<div class="goal__note">${escapeHtml(g.note)}</div>` : `<div class="goal__note"> </div>`}
          <div class="goal__actions">
            <button class="small-btn" data-action="edit" data-id="${g.id}">Edytuj</button>
            <button class="small-btn small-btn--danger" data-action="delete" data-id="${g.id}">Usuń</button>
            <span class="pill">${done}/${items.length || 0}</span>
          </div>
        </div>
      `;
    }

    list.appendChild(el);
  }
}

function renderTasks() {
  const list = $("#tasksList");
  if (!list) return;

  list.innerHTML = "";

  const tasks = taskGoals();
  if (tasks.length === 0) {
    list.innerHTML = `<div class="card"><div class="card__label">Brak tasków</div><div class="card__value">Dodaj task w „+ Dodaj cel”</div></div>`;
    return;
  }

  for (const t of tasks) {
    const pct = getTaskPercent(t);
    const items = Array.isArray(t.items) ? t.items : [];
    const doneCount = items.filter(i => i.done).length;

    const el = document.createElement("div");
    el.className = "goal";

    el.id = `task-${t.id}`;
    el.innerHTML = `
      <div class="goal__left">${pieSVG(pct, t.color)}</div>
      <div class="goal__body">
        <div class="goal__title">
          <p class="goal__name">${escapeHtml(t.name)}</p>
          <span class="badge">Task</span>
        </div>
        ${t.note ? `<div class="goal__note">${escapeHtml(t.note)}</div>` : `<div class="goal__note"> </div>`}

        <div class="goal__note" style="margin-top:8px;">
          ${items.length
            ? items.map((it, idx) => `
              <label style="display:flex; gap:8px; align-items:center; margin:6px 0;">
                <input type="checkbox" data-action="toggleItem" data-id="${t.id}" data-idx="${idx}" ${it.done ? "checked" : ""}/>
                <span>${escapeHtml(it.text)}</span>
              </label>
            `).join("")
            : `<em>Brak podzadań — edytuj task.</em>`
          }
        </div>

        <div class="goal__actions">
          <button class="small-btn" data-action="editTask" data-id="${t.id}">Edytuj</button>
          <button class="small-btn small-btn--danger" data-action="deleteTask" data-id="${t.id}">Usuń</button>
          <span class="pill">${doneCount}/${items.length || 0}</span>
        </div>
      </div>
    `;
    list.appendChild(el);
  }
}


/* ======= Focus from overview tiles ======= */
function flash(el){
  if (!el) return;
  el.classList.remove("flash");
  // restart animation
  void el.offsetWidth;
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 1100);
}

function requestFocus(id, type){
  state.pendingFocus = { id, type };
}

function requestEdit(id){
  state.pendingEditId = id;
}

function applyPendingEdit(){
  if (!state.pendingEditId) return;
  const id = state.pendingEditId;
  const g = state.data.goals.find(x => x.id === id);
  if (g) openModal("edit", g);
  state.pendingEditId = null;
}

function applyPendingFocus(){
  if (!state.pendingFocus) return;
  const { id, type } = state.pendingFocus;

  // Decide which element to focus depending on type
  let el = null;
  if (type === "daily") el = document.getElementById(`today-${id}`) || document.getElementById(`goal-${id}`);
  if (type === "task") el = document.getElementById(`task-${id}`) || document.getElementById(`goal-${id}`);

  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    flash(el);
  }

  state.pendingFocus = null;
}


/* ======= Calendar helpers ======= */
function monthKeyFromISO(iso){
  // YYYY-MM
  return String(iso).slice(0,7);
}
function monthTitlePL(yyyyMM){
  const [y,m] = yyyyMM.split("-").map(Number);
  const names = ["styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"];
  const name = names[(m||1)-1] || "";
  return `${name} ${y}`;
}
function shiftMonth(yyyyMM, delta){
  const [y,m] = yyyyMM.split("-").map(Number);
  const dt = new Date(y, (m||1)-1, 1);
  dt.setMonth(dt.getMonth() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth()+1).padStart(2,"0");
  return `${yy}-${mm}`;
}
function isoFromYMD(y,m,d){
  const yy = String(y).padStart(4,"0");
  const mm = String(m).padStart(2,"0");
  const dd = String(d).padStart(2,"0");
  return `${yy}-${mm}-${dd}`;
}


function goalsDoneOnDate(dateISO){
  // zwraca listę daily zaznaczonych na ten dzień
  return state.data.goals
    .filter(g => g.type === "daily" && g.dailyLog?.[dateISO] === true);
}

function renderCalendar(){
  const grid = $("#calendarGrid");
  const titleEl = $("#calTitle");
  if (!grid || !titleEl) return;

  const monthKey = state.calendarMonth || monthKeyFromISO(state.selectedDate);
  state.calendarMonth = monthKey;
  titleEl.textContent = monthTitlePL(monthKey);

  const [year, month] = monthKey.split("-").map(Number); // month 1-12
  const first = new Date(year, month-1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  // weekday: 0=Sun..6=Sat; we want Monday=0..Sunday=6
  const firstWeekday = (first.getDay() + 6) % 7;

  // previous month spill
  const prevDays = new Date(year, month-1, 0).getDate();

  // 6 weeks grid (42 cells) for stable layout
  const cells = [];
  for (let i=0;i<42;i++){
    const dayNum = i - firstWeekday + 1;
    let y = year, m = month, d = dayNum;
    let muted = false;

    if (dayNum < 1){
      muted = true;
      d = prevDays + dayNum;
      const prev = new Date(year, month-2, 1);
      y = prev.getFullYear();
      m = prev.getMonth()+1;
    } else if (dayNum > daysInMonth){
      muted = true;
      d = dayNum - daysInMonth;
      const nxt = new Date(year, month, 1);
      y = nxt.getFullYear();
      m = nxt.getMonth()+1;
    }

    const iso = isoFromYMD(y,m,d);
    const doneGoals = goalsDoneOnDate(iso);

    cells.push({ iso, d, muted, doneGoals });
  }

  grid.innerHTML = "";
  const today = todayISO();

  for (const c of cells){
    const el = document.createElement("div");
    el.className = "cal-day" + (c.muted ? " cal-day--muted" : "") + (c.iso === today ? " cal-day--today" : "");
    el.dataset.iso = c.iso;

    const dots = c.doneGoals.slice(0, 8).map(g => `<span class="cal-dot" style="background:${g.color}" title="${escapeHtml(g.name)}"></span>`).join("");
    const more = c.doneGoals.length > 8 ? `<span class="cal-dot" style="background:rgba(255,255,255,.35)" title="+${c.doneGoals.length-8}"></span>` : "";

    el.innerHTML = `
      <div class="cal-day__num">${c.d}</div>
      <div class="cal-dots">${dots}${more}</div>
    `;
    grid.appendChild(el);
  }

  renderCalendarDetails(state.selectedDate);
}

function renderCalendarDetails(dateISO){
  const box = $("#calendarDayDetails");
  if (!box) return;

  const done = goalsDoneOnDate(dateISO);

  if (done.length === 0){
    box.innerHTML = `<div class="card"><div class="card__label">${dateISO}</div><div class="card__value">Brak zaznaczonych Daily</div></div>`;
    return;
  }

  box.innerHTML = done.map(g => `
    <div class="cal-detail">
      <span class="dot" style="background:${g.color}"></span>
      <div class="cal-detail__name">${escapeHtml(g.name)}</div>
    </div>
  `).join("");
}


function render() {
  $("#datePicker").value = state.selectedDate;
renderOverviewTiles();
  renderTodayDaily();
  renderGoals();
  renderTasks();
  renderCalendar();
  renderDiet();
  applyPendingFocus();
  applyPendingEdit();
}

/* ======= View switching (tabs) ======= */
function setView(view) {
  state.view = view;
  if(view === "diet") state.dietWeek = isoWeekKey(state.selectedDate);

  const addBtn = $("#btnAdd");
  if (addBtn){
    addBtn.textContent = (view === "gym") ? "+ Dodaj ćwiczenie" : "+ Dodaj cel";
    addBtn.style.display = (view === "diet") ? "none" : "inline-block";
  }

  const todayView = $("#todayView");
  const goalsView = $("#goalsView");
  const tasksView = $("#tasksView");
  const calendarView = $("#calendarView");
  const gymView = $("#gymView");
  const dietView = $("#dietView");

  if (todayView) todayView.style.display = view === "today" ? "block" : "none";
  if (goalsView) goalsView.style.display = view === "goals" ? "block" : "none";
  if (tasksView) tasksView.style.display = view === "tasks" ? "block" : "none";
  if (calendarView) calendarView.style.display = view === "calendar" ? "block" : "none";
  if (gymView) gymView.style.display = view === "gym" ? "block" : "none";
  if (dietView) dietView.style.display = view === "diet" ? "block" : "none";

  const tabToday = $("#tabToday");
  const tabGoals = $("#tabGoals");
  const tabTasks = $("#tabTasks");
  const tabCalendar = $("#tabCalendar");
  const tabGym = $("#tabGym");
  const tabDiet = $("#tabDiet");
  if (tabToday) tabToday.classList.toggle("chip--active", view === "today");
  if (tabGoals) tabGoals.classList.toggle("chip--active", view === "goals");
  if (tabTasks) tabTasks.classList.toggle("chip--active", view === "tasks");
  if (tabCalendar) tabCalendar.classList.toggle("chip--active", view === "calendar");
  if (tabGym) tabGym.classList.toggle("chip--active", view === "gym");
  if (tabDiet) tabDiet.classList.toggle("chip--active", view === "diet");

  render();
}

/* ======= Modal ======= */
function openModal(mode, goal = null) {
  const modal = $("#modal");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");

  $("#modalTitle").textContent = mode === "edit" ? "Edytuj cel" : "Dodaj cel";

  $("#editingId").value = goal?.id || "";
  $("#goalName").value = goal?.name || "";
  $("#goalType").value = goal?.type || "daily";
  $("#goalColor").value = goal?.color || "#3b82f6";
  $("#goalNote").value = goal?.note || "";

  const showEl = $("#showInOverview");
  if (showEl) showEl.checked = (goal?.showInOverview !== false);

  const dailyTargetEl = $("#dailyTarget");
  if (dailyTargetEl) dailyTargetEl.value = String(goal?.dailyTarget ?? 150);

  const taskItemsEl = $("#taskItems");
  if (taskItemsEl) taskItemsEl.value = (goal?.type === "task" && Array.isArray(goal.items))
    ? goal.items.map(i => i.text).join("\n")
    : "";

  refreshFields();
}

function closeModal() {
  const modal = $("#modal");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function refreshFields() {
  const type = $("#goalType").value;
  const dailyFields = $("#dailyFields");
  const taskFields = $("#taskFields");

  if (dailyFields) dailyFields.style.display = (type === "daily") ? "flex" : "none";
  if (taskFields) taskFields.style.display = (type === "task") ? "flex" : "none";
}

/* ======= Filters ONLY for goals view ======= */
function bindGoalFilters() {
  const buttons = $$("#goalsView .chip[data-filter]");
  if (buttons.length === 0) return;

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("chip--active"));
      btn.classList.add("chip--active");
      state.filter = btn.dataset.filter || "all";
      renderGoals();
    });
  });
}

/* ======= Events ======= */
function init() {
  loadAppearance();
  bindUiModal();

  // date controls
  $("#datePicker").addEventListener("change", (e) => {
    state.selectedDate = e.target.value;
    render();
  });

  $("#btnToday").addEventListener("click", () => {
    state.selectedDate = todayISO();
    render();
  });

  $("#btnPrevDay").addEventListener("click", () => {
    state.selectedDate = shiftISODate(state.selectedDate, -1);
    render();
  });

  $("#btnNextDay").addEventListener("click", () => {
    state.selectedDate = shiftISODate(state.selectedDate, +1);
    render();
  });

  // tabs
  $("#tabToday")?.addEventListener("click", () => setView("today"));
  $("#tabGoals")?.addEventListener("click", () => setView("goals"));
  $("#tabTasks")?.addEventListener("click", () => setView("tasks"));
  $("#tabCalendar")?.addEventListener("click", () => setView("calendar"));
  $("#tabGym")?.addEventListener("click", () => setView("gym"));
  $("#tabDiet")?.addEventListener("click", () => setView("diet"));

  // today list actions
  $("#todayDailyList")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.action === "toggleDailyToday") {
      toggleDaily(btn.dataset.id, state.selectedDate);
    }
  });

  // overview tiles: klik przenosi do celu + podświetla
  $("#overviewGrid")?.addEventListener("click", (e) => {
    const tile = e.target.closest(".overview-tile");
    if (!tile) return;
    if (tile.dataset.action !== "focusFromOverview") return;

    const id = tile.dataset.id;
    const type = tile.dataset.type;
    if (!id || !type) return;

    if (type === "daily") {
      // Daily: przejdź do zakładki "Cele" i otwórz edycję
      // UWAGA: ustawiamy pending* PRZED setView(), bo setView() od razu robi render()
      state.filter = "daily";
      requestFocus(id, type);
      requestEdit(id);

      setView("goals");

      // ustaw aktywny chip filtra jeśli istnieje
      const chips = Array.from(document.querySelectorAll("#goalsView .chip[data-filter]"));
      chips.forEach(c => c.classList.toggle("chip--active", c.dataset.filter === "daily"));
      return;
    }

    if (type === "task") {
      // Task: przejdź do zakładki "Taski" i otwórz edycję
      requestFocus(id, type);
      requestEdit(id);
      setView("tasks");
      return;
    }
  });

  // klawiatura: Enter / Spacja na kafelku
  $("#overviewGrid")?.addEventListener("keydown", (e) => {
    const tile = e.target.closest(".overview-tile");
    if (!tile) return;
    if (tile.dataset.action !== "focusFromOverview") return;

    if (e.key === "Enter" || e.key === " " || e.code === "Space") {
      e.preventDefault();
      tile.click();
    }
  });


  // calendar nav
  $("#calPrev")?.addEventListener("click", () => {
    state.calendarMonth = shiftMonth(state.calendarMonth || monthKeyFromISO(state.selectedDate), -1);
    renderCalendar();
  renderDiet();
  });
  $("#calNext")?.addEventListener("click", () => {
    state.calendarMonth = shiftMonth(state.calendarMonth || monthKeyFromISO(state.selectedDate), +1);
    renderCalendar();
  renderDiet();
  });
  $("#calThis")?.addEventListener("click", () => {
    state.calendarMonth = monthKeyFromISO(todayISO());
    renderCalendar();
  renderDiet();
  });

  $("#calendarGrid")?.addEventListener("click", (e) => {
    const cell = e.target.closest(".cal-day");
    if (!cell) return;
    const iso = cell.dataset.iso;
    if (!iso) return;
    state.selectedDate = iso;
    // klik w dzień: przejdź do "Dzisiaj" (odhaczanie) i ustaw datę
    setView("today");
    render();
  });

  
  // gym week nav
  $("#gymPrevWeek")?.addEventListener("click", () => {
    state.gymWeek = shiftWeek(state.gymWeek, -1);
    renderGym();
  });
  $("#gymNextWeek")?.addEventListener("click", () => {
    state.gymWeek = shiftWeek(state.gymWeek, +1);
    renderGym();
  });
  $("#gymThisWeek")?.addEventListener("click", () => {
    state.gymWeek = isoWeekKey(todayISO());
    renderGym();
  });

  // diet week nav
  $("#dietPrevWeek")?.addEventListener("click", () => {
    state.dietWeek = shiftWeek(state.dietWeek, -1);
    renderDiet();
  });
  $("#dietNextWeek")?.addEventListener("click", () => {
    state.dietWeek = shiftWeek(state.dietWeek, +1);
    renderDiet();
  });
  $("#dietThisWeek")?.addEventListener("click", () => {
    state.dietWeek = isoWeekKey(todayISO());
    renderDiet();
  });

  // diet: targets inputs
  const dietTargetsHandler = () => {
    setDietTargets({
      kcal: $("#dietTargetKcal")?.value,
      p: $("#dietTargetP")?.value,
      c: $("#dietTargetC")?.value,
      f: $("#dietTargetF")?.value,
    });
    renderDiet();
  };
  $("#dietTargetKcal")?.addEventListener("change", dietTargetsHandler);
  $("#dietTargetP")?.addEventListener("change", dietTargetsHandler);
  $("#dietTargetC")?.addEventListener("change", dietTargetsHandler);
  $("#dietTargetF")?.addEventListener("change", dietTargetsHandler);

  // diet: daily inputs (selected date)
  const dietDayHandler = () => {
    setDietLog(state.selectedDate, {
      kcal: $("#dietInKcal")?.value,
      p: $("#dietInP")?.value,
      c: $("#dietInC")?.value,
      f: $("#dietInF")?.value,
    });
    // keep week in sync with selected date (optional convenience)
    state.dietWeek = isoWeekKey(state.selectedDate);
    renderDiet();
  };
  $("#dietInKcal")?.addEventListener("change", dietDayHandler);
  $("#dietInP")?.addEventListener("change", dietDayHandler);
  $("#dietInC")?.addEventListener("change", dietDayHandler);
  $("#dietInF")?.addEventListener("change", dietDayHandler);

  // gym workout selector (A/B/C)
  const workoutBtns = [$("#gymWorkoutA"), $("#gymWorkoutB"), $("#gymWorkoutC")].filter(Boolean);
  workoutBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.workout || "A";
      state.gymWorkout = (key === "B" || key === "C") ? key : "A";
      workoutBtns.forEach(b => b.classList.toggle("chip--active", b.dataset.workout === state.gymWorkout));
      renderGym();
    });
  });


  // gym list inputs + actions
  // NOTE: iOS Safari can be flaky with "input" events for numeric keyboards.
  // We handle both input + change + blur to ensure values are persisted.
  const handleGymLog = (e) => {
    const el = e.target;
    if (el?.dataset?.action !== "gymLog") return;
    const id = el.dataset.id;
    const field = el.dataset.field;
    if (!id || !field) return;

    // iOS/PL keyboard: decimal comma -> dot
    if(field === "weight"){
      const norm = normalizeDecimalString(el.value);
      if(norm !== el.value) el.value = norm;
    }

    const cur = getGymLog(state.gymWeek, state.gymWorkout || "A", id);
    const sets = field === "sets" ? el.value : cur.sets;
    const reps = field === "reps" ? el.value : cur.reps;
    const weight = field === "weight" ? el.value : cur.weight;
    setGymLog(state.gymWeek, state.gymWorkout || "A", id, sets, reps, weight);
  };
  $("#gymList")?.addEventListener("input", handleGymLog);
  $("#gymList")?.addEventListener("change", handleGymLog);
  // blur doesn't bubble, so we capture
  $("#gymList")?.addEventListener("blur", handleGymLog, true);

  $("#gymList")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!action || !id) return;

    if (action === "gymHistory"){
      openGymHistory(id);
      return;
    }
    if (action === "gymEdit"){
      const ex = state.gym.exercises.find(x => x.id === id);
      if (ex) openGymModal("edit", ex);
      return;
    }
    if (action === "gymDelete"){
      const ex = state.gym.exercises.find(x => x.id === id);
      const name = ex?.name || "to ćwiczenie";
      if (await uiConfirm(`Usunąć: "${name}"?`)) deleteExercise(id);
      return;
    }
  });

  // gym modal close
  $("#btnCloseGymModal")?.addEventListener("click", closeGymModal);
  $("#gymModalBackdrop")?.addEventListener("click", closeGymModal);
  $("#btnCancelGym")?.addEventListener("click", closeGymModal);

  // gym modal submit
  $("#gymForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: $("#exName")?.value || "",
      scheme: $("#exScheme")?.value || "",
      note: $("#exNote")?.value || "",
      workout: $("#exWorkout")?.value || (state.gymWorkout || "A"),
    };
    if (!payload.name.trim()){
      await uiAlert("Podaj nazwę ćwiczenia.");
      return;
    }
    const editingId = $("#editingExId")?.value || "";
    if (editingId) updateExercise(editingId, payload);
    else addExercise(payload);
    closeGymModal();
  });

  // gym history modal close
  $("#btnCloseGymHistory")?.addEventListener("click", closeGymHistory);
  $("#gymHistoryBackdrop")?.addEventListener("click", closeGymHistory);


  // settings (appearance)
  $("#btnSettings")?.addEventListener("click", openSettings);
  $("#btnCloseSettings")?.addEventListener("click", closeSettings);
  $("#btnCloseSettings2")?.addEventListener("click", closeSettings);
  $("#settingsBackdrop")?.addEventListener("click", closeSettings);

  $("#gradientPresets")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if(!btn) return;
    const key = btn.dataset.preset;
    if(!key) return;
    applyGradientPreset(key);
  });

  $("#btnResetGradient")?.addEventListener("click", () => applyGradientPreset("blue"));



// add goal
  $("#btnAdd").addEventListener("click", () => {
    if (state.view === "gym") return void openGymModal("add");
    openModal("add");
  });
// modal close
  $("#btnCloseModal").addEventListener("click", closeModal);
  $("#modalBackdrop").addEventListener("click", closeModal);
  $("#btnCancel").addEventListener("click", closeModal);

  $("#goalType").addEventListener("change", refreshFields);

  // submit form
  $("#goalForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const type = $("#goalType").value;

    const payload = {
      name: $("#goalName").value,
      type,
      color: $("#goalColor").value,
      note: $("#goalNote").value,
      showInOverview: document.getElementById("showInOverview")?.checked,
      dailyTarget: $("#dailyTarget") ? $("#dailyTarget").value : 150,
      items: [],
    };

    if (!payload.name.trim()) {
      await uiAlert("Podaj nazwę celu.");
      return;
    }

    if (type === "daily") {
      const t = Math.floor(Number(payload.dailyTarget) || 0);
      if (!Number.isFinite(t) || t <= 0) {
        await uiAlert("Dla Daily podaj dodatnią liczbę (cel roczny).");
        return;
      }
      payload.dailyTarget = t;
    } else {
      const raw = ($("#taskItems")?.value || "")
        .split("\n")
        .map(s => s.trim())
        .filter(Boolean);
      payload.items = raw.map(text => ({ text, done: false }));
    }

    const editingId = $("#editingId").value;
    if (editingId) updateGoal(editingId, payload);
    else addGoal(payload);

    closeModal();
  });

  // goals list actions (delegation)
  $("#goalsList")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!action || !id) return;

    if (action === "toggleDaily") return void toggleDaily(id, state.selectedDate);

    if (action === "edit") {
      const g = state.data.goals.find(x => x.id === id);
      if (g) openModal("edit", g);
      return;
    }

    if (action === "delete") {
      const g = state.data.goals.find(x => x.id === id);
      const name = g?.name || "ten cel";
      if (await uiConfirm(`Usunąć: "${name}"?`)) deleteGoal(id);
      return;
    }
  });

  // tasks list: checkbox change + buttons
  $("#tasksList")?.addEventListener("change", (e) => {
    const el = e.target;
    if (el?.dataset?.action !== "toggleItem") return;
    const id = el.dataset.id;
    const idx = Number(el.dataset.idx);
    if (!id || !Number.isFinite(idx)) return;
    toggleTaskItem(id, idx);
  });

  $("#tasksList")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!action || !id) return;

    if (action === "editTask") {
      const g = state.data.goals.find(x => x.id === id && x.type === "task");
      if (g) openModal("edit", g);
      return;
    }
    if (action === "deleteTask") {
      const g = state.data.goals.find(x => x.id === id && x.type === "task");
      const name = g?.name || "ten task";
      if (await uiConfirm(`Usunąć: "${name}"?`)) deleteGoal(id);
      return;
    }
  });

  // bind filters ONLY inside goals view
  bindGoalFilters();

  // initial render
  $("#datePicker").value = state.selectedDate;
  setView(state.view);
  refreshFields();
}

/* ======= Utilities ======= */
function shiftISODate(iso, days) {
  const [y, m, d] = String(iso).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
