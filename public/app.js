const state = {
  view: "home",
  opportunities: [],
  categories: [],
  activeCategory: "all",
  activeLevel: "all",
  searchTerm: "",
  sortByMatch: false,
  profile: JSON.parse(localStorage.getItem("sb_profile") || "null"),
  saved: new Set(JSON.parse(localStorage.getItem("sb_saved") || "[]")),
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove("show"), 1800);
}

function setView(view) {
  state.view = view;
  $$(".view").forEach((v) => v.classList.add("hidden"));
  $(`#view-${view}`).classList.remove("hidden");
  $$(".nav-link").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  if (view === "dashboard") renderDashboard();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("#nav").addEventListener("click", (e) => {
  if (e.target.matches(".nav-link")) setView(e.target.dataset.view);
});
$("#cta-build-profile").addEventListener("click", () => setView("profile"));
$("#cta-browse").addEventListener("click", () => {
  $(".board").scrollIntoView({ behavior: "smooth" });
});

async function loadCategories() {
  const res = await fetch("/api/categories");
  state.categories = await res.json();

  $("#category-chips").innerHTML =
    `<button class="chip active" data-cat="all">all</button>` +
    state.categories.map((c) => `<button class="chip" data-cat="${c}">${c}</button>`).join("");

  $("#category-checkboxes").innerHTML = state.categories
    .map((c) => `<label><input type="checkbox" value="${c}" /> ${c}</label>`)
    .join("");

  $("#category-chips").addEventListener("click", (e) => {
    if (!e.target.matches(".chip")) return;
    state.activeCategory = e.target.dataset.cat;
    $$(".chip", $("#category-chips")).forEach((c) => c.classList.toggle("active", c === e.target));
    refreshList();
  });
}

$("#search").addEventListener("input", (e) => {
  state.searchTerm = e.target.value;
  refreshList();
});
$("#level-select").addEventListener("change", (e) => {
  state.activeLevel = e.target.value;
  refreshList();
});
$("#sort-toggle").addEventListener("click", () => {
  if (!state.profile) {
    showToast("Build a profile first to sort by match score");
    return;
  }
  state.sortByMatch = !state.sortByMatch;
  $("#sort-toggle").textContent = state.sortByMatch ? "Sort: Match score" : "Sort: Deadline";
  refreshList();
});

async function refreshList() {
  const params = new URLSearchParams({
    category: state.activeCategory,
    level: state.activeLevel,
    search: state.searchTerm,
  });

  let results;
  if (state.profile) {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.profile),
    });
    const data = await res.json();
    results = data.results.filter((o) => {
      const matchesCat = state.activeCategory === "all" || o.category === state.activeCategory;
      const matchesLevel = state.activeLevel === "all" || o.level === state.activeLevel;
      const q = state.searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        o.title.toLowerCase().includes(q) ||
        o.org.toLowerCase().includes(q) ||
        o.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCat && matchesLevel && matchesSearch;
    });
    if (state.sortByMatch) {
      results.sort((a, b) => b.matchScore - a.matchScore);
    } else {
      results.sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
    }
  } else {
    const res = await fetch(`/api/opportunities?${params}`);
    const data = await res.json();
    results = data.results.sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
  }

  state.opportunities = results;
  renderList(results, "#opp-list");
  $("#result-meta").textContent = `${results.length} opportunit${results.length === 1 ? "y" : "ies"} found${
    state.profile ? " · scored against your profile" : ""
  }`;
}

function renderList(items, targetSelector) {
  const target = $(targetSelector);
  if (items.length === 0) {
    target.innerHTML = `<li class="opp-row" style="grid-template-columns:1fr;"><div class="opp-main"><p class="opp-desc">Nothing matches yet. Widen your filters or add a skill or two to your profile.</p></div></li>`;
    return;
  }

  target.innerHTML = items
    .map((o) => {
      const isSaved = state.saved.has(o.id);
      const matched = new Set(o.matchedTags || []);
      const tagsHtml = o.tags
        .map((t) => `<span class="tag ${matched.has(t.toLowerCase()) ? "matched" : ""}">${t}</span>`)
        .join("");
      const scoreHtml =
        o.matchScore !== undefined
          ? `<div class="match-score">
               <span class="num">${o.matchScore}%</span>
               <div class="match-bar"><div class="match-bar-fill" style="width:${o.matchScore}%"></div></div>
             </div>`
          : "";
      return `
      <li class="opp-row">
        <div class="opp-accent" data-cat="${o.category}"></div>
        <div class="opp-main">
          <div class="opp-title-row">
            <span class="opp-title">${o.title}</span>
            <span class="opp-org">${o.org}</span>
          </div>
          <div class="opp-meta">
            <span>${o.category}</span>
            <span>${o.location}</span>
            <span>deadline: ${o.deadline}</span>
            <span>${o.level}</span>
          </div>
          <p class="opp-desc">${o.description}</p>
          <div class="opp-tags">${tagsHtml}</div>
        </div>
        <div class="opp-side">
          ${scoreHtml}
          <div class="opp-actions">
            <button class="icon-btn ${isSaved ? "saved" : ""}" data-save="${o.id}">${isSaved ? "★ saved" : "☆ save"}</button>
            <a class="icon-btn" href="${o.link}" target="_blank" rel="noopener">open ↗</a>
          </div>
        </div>
      </li>`;
    })
    .join("");

  target.querySelectorAll("[data-save]").forEach((btn) => {
    btn.addEventListener("click", () => toggleSave(btn.dataset.save));
  });
}

function toggleSave(id) {
  if (state.saved.has(id)) {
    state.saved.delete(id);
  } else {
    state.saved.add(id);
    showToast("Saved to your shortlist");
  }
  localStorage.setItem("sb_saved", JSON.stringify([...state.saved]));
  refreshList();
  if (state.view === "dashboard") renderDashboard();
}

function renderDashboard() {
  const savedItems = state.opportunities.filter((o) => state.saved.has(o.id));
  const allSavedFromAll = savedItems.length
    ? savedItems
    : []; // will backfill below if list not loaded yet

  $("#dashboard-sub").textContent = state.saved.size
    ? `${state.saved.size} opportunit${state.saved.size === 1 ? "y" : "ies"} bookmarked.`
    : "Nothing saved yet — bookmark opportunities from the scan view.";

  // Ensure we render from the full opportunity set, not just the currently filtered list
  fetch("/api/opportunities").then((r) => r.json()).then((data) => {
    const items = data.results.filter((o) => state.saved.has(o.id));
    renderList(items, "#saved-list");
  });
}

$("#profile-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const skills = $("#f-skills").value.split(",").map((s) => s.trim()).filter(Boolean);
  const interests = $("#f-interests").value.split(",").map((s) => s.trim()).filter(Boolean);
  const categories = $$("#category-checkboxes input:checked").map((c) => c.value);
  const education = $("#f-education").value.trim();

  state.profile = { education, skills, interests, categories };
  localStorage.setItem("sb_profile", JSON.stringify(state.profile));
  showToast("Profile saved — scoring your matches");
  setView("home");
  refreshList();
});

function hydrateProfileForm() {
  if (!state.profile) return;
  $("#f-education").value = state.profile.education || "";
  $("#f-skills").value = (state.profile.skills || []).join(", ");
  $("#f-interests").value = (state.profile.interests || []).join(", ");
  setTimeout(() => {
    $$("#category-checkboxes input").forEach((c) => {
      c.checked = (state.profile.categories || []).includes(c.value);
    });
  }, 0);
}

(async function init() {
  await loadCategories();
  hydrateProfileForm();
  await refreshList();
})();
