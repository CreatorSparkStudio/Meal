// ====== Settings ======
const FRIENDS = ["Muneeb", "Awais", "Balghari", "Minhal"];
const STORAGE_KEY = "khana-chai-entries-v1";
const TYPE_LABEL = { khana: "Khana (کھانا)", chai: "Chai (ٹی)" };

// ====== State ======
let entries = load();

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ====== Helpers ======
const $ = (id) => document.getElementById(id);

function todayStr() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function formatDate(str) {
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function nextFor(type) {
  const stats = FRIENDS.map((name) => {
    const mine = entries.filter((e) => e.type === type && e.person === name);
    const last = mine.reduce((max, e) => (e.date > max ? e.date : max), "");
    return { name, count: mine.length, last };
  });
  stats.sort((a, b) => {
    if (a.count !== b.count) return a.count - b.count;
    if (a.last !== b.last) return a.last < b.last ? -1 : 1; // "" (never) sorts first
    return FRIENDS.indexOf(a.name) - FRIENDS.indexOf(b.name);
  });
  return stats[0].name;
}

// ====== Render ======
function renderNext() {
  $("nextKhana").textContent = nextFor("khana");
  $("nextChai").textContent = nextFor("chai");
}

function renderScore() {
  const tbody = document.querySelector("#scoreTable tbody");
  tbody.innerHTML = "";
  FRIENDS.forEach((name) => {
    const k = entries.filter((e) => e.person === name && e.type === "khana").length;
    const c = entries.filter((e) => e.person === name && e.type === "chai").length;
    const tr = document.createElement("tr");
    [name, k, c, k + c].forEach((val) => {
      const td = document.createElement("td");
      td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function renderHistory() {
  const filter = $("filter").value;
  const list = $("history");
  list.innerHTML = "";

  const shown = entries
    .filter((e) => filter === "all" || e.type === filter)
    .sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));

  if (shown.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No entries yet.";
    list.appendChild(li);
    return;
  }

  shown.forEach((e) => {
    const li = document.createElement("li");
    li.className = "item";

    const badge = document.createElement("span");
    badge.className = "badge " + e.type;
    badge.textContent = e.type === "khana" ? "Khana" : "Chai";

    const info = document.createElement("div");
    info.className = "info";
    const who = document.createElement("div");
    who.className = "who";
    who.textContent = e.person;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = formatDate(e.date) + (e.note ? " · " + e.note : "");
    info.append(who, meta);

    const del = document.createElement("button");
    del.className = "del";
    del.title = "Delete";
    del.textContent = "✕";
    del.addEventListener("click", () => {
      if (confirm("Delete this entry?")) {
        entries = entries.filter((x) => x.id !== e.id);
        save();
        render();
      }
    });

    li.append(badge, info, del);
    list.appendChild(li);
  });
}

function render() {
  renderNext();
  renderScore();
  renderHistory();
}

// ====== Events ======
function init() {
  const personSel = $("person");
  FRIENDS.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    personSel.appendChild(opt);
  });
  $("date").value = todayStr();

  // Pre-select the suggested person when type changes
  const suggest = () => { personSel.value = nextFor($("type").value); };
  $("type").addEventListener("change", suggest);
  suggest();

  $("entryForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    entries.push({
      id: Date.now(),
      type: $("type").value,
      person: personSel.value,
      date: $("date").value,
      note: $("note").value.trim(),
    });
    save();
    $("note").value = "";
    render();
    suggest();
  });

  $("filter").addEventListener("change", renderHistory);

  $("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "khana-chai-backup-" + todayStr() + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error("Invalid file");
        const valid = data.filter(
          (e) => e && TYPE_LABEL[e.type] && FRIENDS.includes(e.person) && e.date
        );
        // merge, skipping duplicates by id
        const ids = new Set(entries.map((e) => e.id));
        valid.forEach((e) => { if (!ids.has(e.id)) entries.push(e); });
        save();
        render();
        alert("Imported " + valid.length + " entries.");
      } catch {
        alert("Could not read that file.");
      }
    };
    reader.readAsText(file);
    ev.target.value = "";
  });

  $("clearBtn").addEventListener("click", () => {
    if (confirm("Delete ALL entries? This cannot be undone.")) {
      entries = [];
      save();
      render();
    }
  });

  render();
}

init();
