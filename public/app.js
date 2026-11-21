/* ══════════════════════════════════════════
   State
══════════════════════════════════════════ */
const state = {
  dashboard: null,
  messages: [],
  selectedAdminRecord: null
};

/* ══════════════════════════════════════════
   Element refs
══════════════════════════════════════════ */
const elements = {
  // Home page
  sourceCount:      document.querySelector("#source-count"),
  sourceHealthList: document.querySelector("#source-health-list"),
  metricSources:    document.querySelector("#metric-sources"),
  metricTools:      document.querySelector("#metric-tools"),
  metricSync:       document.querySelector("#metric-sync"),
  campusName:       document.querySelector("#campus-name"),
  todayLabel:       document.querySelector("#today-label"),
  refreshButton:    document.querySelector("#refresh-button"),

  // Sources page
  sourceCards:      document.querySelector("#source-cards"),
  refreshButton2:   document.querySelector("#refresh-button-2"),

  // Assistant page
  assistantForm:    document.querySelector("#assistant-form"),
  assistantInput:   document.querySelector("#assistant-input"),
  askButton:        document.querySelector("#ask-button"),
  assistantState:   document.querySelector("#assistant-state"),
  chatLog:          document.querySelector("#chat-log"),
  traceCount:       document.querySelector("#trace-count"),
  toolTrace:        document.querySelector("#tool-trace"),
  suggestions:      document.querySelector("#suggestions"),
  adminKey:         document.querySelector("#admin-key"),
  adminSource:      document.querySelector("#admin-source"),
  adminLoad:        document.querySelector("#admin-load"),
  adminStatus:      document.querySelector("#admin-status"),
  adminRecordList:  document.querySelector("#admin-record-list"),
  adminJson:        document.querySelector("#admin-json"),
  adminCreate:      document.querySelector("#admin-create"),
  adminUpdate:      document.querySelector("#admin-update"),
  adminDelete:      document.querySelector("#admin-delete"),
};

/* ══════════════════════════════════════════
   Multi-page routing
══════════════════════════════════════════ */
function navigateTo(pageId) {
  // Hide all pages
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));

  // Show target
  const target = document.querySelector(`#page-${pageId}`);
  if (target) target.classList.add("active");

  // Update desktop nav
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });

  // Update mobile nav
  document.querySelectorAll(".mnav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });
}

// Wire desktop nav
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => navigateTo(btn.dataset.page));
});

// Wire mobile nav
document.querySelectorAll(".mnav-btn").forEach((btn) => {
  btn.addEventListener("click", () => navigateTo(btn.dataset.page));
});

// Home quick-ask cards → go to assistant + ask
document.querySelectorAll("#home-suggestions .qa-card").forEach((card) => {
  card.addEventListener("click", () => {
    const text = card.querySelector("span:last-child").textContent;
    navigateTo("assistant");
    askAssistant(text);
  });
});

/* ══════════════════════════════════════════
   Utilities
══════════════════════════════════════════ */
const formatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit"
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

/* ══════════════════════════════════════════
   Dashboard rendering
══════════════════════════════════════════ */
function setLoadingCards() {
  elements.sourceCards.innerHTML = `
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
  `;
}

function renderHealth(sources) {
  // Update count badge
  if (elements.sourceCount) elements.sourceCount.textContent = sources.length;

  // Health grid on home page
  if (elements.sourceHealthList) {
    elements.sourceHealthList.innerHTML = sources
      .map(
        (source) => `
          <div class="health-card">
            <span class="health-dot" style="background:${source.accent}"></span>
            <div class="health-card-info">
              <strong>${escapeHtml(source.label)}</strong>
              <span>${source.tools.length} tool${source.tools.length !== 1 ? "s" : ""} active</span>
            </div>
            <span class="health-status">Online</span>
          </div>
        `
      )
      .join("");
  }
}

