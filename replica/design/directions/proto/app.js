/* Design-direction prototype harness. Throwaway: never imported by the product. */
(async function () {
  const q = new URLSearchParams(location.search);
  const DIRS = ["folio", "gauge", "ledger"];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktopMQ = matchMedia("(min-width: 1024px)");
  if (q.has("shot")) document.documentElement.setAttribute("data-shot", "");
  const sysDark = matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = q.get("theme") || (sysDark ? "dark" : "light");

  const data = await (await fetch("../_data/papers.json")).json();
  const TOPICS = Object.fromEntries(data.topics.map(t => [t.id, t.name]));
  const DATA = q.get("data") || (q.get("wc") === "1" ? "worst" : "demo");
  const worst = DATA === "worst";
  const papers = data.papers.filter(p => worst || !p.fixture).sort((a, b) => b.date.localeCompare(a.date));
  papers.filter(p => !p.fixture).forEach((p, i) => { p.new = i < 6; });
  if (worst) { papers.forEach(p => { if (p.fixture) p.new = true; }); papers.sort((a, b) => b.fixture - a.fixture); }
  if (DATA === "empty") papers.length = 0;
  if (DATA === "one") papers.splice(1);
  const NEW_COUNT = papers.filter(p => p.new).length;
  const LAST_VISIT = "Tue 20 Oct, 14:05";

  // ---------- small helpers ----------
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dmy = iso => { const [y, m, d] = iso.split("-"); return `${+d} ${MONTHS[+m - 1]} ${y}`; };
  const dm = iso => { const [, m, d] = iso.split("-"); return `${+d} ${MONTHS[+m - 1]}`; };
  const surname = n => { const parts = n.trim().split(/\s+/); return parts.length > 1 ? parts[parts.length - 1] : n; };
  function authorsShort(list, max = 3) {
    if (!list.length) return "";
    if (list.length <= max) return list.map(n => `\u2068${n}\u2069`).join(", ");
    const rest = list.length - max; return `${list.slice(0, max).join(", ")} and ${rest} other${rest === 1 ? "" : "s"}`;
  }
  const GLYPH = {
    1: '<circle cx="5" cy="5" r="4"/>', 2: '<rect x="1.2" y="1.2" width="7.6" height="7.6"/>', 3: '<path d="M5 .8 9.3 9H.7z"/>',
    4: '<path d="M5 .5 9.5 5 5 9.5.5 5z"/>', 5: '<path d="M.7 1h8.6L5 9.2z"/>', 6: '<path d="M5 .6 9.4 3.8 7.7 9H2.3L.6 3.8z"/>',
    7: '<path d="M2.6.8h4.8L9.8 5 7.4 9.2H2.6L.2 5z"/>', 8: '<path d="M3.6 .6h2.8v3h3v2.8h-3v3H3.6v-3h-3V3.6h3z"/>',
    9: '<path d="M1.6 .2 5 3.6 8.4.2l1.4 1.4L6.4 5l3.4 3.4-1.4 1.4L5 6.4 1.6 9.8.2 8.4 3.6 5 .2 1.6z"/>',
    10: '<path fill-rule="evenodd" d="M5 .6a4.4 4.4 0 1 1 0 8.8A4.4 4.4 0 0 1 5 .6zm0 2.2a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z"/>',
    11: '<path d="M.6 6a4.4 4.4 0 0 1 8.8 0z"/>', 12: '<rect x=".6" y="3.4" width="8.8" height="3.2"/>',
    13: '<path d="M5 0l1.3 3.7L10 5 6.3 6.3 5 10 3.7 6.3 0 5l3.7-1.3z"/>'
  };
  const glyph = id => `<svg class="glyph" viewBox="0 0 10 10" aria-hidden="true" fill="currentColor">${GLYPH[id]}</svg>`;
  const ICON = {
    feed: '<path d="M4 6h16M4 12h16M4 18h10"/>', explore: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    news: '<path d="M5 5h11v14H6a1 1 0 0 1-1-1zM16 9h3v9a1 1 0 0 1-1 1h-2"/><path d="M8 9h5M8 12h5M8 15h3"/>',
    saved: '<path d="M7 4h10v16l-5-3.5L7 20z"/>', share: '<path d="M12 4v11M8 8l4-4 4 4M6 13v6h12v-6"/>',
    chev: '<path d="m7 10 5 5 5-5"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>', copy: '<rect x="8" y="8" width="11" height="11" rx="1.5"/><path d="M5 15V5h10"/>',
    ext: '<path d="M14 5h5v5M19 5l-8 8M17 14v5H5V7h5"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    user: '<circle cx="12" cy="9" r="3.5"/><path d="M5.5 19c1.2-3 3.6-4.5 6.5-4.5s5.3 1.5 6.5 4.5"/>', tools: '<path d="M14 6a4 4 0 0 0-5 5l-5 5 3 3 5-5a4 4 0 0 0 5-5l-2.5 2.5-2-1-1-2z"/>'
  };
  const icon = (n, cls = "") => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;
  const MONO = { Copernicus: "Co", AGU: "AG", Elsevier: "El", Wiley: "Wi", IOP: "IO", "Nature Portfolio": "Na", Springer: "Sp", Preprints: "Pr", AMS: "AM", ASCE: "AS", IEEE: "IE", Other: "··", Science: "Sc", PNAS: "PN", "Open access": "OA" };
  const topicChip = (id, extra = "") => `<span class="topic" data-t="${id}">${glyph(id)}<span>${esc(TOPICS[id])}</span>${extra}</span>`;
  const similarTo = p => papers.filter(o => o !== p && !o.fixture).map(o => [o, o.topics.filter(t => p.topics.includes(t)).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);

  // ---------- per-direction card renderers (they differ in layout, not only in colour) ----------
  const CARD = {
    folio: (p, i) => `
      <article class="card${p.new ? " is-new" : ""}" data-i="${i}" tabindex="0" aria-label="${esc(p.title)}">
        <p class="runhead"><span class="jn">${esc(p.journal.name)}</span>${p.journal.preprint ? '<span class="pre">Preprint, not peer reviewed</span>' : ""}${p.new ? '<span class="newmark">New</span>' : ""}</p>
        <h3 class="ttl">${esc(p.title)}</h3>
        <p class="by">${esc(authorsShort(p.authors))}</p>
        ${p.abstract ? `<p class="dek">${esc(p.abstract)}</p>` : ""}
        <p class="tags">${p.oa ? '<span class="oa">Open access</span>' : ""}${p.topics.slice(0, 3).map(t => topicChip(t)).join("")}${p.topics.length > 3 ? `<span class="more">+${p.topics.length - 3}</span>` : ""}</p>
        <div class="acts"><button class="ib" aria-label="Share">${icon("share")}</button><button class="ib save" aria-label="Save" aria-pressed="false">${icon("saved")}</button></div>
      </article>`,
    gauge: (p, i) => `
      <article class="card${p.new ? " is-new" : ""}" data-i="${i}" tabindex="0" aria-label="${esc(p.title)}">
        <div class="code"><span class="abbr">${esc(p.journal.abbr)}</span><span class="date num">${p.date}</span></div>
        <div class="body">
          <h3 class="ttl">${esc(p.title)}</h3>
          <p class="by">${esc(authorsShort(p.authors, 2))}</p>
          <div class="register" role="img" aria-label="Topics: ${esc(p.topics.map(t => TOPICS[t]).join(", "))}">${Array.from({ length: 13 }, (_, k) => `<span class="slot topic${p.topics.includes(k + 1) ? " on" : ""}" data-t="${k + 1}">${p.topics.includes(k + 1) ? glyph(k + 1) : ""}</span>`).join("")}<span class="regtxt">${esc(p.topics.slice(0, 2).map(t => TOPICS[t]).join(" · "))}${p.topics.length > 2 ? ` +${p.topics.length - 2}` : ""}</span></div>
          <p class="read num"><span>${p.oa ? "OA" : "Closed"}</span><span>cited ${p.cited}</span><span>refs ${p.refs}</span><span>${p.authors.length} auth.</span>${p.journal.preprint ? "<span>preprint</span>" : ""}${p.abstract ? "" : "<span>no abstract</span>"}</p>
        </div>
        <div class="acts"><button class="ib save" aria-label="Save" aria-pressed="false">${icon("saved")}</button></div>
      </article>`,
    ledger: (p, i) => `
      <article class="card${p.new ? " is-new" : ""}" data-i="${i}" tabindex="0" aria-label="${esc(p.title)}">
        <div class="meta"><span class="mono-badge" title="${esc(p.journal.group)}" aria-hidden="true">${MONO[p.journal.group] || "··"}</span><span class="jabbr">${esc(p.journal.abbr)}</span><span class="dot-sep">·</span><span class="num">${dm(p.date)}</span>${p.new ? '<span class="newdot" aria-label="New since your last visit"></span>' : ""}<span class="sp"></span><button class="ib" aria-label="Share">${icon("share")}</button><button class="ib save" aria-label="Save" aria-pressed="false">${icon("saved")}</button></div>
        <h3 class="ttl">${esc(p.title)}</h3>
        <p class="by">${esc(authorsShort(p.authors))}</p>
        <div class="register" role="img" aria-label="Topics: ${esc(p.topics.map(t => TOPICS[t]).join(", "))}">${Array.from({ length: 13 }, (_, k) => `<span class="slot topic${p.topics.includes(k + 1) ? " on" : ""}" data-t="${k + 1}">${p.topics.includes(k + 1) ? glyph(k + 1) : ""}</span>`).join("")}<span class="regtxt">${esc(p.topics.slice(0, 2).map(t => TOPICS[t]).join(" · "))}${p.topics.length > 2 ? ` +${p.topics.length - 2}` : ""}</span></div>
        <p class="tags">${p.retracted ? '<span class="pill retracted">Retracted</span>' : ""}${p.journal.preprint ? '<span class="pill neutral">Preprint</span>' : ""}${p.oa ? '<span class="pill oa">Open access</span>' : ""}<span class="cites num">${new Intl.NumberFormat("en").format(p.cited)} ${new Intl.PluralRules("en").select(p.cited) === "one" ? "citation" : "citations"}</span></p>
      </article>`
  };

  function feedHTML(dir) {
    if (!papers.length) return `<div class="empty"><p class="empty-t">No papers match these filters</p><p class="empty-s">Nothing from the last 30 days fits All topics · All journals · All regions. Widen the time window in Settings.</p></div>`;
    if (dir === "folio") {
      const days = [...new Set(papers.map(p => p.date))].sort().reverse();
      return days.map(d => `<section class="day"><h2 class="dayhead">${dmy(d)}</h2>${papers.map((p, i) => p.date === d ? CARD.folio(p, i) : "").join("")}</section>`).join("");
    }
    if (dir === "ledger") {
      const fresh = papers.map((p, i) => p.new ? CARD.ledger(p, i) : "").join("");
      const seen = papers.map((p, i) => !p.new ? CARD.ledger(p, i) : "").join("");
      return `${fresh}<div class="leftoff" role="separator"><span>You left off here · ${LAST_VISIT}</span></div>${seen}`;
    }
    return papers.map((p, i) => CARD.gauge(p, i)).join("");
  }

  function railHTML(dir) {
    if (dir !== "ledger") return "";
    if (!papers.length) return "";
    const counts = {}; papers.filter(p => !p.fixture).forEach(p => p.topics.forEach(t => counts[t] = (counts[t] || 0) + 1));
    const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = rows[0][1];
    return `<aside class="rail" aria-label="This feed by topic"><h2 class="railh">In this feed</h2><p class="railsub">${papers.filter(p=>!p.fixture).length} papers · ${NEW_COUNT} new since ${LAST_VISIT}</p>
      <ul class="barlist">${rows.map(([t, n]) => `<li><span class="lbl">${glyph(+t)}${esc(TOPICS[t])}</span><span class="num">${n}</span><span class="bar" style="--w:${(n / max * 100).toFixed(0)}%"></span></li>`).join("")}</ul></aside>`;
  }

  const TABS = [["feed", "Feed"], ["explore", "Explore"], ["news", "News"], ["saved", "Saved"]]; // Tools slot exists, hidden until v1.5
  function shellHTML(dir) {
    const wordmark = `<a class="wordmark" href="#" aria-label="PROJECT_NAME home"><span class="mark" aria-hidden="true"></span><span>PROJECT_NAME</span></a>`;
    const nav = `<nav class="tabbar" aria-label="Main">${TABS.map(([k, l]) => `<a href="#" class="tab${k === "explore" ? " is-active" : ""}"${k === "explore" ? ' aria-current="page"' : ""}>${icon(k)}<span>${l}</span></a>`).join("")}<a href="#" class="tab" data-slot="tools" hidden>${icon("tools")}<span>Tools</span></a></nav>`;
    return `
    <div class="app">
      <header class="topbar">${wordmark}${dir === "gauge" ? "" : ""}<span class="sp"></span><button class="avatar" aria-label="Account and settings">${icon("user")}</button></header>
      ${nav}
      <main class="main">
        <div class="titlerow"><div><h1 class="h1">Explore</h1><p class="fresh num">Updated ${LAST_VISIT.split(", ")[1]} IST · ${papers.length} ${papers.length === 1 ? "paper" : "papers"}</p></div><div class="seg" role="tablist" aria-label="Explore by"><button role="tab" aria-selected="true" class="segbtn is-on">Papers</button><button role="tab" aria-selected="false" class="segbtn">Journals</button></div></div>
        <div class="controls" role="toolbar" aria-label="Sort and filter">
          <label class="search">${icon("search")}<input type="search" placeholder="Search titles, abstracts, authors" aria-label="Search papers"></label>
          <div class="chips">
            <button class="chip newchip" aria-pressed="false"><span class="newcount num">${NEW_COUNT}</span> new since ${LAST_VISIT.split(",")[0]}</button>
            <button class="chip" data-open="sort">Newest${icon("chev", "sm")}</button>
            <button class="chip">All topics${icon("chev", "sm")}</button>
            <button class="chip">All journals${icon("chev", "sm")}</button>
            <button class="chip" data-open="region">All regions${icon("chev", "sm")}</button>
          </div>
        </div>
        <div class="feedwrap"><div class="feed">${feedHTML(dir)}</div>${railHTML(dir)}</div>
      </main>
      <div class="scrim" hidden></div>
      <section class="sheet paper-sheet" role="dialog" aria-modal="true" aria-labelledby="ps-title" hidden><div class="grab" aria-hidden="true"><span></span></div><div class="sheet-body"></div></section>
      <section class="sheet region-sheet" role="dialog" aria-modal="true" aria-labelledby="rs-title" hidden><div class="grab" aria-hidden="true"><span></span></div><div class="sheet-body">${regionHTML()}</div></section>
    </div>`;
  }

  function paperHTML(p) {
    const sim = similarTo(p);
    const AUTH_MAX = 8;
    const authorsList = p.authors.length > AUTH_MAX
      ? `${p.authors.slice(0, AUTH_MAX).map(a => `<li>${esc(a)}</li>`).join("")}<li class="authmore"><button class="link" data-more>Show all ${p.authors.length} authors</button></li>${p.authors.slice(AUTH_MAX).map(a => `<li class="hiddenauth" hidden>${esc(a)}</li>`).join("")}`
      : p.authors.map(a => `<li>${esc(a)}</li>`).join("");
    return `
      <div class="ps-head">
        <button class="ib close" aria-label="Close">${icon("close")}</button>
        <span class="sp"></span>
        <button class="ib" aria-label="Share">${icon("share")}</button><button class="ib save" aria-label="Save" aria-pressed="false">${icon("saved")}</button>
      </div>
      <div class="ps-scroll">
        <p class="ps-venue">${esc(p.journal.name)}${p.journal.preprint ? " · preprint, not peer reviewed" : ""}</p>
        <h2 id="ps-title" class="ps-title">${esc(p.title)}</h2>
        <p class="ps-doi"><span class="num">${dmy(p.date)}</span>${p.doi ? `<span class="sep">·</span><code class="doi">${esc(p.doi)}</code><button class="ib sm" aria-label="Copy DOI">${icon("copy")}</button>` : ""}</p>
        <ul class="ps-authors">${authorsList}</ul>
        <p class="ps-tags">${p.oa ? `<span class="pill oa">Open access${p.licence ? " · " + esc(p.licence.toUpperCase().replace("CC-", "CC ")) : ""}</span>` : ""}${p.topics.map(t => topicChip(t)).join("")}${p.regions.map(r => `<span class="pill neutral">${esc(r.name)}</span>`).join("")}</p>
        <h3 class="ps-h">Abstract</h3>
        ${p.abstract ? `<div class="ps-abs" data-collapsed><p>${esc(p.abstract)}</p></div><button class="link" data-abs>Show full abstract</button>`
          : `<p class="ps-empty">The publisher hasn't shared this abstract with open metadata services. <a href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">Read it at the source ${icon("ext", "sm")}</a></p>`}
        <h3 class="ps-h">Research connections</h3>
        <div class="conn">
          <button class="connrow"><span>References</span><span class="num">${p.refs}</span>${icon("chev", "r")}</button>
          <button class="connrow"><span>Cited by</span><span class="num">${p.cited}</span>${icon("chev", "r")}</button>
          <button class="connrow"><span>Similar papers</span><span class="num">${sim.length}</span>${icon("chev", "r")}</button>
        </div>
        ${sim.length ? `<ul class="simlist">${sim.map(s => `<li><span class="sj">${esc(s.journal.abbr)}</span>${esc(s.title)}</li>`).join("")}</ul>` : ""}
        <p class="ps-src">Metadata: OpenAlex (CC0) · Crossref</p>
      </div>
      <div class="ps-actions"><a class="primary" href="${p.doi ? "https://doi.org/" + esc(p.doi) : "#"}" target="_blank" rel="noopener">${p.oa ? "Open free article" : "Open article"} ${icon("ext", "sm")}</a></div>`;
  }

  function regionHTML() {
    const c = data.region_counts_sample, pc = data.region_parent_counts_sample;
    const n = k => c[k] ?? 0;
    const tree = [
      ["All regions", data.sample_size, 0, true], ["Global", n("Global"), 0],
      ["North America", pc["north-america"] || 0, 0], ["United States", n("United States"), 1], ["Gulf of Mexico", n("Gulf of Mexico"), 1], ["Canada", n("Canada"), 1],
      ["Europe", pc.europe || 0, 0], ["Africa", pc.africa || 0, 0], ["East Asia", pc["east-asia"] || 0, 0], ["China", n("China"), 1],
      ["South Asia", pc["south-asia"] || 0, 0], ["India", n("India"), 1], ["Mumbai", n("Mumbai"), 2], ["Bay of Bengal", n("Bay of Bengal"), 1],
      ["Ganges–Brahmaputra delta", n("Ganges–Brahmaputra delta"), 1], ["Indian monsoon belt", n("Indian monsoon belt"), 1], ["Polar regions", pc.polar || 0, 0], ["Arctic", n("Arctic"), 1]
    ];
    return `<div class="rs-head"><h2 id="rs-title" class="rs-title">Region</h2><button class="link close">Done</button></div>
      <p class="rs-sub">Counts from the ${data.sample_size} most recent papers</p>
      <div class="rs-list" role="radiogroup" aria-label="Region">${tree.map(([name, count, lvl, on]) => `
        <label class="rs-row lvl${lvl}${count === 0 ? " zero" : ""}"><input type="radio" name="region"${on ? " checked" : ""}><span class="radio" aria-hidden="true"></span><span class="rs-name">${esc(name)}</span><span class="num rs-count">${count}</span></label>`).join("")}</div>`;
  }

  // ---------- sheets: spring physics on phone, side panel / popover on desktop ----------
  function makeSheet(root, el, kind) {
    const scrim = root.querySelector(".scrim");
    const body = el.querySelector(".sheet-body");
    let lastFocus = null, H = 0, y = 0;
    const isDesk = () => desktopMQ.matches;
    const detents = () => kind === "paper" ? [0, Math.round(H * 0.4)] : [Math.max(0, H - body.scrollHeight - 40)];
    const apply = v => {
      y = v;
      if (isDesk()) { el.style.transform = kind === "paper" ? `translateX(${v}px)` : `translateY(${v * 0.02}px) scale(${1 - Math.min(v, 100) / 3000})`; el.style.opacity = kind === "region" ? String(1 - Math.min(v, 100) / 100) : ""; }
      else { el.style.transform = `translateY(${v}px)`; el.style.setProperty("--y", Math.max(0, v) + "px"); }   // keeps the action bar on the visible edge
      const span = isDesk() ? (kind === "paper" ? el.offsetWidth : 100) : H;
      scrim.style.opacity = String(Math.max(0, Math.min(1, 1 - v / span)) * (isDesk() && kind === "region" ? 0 : 1));
    };
    const spring = new Spring(0, apply);
    function open(html) {
      if (html !== undefined) body.innerHTML = html;
      lastFocus = document.activeElement;
      el.hidden = false; scrim.hidden = false; el.dataset.kind = kind;
      H = el.offsetHeight;
      const from = isDesk() ? (kind === "paper" ? el.offsetWidth : 100) : H;
      const shot = q.has("shot");     // screenshot mode: settle instantly so captures are deterministic
      if (reduced || shot) { apply(isDesk() ? 0 : detents()[shot ? 0 : (detents().length > 1 ? 1 : 0)]); spring.x = y; if (reduced) el.classList.add("fade-in"); }
      else { spring.set(from); spring.to(isDesk() ? 0 : detents()[detents().length > 1 ? 1 : 0], { damping: 1, response: 0.38 }); }
      if (!q.has("shot")) el.querySelector(".close")?.focus({ preventScroll: true });   // focus moves into the dialog (not in screenshot mode)
      bindInner();
    }
    function close() {
      const to = isDesk() ? (kind === "paper" ? el.offsetWidth : 100) : H + 24;
      const done = () => { el.hidden = true; scrim.hidden = true; el.classList.remove("fade-in"); lastFocus?.focus?.({ preventScroll: true }); };
      if (reduced) { done(); return; }
      spring.to(to, { damping: 1, response: 0.3 });
      const wait = () => spring.moving ? setTimeout(wait, 16) : (y >= to - 1 && done());
      setTimeout(wait, 16);
    }
    function bindInner() {
      el.querySelectorAll(".close").forEach(b => b.onclick = close);
      const more = el.querySelector("[data-more]");
      if (more) more.onclick = () => { el.querySelectorAll(".hiddenauth").forEach(li => li.hidden = false); more.parentElement.remove(); };
      const abs = el.querySelector("[data-abs]");
      if (abs) abs.onclick = () => { const a = el.querySelector(".ps-abs"); const c = a.toggleAttribute("data-collapsed"); abs.textContent = c ? "Show full abstract" : "Show less"; };
    }
    // drag (phone only)
    let drag = null;
    el.addEventListener("pointerdown", e => {
      if (isDesk() || reduced || drag) return;                          // multi-touch protection
      const scroller = el.querySelector(".ps-scroll") || el.querySelector(".rs-list");
      const onGrab = e.target.closest(".grab, .ps-head, .rs-head");
      if (!onGrab && scroller && scroller.scrollTop > 0) return;
      if (e.target.closest("button, a, input, label")) return;
      drag = { startY: e.clientY, startPos: spring.x, samples: [[performance.now(), e.clientY]], committed: false, id: e.pointerId };
      spring.set(spring.x);                                               // interrupt: start from the presentation value
    });
    window.addEventListener("pointermove", e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = e.clientY - drag.startY;
      if (!drag.committed) { if (Math.abs(dy) < 8) return; drag.committed = true; el.setPointerCapture?.(e.pointerId); }
      let next = drag.startPos + dy;
      const top = detents()[0];
      if (next < top) next = top - rubberband(top - next, H);
      apply(next); spring.x = next;
      drag.samples.push([performance.now(), e.clientY]); if (drag.samples.length > 5) drag.samples.shift();
    });
    window.addEventListener("pointerup", e => {
      if (!drag || e.pointerId !== drag.id) return;
      const s = drag.samples, [t0, y0] = s[0], [t1, y1] = s[s.length - 1];
      const v = t1 > t0 ? ((y1 - y0) / (t1 - t0)) * 1000 : 0;             // px/s
      const committed = drag.committed; drag = null;
      if (!committed) return;
      const projected = y + springProject(v);
      const stops = [...detents(), H + 24];
      const target = stops.reduce((a, b) => Math.abs(b - projected) < Math.abs(a - projected) ? b : a);
      if (target >= H) { spring.v = v; close(); return; }
      spring.to(target, { damping: Math.abs(v) > 600 ? 0.8 : 1, response: 0.32, velocity: v });   // velocity handoff
    });
    scrim.addEventListener("click", () => !el.hidden && close());
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !el.hidden) close(); });
    return { open, close };
  }

  // ---------- mount ----------
  function mountApp(dir) {
    document.documentElement.dataset.dir = dir;
    const stage = document.getElementById("stage");
    stage.innerHTML = shellHTML(dir);
    const root = stage.querySelector(".app");
    const paper = makeSheet(root, root.querySelector(".paper-sheet"), "paper");
    const region = makeSheet(root, root.querySelector(".region-sheet"), "region");
    root.querySelectorAll(".card").forEach(c => {
      const openIt = e => { if (e.target.closest(".ib")) return; paper.open(paperHTML(papers[+c.dataset.i])); };
      c.addEventListener("click", openIt);
      c.addEventListener("keydown", e => { if (e.key === "Enter") openIt(e); });
    });
    root.querySelectorAll(".save").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); }));
    root.querySelector('[data-open="region"]').addEventListener("click", e => {
      const sheet = root.querySelector(".region-sheet");
      if (desktopMQ.matches) { const r = e.currentTarget.getBoundingClientRect(); sheet.style.left = r.left + "px"; sheet.style.top = (r.bottom + 6) + "px"; }
      region.open();
    });
    root.querySelector(".newchip").addEventListener("click", e => { const b = e.currentTarget; b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); root.classList.toggle("only-new"); });
    // Explore tab re-tap: first scrolls to top, second focuses search (one-handed route, shape brief)
    let taps = 0; root.querySelector(".tab.is-active").addEventListener("click", e => { e.preventDefault(); taps++; if (taps === 1) scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }); else root.querySelector(".search input").focus(); setTimeout(() => taps = 0, 1200); });
    const screen = q.get("screen");
    const pi = q.has("p") ? +q.get("p") : papers.findIndex(p => p.authors.length > 30 && !p.fixture);
    const later = cb => document.hidden ? setTimeout(cb, 0) : requestAnimationFrame(cb);
    if (screen === "paper") later(() => paper.open(paperHTML(papers[Math.max(0, pi)])));
    if (screen === "region") later(() => root.querySelector('[data-open="region"]').click());
  }

  // ---------- picker wiring (verbatim behaviour from prototype/PICKER.md) ----------
  const picker = document.querySelector(".proto-picker");
  const highlight = picker.querySelector(".proto-picker-highlight");
  const items = [...picker.querySelectorAll(".proto-picker-item:not(.proto-picker-replay)")];
  const replay = picker.querySelector(".proto-picker-replay");
  let current = 0;
  const moveHighlight = () => { const el = items[current]; highlight.style.width = el.offsetWidth + "px"; highlight.style.transform = `translateX(${el.offsetLeft}px)`; };
  const nextFrame = cb => document.hidden ? setTimeout(cb, 0) : requestAnimationFrame(cb);
  const mount = i => { document.getElementById("stage").innerHTML = ""; nextFrame(() => mountApp(DIRS[i])); };
  function setActive(i) {
    if (i < 0 || i >= DIRS.length) return;
    current = i;
    items.forEach((el, j) => { el.toggleAttribute("data-active", j === i); if (j === i) el.setAttribute("aria-current", "true"); else el.removeAttribute("aria-current"); });
    moveHighlight();
    const url = new URL(location); url.searchParams.set("v", i + 1); history.replaceState(null, "", url);
    mount(i);
  }
  items.forEach((el, i) => el.addEventListener("click", () => setActive(i)));
  replay?.addEventListener("click", () => mount(current));
  addEventListener("resize", moveHighlight);
  document.addEventListener("keydown", e => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= DIRS.length) setActive(num - 1);
    else if (e.key === "ArrowRight") setActive((current + 1) % DIRS.length);
    else if (e.key === "ArrowLeft") setActive((current - 1 + DIRS.length) % DIRS.length);
    else if (e.key === "r" || e.key === "R") mount(current);
    else if (e.key === "t" || e.key === "T") { const h = document.documentElement; h.dataset.theme = h.dataset.theme === "dark" ? "light" : "dark"; }
  });
  const dt = document.createElement("nav"); dt.className = "data-toggle"; dt.setAttribute("aria-label", "Dev data");
  dt.innerHTML = ["demo:Demo data", "worst:Worst case", "empty:Empty", "one:One"].map(x => { const [k, l] = x.split(":"); return `<a href="?${new URLSearchParams({ ...Object.fromEntries(q), data: k, wc: "" }).toString()}"${k === DATA ? ' aria-current="true"' : ""}>${l}</a>`; }).join("");
  document.body.appendChild(dt);
  setActive((parseInt(q.get("v"), 10) || 1) - 1);
  requestAnimationFrame(() => requestAnimationFrame(() => picker.setAttribute("data-ready", "")));
})();
