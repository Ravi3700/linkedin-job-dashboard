# PROJECT_GUIDE.md — LinkedIn Job Search Dashboard

> **If you are an AI (or a human) picking up this project for the first time, read this file completely before opening any source file.** It is the architectural map of the project. After reading it you should only need to open the 2–4 files that are actually relevant to the change you're making.

---

## 1. Project Overview

This is a public job-search and career-resource hub. It does not search LinkedIn itself; its Jobs view renders curated search URLs from `data/site-content.json`, while the Career view lists companies and job platforms. The public pages are static and hosted on GitHub Pages.

It has two tabs (views):
- **💼 Jobs** — the search dashboard (the main feature, described below).
- **🎯 Career** — a curated list of target companies and job platforms to check regularly (separate, simpler feature).

There is no build step for the public site. The separate optional content-admin interface uses GitHub OAuth through a Cloudflare Worker to propose changes to the published JSON as pull requests. Credentials remain outside the public repository, and edits do not go live until reviewed and merged.

---

## 2. Main Features

- 39 published Jobs sections containing the original 444 LinkedIn search shortcuts.
- State and keyword filters; section Open All and Close Tabs honor visible search results.
- A separate Career view with 56 company records and 9 job platforms.
- About and request pages, QR code, PWA assets and Microsoft Forms request links.
- An optional, separate content admin that submits proposed JSON edits as GitHub pull requests.

## 3. Folder Structure

```
index.html                 ← public page structure, navigation, search views and footer
css/
  main.css                 ← reset, typography, base layout (+ one mobile media query — see note below)
  components.css           ← header/buttons/cards/footer/career/state-filter/back-to-top styles
  responsive.css           ← the rest of the @media breakpoint rules
data/
  site-content.json        ← published Jobs sections and LinkedIn search shortcuts; CRM write target
  locations.js             ← CITY_STATE: city → state map (the state filter's single source of truth)
  search-data.js           ← legacy role/Hiring group definitions used by the shared open-all helpers
  career-data.js           ← CAREER_COMPANIES / CAREER_PLATFORMS + small lookup tables for the Career tab
  career-searches.js       ← CAREER_SEARCH_GROUPS: 14-career-family student/fresher search expansion, same data model as search-data.js (see §15)
js/
  utils.js                 ← makeUrl() / makeLocUrl() — URL builders
  filters.js                ← state filter engine (currentState, getEntryState, tagAnchors, applyStateFilter, setStateFilter)
  tab-manager.js            ← tabs/tabNames/tabSeq tracking + closeTabs()
  open-all.js               ← openGroup() / openUrls() / openAll()
  career-searches.js       ← renders CAREER_SEARCH_GROUPS into ".category" sections (see §15)
  career.js                 ← Career tab rendering/filtering logic
  ui.js                     ← mobile Back-to-Top behavior + mobile section collapse/expand (runs after career-searches.js, so it picks up the generated sections automatically)
  site-config.js            ← enables configured request and social links
  site-content.js           ← validates and renders published search JSON
  app.js                    ← entry point: initializes filters and service-worker registration
admin/                     ← separate, unchanged GitHub-authenticated content-admin UI
worker/                    ← OAuth and pull-request-only content API
ADMIN_SETUP.md             ← branch review rules and admin setup requirements
docs/
  PROJECT_GUIDE.md          ← this file
  ARCHITECTURE.md           ← diagrams + deeper technical notes
  CHANGELOG.md              ← project history
README.md                  ← public-facing overview
.gitignore
```

### Load order (why it matters)

`index.html` loads these with `defer`, in this exact order:

```
data/locations.js  →  data/search-data.js  →  data/career-data.js  →  data/career-searches.js  →
js/utils.js  →  js/filters.js  →  js/tab-manager.js  →  js/open-all.js  →  js/career-searches.js  →
js/career.js  →  js/ui.js  →  js/site-config.js  →  js/site-content.js  →  js/app.js
```

(`index.html` also loads `data/config.js` first for the Microsoft Forms destination and social links.)