function renderSourceCards(sources) {
  elements.sourceCards.innerHTML = sources
    .map((source) => {
      const items = source.items
        .slice(0, 4)
        .map(
          (item) => `
            <div class="mini-item">
              <div>
                <strong title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.detail)}</span>
              </div>
              <em>${escapeHtml(item.status)}</em>
            </div>
          `
        )
        .join("");

      return `
        <article class="source-card" style="border-top:3px solid ${source.accent}">
          <div class="source-card-top">
            <div>
              <h4>${escapeHtml(source.label)}</h4>
              <p class="source-desc">${escapeHtml(source.description)}</p>
            </div>
            <div class="source-metric">
              <strong>${escapeHtml(source.metric)}</strong>
              <span>${escapeHtml(source.metricLabel)}</span>
            </div>
          </div>
          <p class="source-secondary">${escapeHtml(source.secondary)}</p>
          <div class="item-list">${items}</div>
        </article>
      `;
    })
    .join("");
}

function renderDashboard(snapshot) {
  state.dashboard = snapshot;
  elements.metricSources.textContent = snapshot.stats.liveSources;
  elements.metricTools.textContent   = snapshot.stats.totalTools;
  elements.metricSync.textContent    = "Rule-based";
  elements.campusName.textContent    = snapshot.stats.campusName;
  elements.todayLabel.textContent    = formatter.format(new Date(snapshot.stats.updatedAt));
  renderHealth(snapshot.sources);
  renderSourceCards(snapshot.sources);
}

/* ══════════════════════════════════════════
   Chat / Assistant
══════════════════════════════════════════ */
function markdownLite(text) {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  const chunks = [];
  let list = [];

  function flushList() {
    if (list.length) {
      chunks.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
      list = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
    } else {
      flushList();
      chunks.push(`<p>${escapeHtml(line)}</p>`);
    }
  }

  flushList();
  return chunks.join("");
}

function addMessage(role, text, sources = []) {
  state.messages.push({ role, text, sources });

  const sourcePills = sources.length
    ? `<div class="source-pills">${sources
        .map(
          (src) =>
            `<span class="source-pill" style="border-left:3px solid ${src.accent}">${escapeHtml(src.label)}</span>`
        )
        .join("")}</div>`
    : "";

  const node = document.createElement("div");
  node.className = `message ${role}`;
  node.innerHTML = `${markdownLite(text)}${sourcePills}`;
  elements.chatLog.appendChild(node);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
}

function renderTrace(trace = []) {
  elements.traceCount.textContent = trace.length;
  elements.toolTrace.innerHTML = trace.length
    ? trace
        .map(
          (entry) => `
            <div class="trace-item">
              <strong>${escapeHtml(entry.label)}: ${escapeHtml(entry.tool)}</strong>
              <span>${entry.latencyMs} ms</span>
            </div>
          `
        )
        .join("")
    : `<div class="trace-item"><strong>No tool calls yet</strong><span>idle</span></div>`;
}

/* ══════════════════════════════════════════
   Admin
══════════════════════════════════════════ */
function adminHeaders() {
  return {
    authorization: `Bearer ${elements.adminKey.value.trim()}`,
    "content-type": "application/json"
  };
}

function adminRecordId(record) {
  return record.id || record.day;
}

async function loadAdminRecords() {
  elements.adminStatus.textContent = "Loading…";
  try {
    const payload = await fetchJson(`/api/admin/${elements.adminSource.value}`, {
      headers: adminHeaders()
    });
    const documentPayload = payload.result;
    const source = elements.adminSource.value;
    const collection = source === "library" ? "books"
      : source === "cafeteria" ? "menu"
      : source === "academics" ? "entries"
      : source === "hostel" ? "blocks"
      : "events";
    const records = documentPayload[collection] || [];
    elements.adminRecordList.innerHTML = records.length
      ? records.map((record) => `
          <div class="admin-record">
            <strong>${escapeHtml(record.title || record.name || record.day || record.id)}</strong>
            <button type="button" class="btn-ghost admin-select" data-id="${escapeHtml(adminRecordId(record))}">Edit</button>
          </div>
        `).join("")
      : "<p>No records.</p>";
    elements.adminStatus.textContent = `${records.length} records loaded`;
  } catch (error) {
    elements.adminStatus.textContent = error.message;
  }
}

async function createAdminRecord() {
  try {
    const record = JSON.parse(elements.adminJson.value);
    await fetchJson(`/api/admin/${elements.adminSource.value}`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(record)
    });
    elements.adminStatus.textContent = "Record created";
    await loadAdminRecords();
  } catch (error) {
    elements.adminStatus.textContent = error.message;
  }
}

