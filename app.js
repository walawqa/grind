/* ===========================
   Cele — lokalny tracker (v1.3)
   - 100% offline (localStorage)
   - Daily: odznaczane per dzień + cel roczny (target) -> % liczy się automatycznie
   - Task: checklista (podzadania bez dat) -> % = wykonane / wszystkie
   - Widoki: Dzisiaj / Cele / Taski
=========================== */

const LS_KEY = "goals_tracker_v1";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  data: loadData(),
  selectedDate: todayISO(),
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

    return parsed;
  } catch {
    return { version: 1, goals: [] };
  }
}

function saveData() {
  localStorage.setItem(LS_KEY, JSON.stringify(state.data));
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

/* ======= Export/Import ======= */
function exportData() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cele-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importDataFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || !Array.isArray(parsed.goals)) throw new Error("Zły format pliku.");
      state.data = { version: 1, goals: parsed.goals };
      // ponowna migracja/normalizacja
      state.data = loadDataFromObject(state.data);
      saveData();
      render();
      alert("Import zakończony.");
    } catch (e) {
      alert("Nie udało się zaimportować: " + (e?.message || "Błąd"));
    }
  };
  reader.readAsText(file);
}

// Używane po imporcie: wpuść dane przez tę samą logikę co loadData()
function loadDataFromObject(obj) {
  try {
    const parsed = obj;
    if (!parsed || !Array.isArray(parsed.goals)) return { version: 1, goals: [] };

    for (const g of parsed.goals) {
      if ("progress" in g) delete g.progress;

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
        g.items = g.items
          .filter(x => x && typeof x.text === "string")
          .map(x => ({ text: x.text.trim(), done: Boolean(x.done) }))
          .filter(x => x.text.length > 0);
      }
    }
    return parsed;
  } catch {
    return { version: 1, goals: [] };
  }
}

/* ======= UI ======= */
function renderSummary() {
  const { done, total } = getDailyDoneCount(state.selectedDate);
  $("#dailyDone").textContent = String(done);
  $("#dailyTotal").textContent = String(total);
  $("#dailyPct").textContent = `${dailyPercentForDay(state.selectedDate)}%`;

  const yr = yearFromISO(state.selectedDate);
  const overall = overallPercentForYear(yr);
  const overallEl = $("#overallPct");
  if (overallEl) overallEl.textContent = `${overall}%`;
}


function renderOverviewTiles() {
  const grid = $("#overviewGrid");
  if (!grid) return;

  const year = state.selectedDate.slice(0, 4);
  const goals = Array.isArray(state.data.goals) ? state.data.goals : [];

  grid.innerHTML = "";

  if (goals.length === 0) {
    grid.innerHTML = `<div class="card">
      <div class="card__label">Brak celów</div>
      <div class="card__value">Dodaj pierwszy cel</div>
    </div>`;
    return;
  }

  for (const g of goals) {
    let pct = 0;
    let sub = "";

    if (g.type === "daily") {
      pct = getDailyPercentYear(g, year);
      sub = `${getDailyCountInYear(g, year)}/${getDailyTarget(g)} • 🔥${getDailyCurrentStreak(g, state.selectedDate)} 🏆${getDailyBestStreak(g)}`;
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
        <span class="pill" title="Postęp roczny">${countY}/${target} • ${pctY}% • 🔥${getDailyCurrentStreak(g, state.selectedDate)} 🏆${getDailyBestStreak(g)}</span>
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
            <span class="pill">${countY}/${target} • 🔥${getDailyCurrentStreak(g, state.selectedDate)} 🏆${getDailyBestStreak(g)}</span>
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
  renderSummary();
  renderOverviewTiles();
  renderTodayDaily();
  renderGoals();
  renderTasks();
  renderCalendar();
  applyPendingFocus();
  applyPendingEdit();
}

/* ======= View switching (tabs) ======= */
function setView(view) {
  state.view = view;

  const todayView = $("#todayView");
  const goalsView = $("#goalsView");
  const tasksView = $("#tasksView");
  const calendarView = $("#calendarView");

  if (todayView) todayView.style.display = view === "today" ? "block" : "none";
  if (goalsView) goalsView.style.display = view === "goals" ? "block" : "none";
  if (tasksView) tasksView.style.display = view === "tasks" ? "block" : "none";
  if (calendarView) calendarView.style.display = view === "calendar" ? "block" : "none";

  const tabToday = $("#tabToday");
  const tabGoals = $("#tabGoals");
  const tabTasks = $("#tabTasks");
  if (tabToday) tabToday.classList.toggle("chip--active", view === "today");
  if (tabGoals) tabGoals.classList.toggle("chip--active", view === "goals");
  if (tabTasks) tabTasks.classList.toggle("chip--active", view === "tasks");

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
  });
  $("#calNext")?.addEventListener("click", () => {
    state.calendarMonth = shiftMonth(state.calendarMonth || monthKeyFromISO(state.selectedDate), +1);
    renderCalendar();
  });
  $("#calThis")?.addEventListener("click", () => {
    state.calendarMonth = monthKeyFromISO(todayISO());
    renderCalendar();
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

  // add goal
  $("#btnAdd").addEventListener("click", () => openModal("add"));

  // modal close
  $("#btnCloseModal").addEventListener("click", closeModal);
  $("#modalBackdrop").addEventListener("click", closeModal);
  $("#btnCancel").addEventListener("click", closeModal);

  $("#goalType").addEventListener("change", refreshFields);

  // submit form
  $("#goalForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const type = $("#goalType").value;

    const payload = {
      name: $("#goalName").value,
      type,
      color: $("#goalColor").value,
      note: $("#goalNote").value,
      dailyTarget: $("#dailyTarget") ? $("#dailyTarget").value : 150,
      items: [],
    };

    if (!payload.name.trim()) {
      alert("Podaj nazwę celu.");
      return;
    }

    if (type === "daily") {
      const t = Math.floor(Number(payload.dailyTarget) || 0);
      if (!Number.isFinite(t) || t <= 0) {
        alert("Dla Daily podaj dodatnią liczbę (cel roczny).");
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
  $("#goalsList")?.addEventListener("click", (e) => {
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
      if (confirm(`Usunąć: "${name}"?`)) deleteGoal(id);
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

  $("#tasksList")?.addEventListener("click", (e) => {
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
      if (confirm(`Usunąć: "${name}"?`)) deleteGoal(id);
      return;
    }
  });

  // export/import
  $("#btnExport").addEventListener("click", exportData);
  $("#fileImport").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importDataFromFile(file);
    e.target.value = "";
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