This is a dependency order (each file only uses globals defined by files before it). `defer` guarantees they execute in this order regardless of download timing. **If you add a new JS file, insert its `<script defer>` tag in the correct dependency position — do not just append it at the end.**

### A note on `css/main.css`'s inline media query

Almost all `@media` rules were moved into `responsive.css`. One exception — the original "Mobile / Phone enhancements" block — was **deliberately kept inline in `main.css`**, in its original position, because several of its rules (header/.info/section/.category border-radius, footer padding) are later overridden by rules in `components.css`. Moving it into `responsive.css` (loaded last) would flip that override direction and silently change the rendered mobile layout. This was verified programmatically against the original single-file cascade order before the split. See `ARCHITECTURE.md` for the technical detail.

---

## 4. File Responsibility Map

### `data/locations.js`
**Purpose:** `CITY_STATE` — maps every city that appears anywhere in the dashboard to its Indian state.
**Used by:** `js/filters.js` (via `getEntryState`).
**Do not:** put UI logic or search titles/URLs here.

### `data/search-data.js`
**Purpose:** Legacy role/Hiring groups used by the initial HTML before the published JSON is loaded.
**Used by:** `js/career-searches.js` and `js/open-all.js` during initial markup setup. The published Jobs view is sourced from `data/site-content.json`.
**Do not:** use this file as the source of truth for managed search edits; use the review-only admin pull-request flow.

### `data/site-content.json`
**Purpose:** Published Jobs section content. Each section contains a stable ID, title, visibility status and search records with exact titles, LinkedIn URLs and visibility statuses.
**Used by:** `js/site-content.js` on the public site and the separate admin/Worker review workflow.
**Do not:** bypass the pull-request approval workflow or regenerate existing URLs.

### `data/career-data.js`
**Purpose:** Static data for the Career tab.
**Used by:** `js/career.js`.
**Do not:** mix Jobs-dashboard search data in here.

### `data/career-searches.js`
**Purpose:** `CAREER_SEARCH_GROUPS` — the 14-career-family student/fresher search expansion (Software Development, Full Stack, Frontend, Backend, Data & Analytics, AI/ML, Cloud/DevOps, Cybersecurity, QA/Testing, Mobile, Business & Product, UI/UX, IT Support & Operations, Digital & Marketing). Each group is `{key, title, entries}`, where `entries` uses the exact same string / `[title, city]` model as `data/search-data.js`'s `groups`.
**Used by:** `js/career-searches.js`.
**Do not:** put rendering logic here; do not casually edit an existing entry's title (changes its generated URL) — add new entries/groups instead.

### `js/career-searches.js`
**Purpose:** `renderCareerSearchGroups()` builds the initial career-family sections before the published JSON is loaded; `js/site-content.js` replaces the initial search sections with the published dataset.
**Used by:** nothing else calls it directly — it self-invokes on load (immediately, or on `DOMContentLoaded` if the document is still parsing).
**Do not:** insert relative to `#jobsView` directly — the existing `.category` sections are nested inside a wrapper (`#location-added`), not direct children of `#jobsView`, so any insertion must go through `anchor.parentElement`, not `jobsView`, or it will throw `NotFoundError` and silently fail to render (this exact mistake was made and fixed once already — see `CHANGELOG.md`).

### `js/utils.js`
**Purpose:** `makeUrl(title, isPost)` and `makeLocUrl(title, city)` — pure functions that build LinkedIn search URLs from a title (+ optional city), reproducing the exact URL patterns already in production.
**Used by:** `js/open-all.js`.
**Do not:** change the query-string construction without explicit instruction (this changes every generated URL).