async function updateAdminRecord() {
  if (!state.selectedAdminRecord) {
    elements.adminStatus.textContent = "Select a record to edit";
    return;
  }
  try {
    const record = JSON.parse(elements.adminJson.value);
    await fetchJson(`/api/admin/${elements.adminSource.value}/${encodeURIComponent(state.selectedAdminRecord)}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify(record)
    });
    elements.adminStatus.textContent = "Record updated";
    await loadAdminRecords();
  } catch (error) {
    elements.adminStatus.textContent = error.message;
  }
}

async function deleteAdminRecord() {
  if (!state.selectedAdminRecord) {
    elements.adminStatus.textContent = "Select a record to delete";
    return;
  }
  try {
    await fetchJson(`/api/admin/${elements.adminSource.value}/${encodeURIComponent(state.selectedAdminRecord)}`, {
      method: "DELETE",
      headers: adminHeaders()
    });
    state.selectedAdminRecord = null;
    elements.adminStatus.textContent = "Record deleted";
    await loadAdminRecords();
  } catch (error) {
    elements.adminStatus.textContent = error.message;
  }
}

/* ══════════════════════════════════════════
   API calls
══════════════════════════════════════════ */
async function loadDashboard() {
  setLoadingCards();
  elements.refreshButton.disabled  = true;
  if (elements.refreshButton2) elements.refreshButton2.disabled = true;

  try {
    const snapshot = await fetchJson("/api/dashboard");
    renderDashboard(snapshot);
  } catch (error) {
    elements.sourceCards.innerHTML = `
      <div class="message assistant">
        <p>${escapeHtml(error.message)}</p>
      </div>`;
  } finally {
    elements.refreshButton.disabled  = false;
    if (elements.refreshButton2) elements.refreshButton2.disabled = false;
  }
}

async function askAssistant(message) {
  const cleanMessage = message.trim();
  if (!cleanMessage) return;

  addMessage("user", cleanMessage);
  elements.assistantInput.value = "";
  elements.askButton.disabled   = true;
  elements.assistantState.textContent = "Querying…";

  try {
    const response = await fetchJson("/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: cleanMessage })
    });
    addMessage("assistant", response.answer, response.sources);
    renderTrace(response.toolTrace);
  } catch (error) {
    addMessage("assistant", `I could not complete that request. ${error.message}`);
  } finally {
    elements.askButton.disabled = false;
    elements.assistantState.textContent = "Ready";
    elements.assistantInput.focus();
  }
}

/* ══════════════════════════════════════════
   Event listeners
══════════════════════════════════════════ */
elements.refreshButton.addEventListener("click", loadDashboard);
if (elements.refreshButton2) {
  elements.refreshButton2.addEventListener("click", loadDashboard);
}

elements.assistantForm.addEventListener("submit", (event) => {
  event.preventDefault();
  askAssistant(elements.assistantInput.value);
});

elements.suggestions.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  askAssistant(button.textContent);
});

elements.assistantInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    elements.assistantForm.requestSubmit();
  }
});

elements.adminLoad.addEventListener("click", loadAdminRecords);
elements.adminCreate.addEventListener("click", createAdminRecord);
elements.adminUpdate.addEventListener("click", updateAdminRecord);
elements.adminDelete.addEventListener("click", deleteAdminRecord);
elements.adminRecordList.addEventListener("click", async (event) => {
  const button = event.target.closest(".admin-select");
  if (!button) return;
  state.selectedAdminRecord = button.dataset.id;
  try {
    const payload = await fetchJson(
      `/api/admin/${elements.adminSource.value}/${encodeURIComponent(state.selectedAdminRecord)}`,
      { headers: adminHeaders() }
    );
    elements.adminJson.value = JSON.stringify(payload.result, null, 2);
    elements.adminStatus.textContent = `Selected ${state.selectedAdminRecord}`;
  } catch (error) {
    elements.adminStatus.textContent = error.message;
  }
});

/* ══════════════════════════════════════════
   Init
══════════════════════════════════════════ */
renderTrace();
addMessage("assistant", "Library, Cafeteria, Events, Academics, and Hostel are available. This assistant uses a rule-based fallback.");
loadDashboard();