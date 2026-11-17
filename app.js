const leagueById = Object.fromEntries(LEAGUES.map((l) => [l.id, l]));

const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });

// Tabs
document.querySelectorAll(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".view").forEach((v) =>
      v.classList.toggle("hidden", v.id !== `view-${tab.dataset.view}`)
    );
  })
);

// Jobs
function renderJobs() {
  const q = $("#search").value.trim().toLowerCase();
  const league = $("#league-filter").value;
  const jobs = JOBS.filter(
    (j) =>
      (!league || j.leagueId === league) &&
      (!q || `${j.title} ${j.event} ${j.description}`.toLowerCase().includes(q))
  ).sort((a, b) => a.date.localeCompare(b.date));

  $("#job-list").innerHTML = jobs.length
    ? jobs
        .map(
          (j) => `
      <article class="card">
        <span class="tag">${esc(j.category)}</span>
        <h3>${esc(j.title)}</h3>
        <div class="meta">${esc(j.event)}</div>
        <div class="meta">${fmtDate(j.date)} · ${esc(j.hours)} · ${esc(j.location)}</div>
        <div class="meta">${esc(leagueById[j.leagueId]?.name ?? "")} · ${j.spots} spots</div>
        <button class="btn" data-job="${j.id}">View details</button>
      </article>`
        )
        .join("")
    : `<p class="empty">No jobs match your search.</p>`;
}

function showJob(id) {
  const j = JOBS.find((x) => x.id === id);
  const l = leagueById[j.leagueId];
  const list = (items) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  $("#job-detail").innerHTML = `
    <span class="tag">${esc(j.category)}</span>
    <h2>${esc(j.title)}</h2>
    <p class="meta">${esc(j.event)} · organized by ${esc(l?.name ?? "")}</p>
    <p class="meta">${fmtDate(j.date)} · ${esc(j.hours)} · ${esc(j.location)} · ${j.spots} spots</p>
    <p>${esc(j.description)}</p>
    <h4>Requirements</h4>${list(j.requirements)}
    <h4>Perks</h4>${list(j.perks)}`;
  $("#job-dialog").showModal();
}

$("#job-list").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-job]");
  if (btn) showJob(Number(btn.dataset.job));
});
$("#search").addEventListener("input", renderJobs);
$("#league-filter").addEventListener("change", renderJobs);
$("#league-filter").insertAdjacentHTML(
  "beforeend",
  LEAGUES.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join("")
);

// Leagues
function renderLeagues() {
  $("#league-list").innerHTML = LEAGUES.map((l) => {
    const count = JOBS.filter((j) => j.leagueId === l.id).length;
    return `
      <article class="card">
        ${l.verified ? "" : `<span class="tag warn">Needs verification</span>`}
        <h3>${esc(l.name)}</h3>
        <div class="meta">${esc(l.fullName)}</div>
        <div class="meta">${esc(l.university)} · ${esc(l.faculty)}</div>
        <p>${esc(l.description)}</p>
        ${l.website ? `<a href="${esc(l.website)}" target="_blank" rel="noopener">Website</a>` : ""}
        <button class="btn secondary" data-league="${l.id}">${count} open job${count === 1 ? "" : "s"}</button>
      </article>`;
  }).join("");
}

$("#league-list").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-league]");
  if (!btn) return;
  $("#league-filter").value = btn.dataset.league;
  document.querySelector('.tab[data-view="jobs"]').click();
  renderJobs();
});

renderJobs();
renderLeagues();