### `js/filters.js`
**Purpose:** The state filter engine — `currentState`, `getEntryState(item)`, `tagAnchors()`, `applyStateFilter()`, `setStateFilter(state)`.
**Used by:** `index.html` (`<select onchange="setStateFilter(this.value)">`), `js/open-all.js` (checks `currentState`/`getEntryState` so OPEN ALL only opens what's visible), `js/app.js` (calls `tagAnchors()`/`applyStateFilter()` on load).
**Do not:** hard-code city/state logic anywhere else — this is the one place it belongs.

### `js/tab-manager.js`
**Purpose:** Generic dashboard-opened-window tracking (`tabs`, `tabNames`, `tabSeq`) and `closeTabs()`.
**Used by:** `js/open-all.js` (pushes into `tabs`/`tabNames` every time it opens a tab), `index.html` (`onclick="closeTabs()"` on the CLOSE DASHBOARD TABS button).
**Do not:** add per-city or per-category close logic — the tracking is intentionally generic so any current or future section works automatically.

### `js/open-all.js`
**Purpose:** `openGroup(jobs, isPost)`, `openUrls(urls)`, `openAll()` — shared section-level and global OPEN ALL behavior, honoring the active filters.
**Used by:** rendered Jobs sections and legacy initial markup. `openAll()` reads the currently rendered links from the DOM so it stays aligned with the published JSON.
**Do not:** duplicate this logic elsewhere.

### `js/site-content.js`
**Purpose:** Validates the published JSON, renders visible sections, updates counts and dispatches the event that refreshes filtering and mobile disclosure controls.
**Used by:** `index.html` after the initial scripts have loaded.
**Do not:** accept unvalidated URLs or silently show stale content if the published file fails to load.

### `js/career.js`
**Purpose:** Career tab rendering/filtering (`initCareer`, `renderCareer`, `companyCard`, `showView`, etc.).
**Used by:** `index.html` (`onclick="showView('career')"`).
**Do not:** wire this into the Jobs dashboard's tab tracking — the Career tab intentionally does not open/track/close dashboard tabs.

### `js/ui.js`
**Purpose:** Mobile Back-to-Top behavior.
**Used by:** `index.html` (`#mobileBackToTop`, `.grid a`/`.links a` click tracking).
**Do not:** put search/filter/tab logic here.

### `js/app.js`
**Purpose:** Entry point. Initializes filtering and registers the service worker; reinitializes search filtering after published content renders.
**Used by:** nothing else — top of the dependency chain.

### `index.html`
**Purpose:** Public page structure — header, state filter, Jobs/Career tabs, initial search markup, career-resource view, footer and script/style references. `js/site-content.js` renders the published Jobs sections.
**Do not:** put large reusable logic inline here going forward — add it to the appropriate `js/`/`data/` file instead.

---

## 5. Feature → File Mapping

| Feature | Main File | Supporting Files |
|---|---|---|
| All published Jobs sections (39 sections, 444 original searches) | `data/site-content.json` | `js/site-content.js`, `js/filters.js`, `js/open-all.js` |
| State Filter | `js/filters.js` | `data/locations.js` |
| Global OPEN ALL | `js/open-all.js` (`openAll`) | Current rendered DOM links and active filters |
| Section OPEN ALL | `js/site-content.js` → `js/open-all.js` (`openUrls`) | `js/filters.js`, `js/tab-manager.js` |
| Close Tabs | `js/tab-manager.js` | `js/open-all.js` (populates the tracking lists) |
| Back To Top | `js/ui.js` | `css/components.css`, `css/main.css` (mobile-only media rule) |
| Career Tab | `js/career.js` | `data/career-data.js` |
| Footer / Social Links | `index.html` | `css/components.css` |

---

## 6. Data Model

The published content in `data/site-content.json` uses this schema:

```
{ schemaVersion: 1, sections: [{ id, title, status, searches: [{ id, title, url, status }] }] }
```

The legacy `data/search-data.js` groups object entries are one of:
- a **string** — an India-wide search title, e.g. `"Data Analyst"`. `js/utils.js`'s `makeUrl(title, isPost)` turns this into a job-search URL (or a content-search/"post" URL, for the Hiring section).
- a **`[title, city]` pair** — a city-scoped search, e.g. `["Data Analyst", "Delhi"]`. `js/utils.js`'s `makeLocUrl(title, city)` turns this into a city-scoped job-search URL.

These legacy arrays generate the initial fallback markup only; the published JSON provides the final visible Jobs content.

Conceptually, every search on this dashboard can be described as:

```
{
  category: "Data Analyst" | "Business Analyst" | "Power BI / BI" | "MIS Executive / Reporting"
           | "Hiring / Recruitment Posts" | "Walk-in" | "Regular Jobs — <City>",
  location: "Delhi" | "Ahmedabad" | ... | null (India-wide),
  state:    resolved from `location` via data/locations.js, or null,
  type:     "job" | "post" | "walkin",
  title:    display text, e.g. "Data Analyst — Delhi",
  url:      the exact LinkedIn search URL (never regenerate an existing one)
}
```

`type` meanings — see §8.

---

## 7. State / Location Mapping

Single source of truth: `data/locations.js`'s `CITY_STATE` object, e.g.:

```js
{
  "Ahmedabad": "Gujarat", "Vadodara": "Gujarat", "Surat": "Gujarat",
  "Gandhinagar": "Gujarat", "Vapi": "Gujarat",
  "Mumbai": "Maharashtra", "Pune": "Maharashtra", "Andheri": "Maharashtra",
  "Delhi": "Delhi", "Gurugram": "Haryana", "Noida": "Uttar Pradesh",
  "Jaipur": "Rajasthan", "Indore": "Madhya Pradesh", "Bengaluru": "Karnataka",
  "Hyderabad": "Telangana", "Chennai": "Tamil Nadu", "Kolkata": "West Bengal",
  "Chandigarh": "Chandigarh"
}
```

`js/filters.js`'s `getEntryState(item)` resolves any job title, `[title, city]` pair, or full URL to a state by checking this map (for URLs, it checks the `location=` query param first, then falls back to scanning the decoded `keywords` text for a known city name — this is how city-embedded Hiring/Walk-in titles like `"Data Analyst Hiring Delhi"` get correctly classified even without a `location=` param). Searches with no identifiable city resolve to `null` and stay visible/openable under every state filter.

**To add a new state/city:** add one entry to `CITY_STATE`. `js/filters.js`, `js/open-all.js`, and the visual filter all pick it up automatically — no other file needs to change (though you'll still need to add the actual search data/links for that city somewhere, per §4).

---

## 8. Search Classification

Every search is exactly one of:

- **`job`** — an actual job-vacancy search (LinkedIn `/jobs/search/` endpoint). Lives in the 4 role sections and the city-wise "Regular Jobs — City" sections.
- **`post`** — a hiring/recruitment LinkedIn *post* search (LinkedIn `/search/results/content/` endpoint). Lives only in the "Hiring / Recruitment Posts" section.
- **`walkin`** — a walk-in/interview/drive search (also a content search). Lives only in the Walk-in sections ("Walk-in Drives — Gujarat", "Walk-in Drives — Mumbai / Pune", "Role-specific Walk-ins").

**These are never mixed within a section.** When adding a new search, decide its type first, then put it only in the matching section.

---

## 9. URL Rules

- **Every existing URL in `data/site-content.json` is exact and must never be regenerated, "optimized," re-encoded, or replaced** without explicit permission.
- New published searches must use valid HTTPS LinkedIn search URLs and be proposed through the admin pull-request flow.
- If you are ever unsure whether a URL changed, diff the file against the previous version before and after your edit.

---

## 10. OPEN ALL Architecture

- **Global (`openAll()`, `js/open-all.js`)**: reads the currently rendered Jobs links live from the DOM, so it follows the published JSON and never drifts from visible content.
- **Per-section (`onclick="openGroup([...])"` / `onclick="openUrls([...])"`, in `index.html`)**: each section's own button calls the same `openGroup`/`openUrls` functions with just that section's data.
- **State-filtered**: `openGroup`/`openUrls` both check `js/filters.js`'s `currentState`/`getEntryState` before opening each item, skipping anything that doesn't match the selected state. Generic (non-city) searches always open, under any filter.

---

## 11. CLOSE DASHBOARD TABS Architecture

`js/tab-manager.js` keeps two parallel lists — `tabs` (raw `Window` references) and `tabNames` (the unique name each was opened with). Every open in `js/open-all.js` pushes to both. `closeTabs()`:
1. Closes every reference in `tabs`, wrapped in try/catch, checking `!w.closed` first.
2. Also re-opens-then-closes each name via `window.open("", name)` as a same-origin-safe fallback.
3. Resets both lists.

This is generic by design — it has no per-city/category branches, so it works for anything `js/open-all.js` opens, current or future.

**Browser limitation (real, not fixable in JS):** browsers throttle how many `window.open()` calls a single click can trigger before showing a "pop-ups blocked" indicator. This is unavoidable browser security — the fix is the user allowing pop-ups for the site, not different JavaScript.

---

## 12. UI Architecture

- **Header** (`index.html` + `css/components.css`): title, 🔥 OPEN ALL / ✖ CLOSE buttons, and the state-filter row (label + `<select>` + live "Showing X of Y" counter).
- **Nav tabs**: `💼 Jobs` / `🎯 Career`, toggled by `js/career.js`'s `showView()`.
- **Main dashboard**: static `<section>`/`.category` blocks for every search group (see §7 in `ARCHITECTURE.md` for the full list).
- **Footer**: developer credit + social icon row (`css/components.css`'s `.footer-social`).
- **Back to Top**: `#mobileBackToTop`, mobile-only (hidden above 650px), driven by `js/ui.js`.

---

## 13. Future Modification Rules (for AI agents)

1. Read this file (`PROJECT_GUIDE.md`) first, fully, before opening any source file.
2. Treat it as the architectural map — trust it over guessing from filenames.
3. Then open **only** the files relevant to the requested change (use §4/§5 above to find them).
4. Do not read every file "just in case."
5. **Never modify an existing URL** without explicit permission — see §9.
6. Do not rebuild a working feature from scratch; extend it.
7. Preserve previous fixes — check `docs/CHANGELOG.md` for what's already been done and why.
8. Keep the `job` / `post` / `walkin` classification separate (§8) — never mix them into one section.
9. Published Jobs searches are maintained in `data/site-content.json`; use the admin pull-request workflow for edits after branch review rules are enabled.
10. Keep state/location mapping centralized in `data/locations.js` — never hard-code a city→state fact anywhere else.
11. Keep `js/open-all.js` data-driven — do not hand-write a new hard-coded open/close routine per section.
12. Keep `js/tab-manager.js` generic — do not add per-city/category branches to `closeTabs()`.
13. Update this guide whenever the file structure or a file's responsibility changes.
14. Update `docs/CHANGELOG.md` whenever you make a significant change.
15. After editing a file, verify every file that depends on it (per §4/§5) still works.
16. Never leave a broken `<link>`/`<script src>` reference — check the referenced file still exists at that exact path (case-sensitive).
17. Never silently remove a feature, section, search, or fix.
18. Always return a complete, explicit summary of what changed, what was preserved, and any existing issue you noticed but didn't fix.

## 14. Production additions

- `about.html` contains only verified project and developer information.
- `request-job.html` and `js/request.js` validate and prepare request text locally; separate Request links open the configured Microsoft Forms destination.
- `manifest.json` and `sw.js` support static app metadata and HTTP(S) shell caching. Direct `file://` opening does not provide service-worker caching.
- `data/config.js` is the only place for the Microsoft Forms URL and social profile URLs; `js/site-config.js` disables empty social destinations safely.
- Mobile search sections use accessible disclosure buttons generated by `js/ui.js`; the content is visually collapsed only on mobile and remains in the DOM so filtering and OPEN ALL continue to see every search.
- `OPEN ALL` uses the same state and keyword visibility rules as the dashboard, so filtered-out links are not opened.
- `js/site-content.js` validates published search URLs and renders only entries marked published; `js/app.js` hardens new-tab links and initializes filters after the JSON render event.
- Jobs/Career tabs use tab semantics and support Arrow, Home and End keyboard navigation.
- The header intentionally has no global Open All or Close Tabs buttons. Each published search section receives a generated Close Opened Search Tabs button next to its Open All control; `tab-manager.js` tracks windows by section ID.
