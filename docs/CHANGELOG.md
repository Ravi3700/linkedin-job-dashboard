# CHANGELOG.md

Simple history of significant changes to this project. Newest first. Entries reflect what was actually implemented — not aspirational features.

---

## Port the redesigned public hub into the existing Pages repository

### Changed
- Ported the original public homepage, About and Request pages, responsive styles, career/company data, QR asset, and PWA files into the existing `linkedin-job-dashboard` checkout without changing its remote, branch or Pages configuration.
- Reconciled the existing admin's JSON model with the complete original public search catalog: 39 sections and all 444 original title/URL pairs are now in `data/site-content.json`. The Career view's company and platform data remain separate and unchanged.
- Added a discreet footer Admin link and kept the existing admin UI, OAuth/Worker code and PR-only approval flow untouched. Updated the service worker to cache the published JSON and QR asset while removing only this app's older cache entries.
- Updated documentation for the current public data flow, Microsoft Forms destination and admin setup requirements.

### Verified
- Exact title/URL comparison between the original rendered site and the published JSON: all 444 entries match in order; 435 URLs are unique and the original duplicate links remain.
- Local browser checks at the GitHub Pages project subpath verified the homepage, 444 searches, QR image, About/Request pages, Microsoft Forms URL, direct `/admin/` route, refresh and return link.
- State/keyword filtering and Open All behavior, Career view (56 companies, 9 platforms; Accenture filter returns one result), request summary, and responsive page width from 320 to 2560 px were checked.
- JavaScript syntax, JSON, HTML local references and `git diff --check` passed. The optional Worker/OAuth flow remains unconfigured and was not claimed as verified.

### Preserved
- No files were deleted, and no commit, push, merge or deployment was performed.
- CRM/Admin UI, authentication code and GitHub approval workflow files were not modified.

---

## Career-search expansion: continuation, bug fix and verification

A prior AI session added a large student/fresher career-search expansion (14 career families, 70 new India-wide and city-scoped LinkedIn job searches) but its browser-testing credits ran out before the work could be verified in an actual browser. This entry covers that verification pass and the one real bug it found.

### Added (by the prior session, verified working in this pass)
- `data/career-searches.js` — `CAREER_SEARCH_GROUPS`: 14 career families (Software Development, Full Stack, Frontend, Backend, Data & Analytics, AI/ML, Cloud/DevOps, Cybersecurity, QA/Testing, Mobile, Business & Product, UI/UX, IT Support & Operations, Digital & Marketing), 70 entries total, using the same string / `[title, city]` data model as `data/search-data.js`.
- `js/career-searches.js` — renders one `.category` section per family (same markup/classes as the existing city/walk-in sections, so they inherit the same CSS, mobile collapse/expand, state filtering, and Open All/Close Tabs behavior with no section-specific code), plus `careerSearchUrl`/`careerSearchLabel`/`openCareerSearchGroup` helpers.
- `Career Family` and `Job Type` fields added to `request-job.html`'s form and read into the prepared summary by `js/request.js`.
- `sw.js`'s cached app-shell list updated to include the two new files.

### Fixed (found and fixed in this pass)
- **`renderCareerSearchGroups()` never actually inserted its sections into the page in any real browser.** It located its insertion point with `jobsView.querySelector('.category')` (the first city/walk-in section) but then called `jobsView.insertBefore(fragment, anchor)` — `insertBefore`'s reference node must be a *direct* child of the node it's called on, and that anchor section is actually nested one level deeper, inside a `<div id="location-added">` wrapper. This threw an uncaught `NotFoundError` on every page load, so all 14 new sections and 70 new searches silently never appeared, despite the data and rendering code both being otherwise correct. Fixed by inserting relative to `anchor.parentElement` instead of `jobsView` directly. Verified with a full scripted DOM run (jsdom, served over HTTP): link count 416→486, section count 25→39, all 14 new sections present, state filter/Open All/Close Tabs/mobile collapse all confirmed working on the new sections.
- `sw.js`'s `CACHE_NAME` bumped `v1`→`v2` so a browser that had already cached the broken app shell picks up the fix on next load instead of serving a stale copy from the service worker cache.

### Preserved
- All 416 pre-existing LinkedIn search URLs — confirmed byte-for-byte unchanged (`index.html` was not modified at all in this pass).
- Existing career families' data, request-form fields, and all previously-shipped features listed below.

### Verified in this pass
- JS syntax check: all 16 JS files, PASS.
- CSS brace-balance check: all 3 CSS files, PASS.
- Data validation: all 70 new entries have valid cities (resolve via `CITY_STATE`) and generate valid, unique, correctly-patterned URLs.
- Internal link/path audit: no localhost/placeholder/broken references.
- Scripted DOM test (jsdom): full page load, career sections render, state filter includes new entries, per-section Open All/Close Tabs work on a new section, global Open All opens all 486 links, mobile collapse/expand toggles a new section correctly.
- Real cross-browser manual testing was not available in this environment; the jsdom run is the closest available substitute and is not a full replacement for it.

---

## Section-level search controls and dashboard header cleanup

### Changed
- Removed the two global header buttons for opening all searches and closing opened tabs.
- Added section-level `Close Opened Search Tabs` controls beside every existing section Open All control.
- Added generic section-to-window tracking so each section can close only the tabs it opened; existing global tab-manager functions remain available internally.
- Added a role-focused dashboard intro, calculated search/section/state statistics and quick role navigation.

### Preserved
- All 416 existing LinkedIn search URLs, section counts, state filtering, collapse/expand behavior and search classifications.

---

## Mobile collapse header spacing fix

### Fixed
- Mobile collapsible section headers now use separate title, `View searches`, and section-action rows.
- Long location headings wrap safely without overlapping the toggle or the next section.
- Desktop header alignment remains unchanged.

---

## Mobile search-section collapse and duplicate review

### Added
- Added accessible mobile expand/collapse controls to all 25 job-search sections, including role, recruitment-post, walk-in and location groups.
- Collapsed sections retain their anchors and remain available to filters and OPEN ALL; keyword searches automatically expand matching sections.

### Reviewed
- Data Analyst, Business Analyst, Power BI / BI, MIS / Reporting and recruitment/walk-in sections were reviewed by comparing the protected URL/query intent available in the project.
- No search was removed: live LinkedIn result overlap cannot be conclusively verified from this static environment, so potentially overlapping searches were retained rather than deleted without evidence.

---

## Mobile Back to Top redesign

### Changed
- Replaced the old 280px scroll threshold with immediate mobile activation after minimal scrolling.
- Added bounded pointer/touch dragging, tap-versus-drag separation, reduced-motion scrolling, safe-area spacing and session-based position restoration.
- Moved the single Back to Top control outside the animated page wrapper so fixed viewport positioning remains reliable.

### Preserved
- Desktop remains free of the mobile floating control.
- Existing navigation, search filters, search links and tab-opening behavior are unchanged.

---

## Product UI/UX redesign and centralized configuration

### Added
- Added `data/config.js` and `js/site-config.js` for the optional Google Form URL, social profile URLs and shared site identity.
- Added a dashboard Request CTA and a responsive About-page social section with safe disabled placeholders.
- Added a redesigned product footer with navigation, purpose statement and developer attribution.

### Changed
- Redesigned the shared visual system with a consistent navy/teal palette, clearer hierarchy, stronger focus states, improved search cards, job-category accents and responsive layouts.
- Improved mobile, tablet and desktop spacing, controls, footer layout and public-page consistency.

### Preserved
- Existing search data, all 416 static LinkedIn search URLs, state mapping, classification, filters, OPEN ALL, CLOSE DASHBOARD TABS and Career behavior.

---

## Professional terminology and content consistency

### Changed
- Renamed the visible product title to **LinkedIn Job Search Hub**.
- Replaced casual or ambiguous action labels with clear terminology such as **Open All Job Searches**, **Close Opened Search Tabs**, **Job Opportunities**, **Walk-in Opportunities**, and **Request a Job Search**.
- Standardized Career navigation, company route labels, filter names, result counters, About-page headings and Request-page form labels.

### Preserved
- Existing search URLs, query parameters, identifiers, data records and functionality.

---

## Production readiness and public pages

### Added
- Added `about.html`, `request-job.html`, `js/request.js`, `manifest.json`, `sw.js`, `docs/SECURITY.md`, and `PROJECT_RECORD.txt`.
- Added shared navigation and a browser-only request validation/copy workflow without inventing a submission endpoint.

### Fixed
- OPEN ALL now respects both the active state filter and the keyword search filter.
- Script-opened windows request `noopener,noreferrer`; target-blank anchors receive the same protection at startup.
- Career data is escaped before template insertion and generated destinations are restricted to HTTPS.
- Career panels synchronize `hidden`, display and ARIA/tab state, with keyboard tab navigation.
- Removed broken placeholder social links from the footer.

---

## Multi-file architecture conversion

### Changed
- Converted the project from a single `index.html` file into a multi-file structure: `css/` (main.css, components.css, responsive.css), `js/` (utils, filters, tab-manager, open-all, career, ui, app), `data/` (locations, search-data, career-data), `docs/` (this documentation set).
- All previously-inline `<style>` and `<script>` content moved into the files above, with `<link>`/`<script defer src>` references added to `index.html` in dependency order.

### Preserved
- Every existing search URL — confirmed unchanged via full link-count diff (416 dashboard search links before and after, zero missing/changed).
- Exact CSS cascade order — one `@media` block ("Mobile / Phone enhancements") was deliberately kept inline in `main.css` (not moved to `responsive.css`) because moving it would have reversed its override relationship with later "premium" rules and changed the rendered mobile layout. See `ARCHITECTURE.md` §3.
- All existing functionality: OPEN ALL (global/section/city/state-filtered), CLOSE DASHBOARD TABS, state filter, Back to Top, Job/Post/Walk-in classification, header, footer, developer social links, responsive behavior.

### Verified
- Every one of the 10 JS files parses standalone with no syntax errors.
- The combined multi-file site was loaded in a real DOM test (jsdom, served over HTTP so relative paths resolve): the state filter produces identical results to the pre-refactor single file (e.g. selecting "Gujarat" shows the same 12 sections / 150-of-416 count as before), `openAll()` still opens all 416 searches, and `closeTabs()` runs without throwing.
- Every `<link>`/`<script src>` path in `index.html` resolves to a file that actually exists, with matching case.

---

## State filter, header/footer polish, Back-to-Top fix

### Added
- State-wise filter: a dropdown (`#stateFilter`) in the header covering every state actually represented in the dashboard (Gujarat, Delhi, Haryana, Uttar Pradesh, Rajasthan, Madhya Pradesh, Karnataka, Telangana, Tamil Nadu, Maharashtra, West Bengal, Chandigarh) plus "All States" (default). Backed by a city→state map and a "Showing X of Y searches" live counter.
- Developer footer section: "Developed by Ravi Kumar Shrivastav" credit plus Email/Instagram/YouTube/Facebook/X icon buttons.

### Fixed
- Discovered the mobile Back-to-Top button was already fully built (positioning, animation, scroll-triggered show/hide, smooth-scroll click handler) but permanently disabled by a leftover `display:none!important` CSS rule. Removed that rule to reactivate it, rather than building a duplicate feature.
- Header title was truncated ("🚀 LinkedIn " with no descriptive text) — completed to "🚀 LinkedIn Job Search Dashboard."

### Preserved
- All existing search links, OPEN ALL/CLOSE DASHBOARD TABS behavior, existing sections.

### Known limitation (documented, not fixed)
- The 5 footer social links are placeholders (`href="#"`) — no real Instagram/YouTube/Facebook/X/email URLs exist anywhere in the project, and none were invented. Replace the placeholder `href` values in `index.html`'s `<footer>` with real profile URLs when available.

---

## City-wise "Regular Jobs" sections + classification pass

### Added
- 10 new dedicated "💼 Regular Jobs — [City]" sections (Delhi, Gurugram, Noida, Jaipur, Indore, Bengaluru, Hyderabad, Chandigarh, Chennai, Kolkata), each with 10 role-based searches, following the exact structure of the pre-existing city sections (Ahmedabad, Vadodara, Surat, Gandhinagar, Vapi, Mumbai/Andheri, Pune).
- 40 new city-specific entries added to "Hiring / Recruitment Posts" and 40 to "Role-specific Walk-ins," for the same 10 cities — kept strictly in their correct section per the job/post/walkin classification rule.

### Noted (not changed)
- Some of the new city-section entries are intentionally the same URL as an entry already added to a role section earlier in the project (e.g. "Data Analyst — Delhi" exists in both the Data Analyst section and the new Regular Jobs — Delhi section) — this is a deliberate cross-listing for browsability by two different axes (role and city), explicitly requested, not an accidental duplicate.

---

## Location + startup search expansion

### Added
- Location-specific and startup-focused searches added to the 4 role sections (Data Analyst, Business Analyst, Power BI / BI, MIS Executive / Reporting) for 10 major IT hubs (Delhi, Gurugram, Noida, Jaipur, Indore, Bengaluru, Hyderabad, Chandigarh, Chennai, Kolkata).
- Pune and Mumbai were deliberately excluded from this pass' plain location combos, since dedicated "Regular Jobs — Pune"/"— Mumbai / Andheri" sections already covered those role+city combinations (avoided creating duplicates).

---

## CLOSE DASHBOARD TABS generalization

### Fixed
- The "Hiring / Recruitment Posts" category previously opened its tabs via a synthetic-anchor-click technique that never registered a trackable window reference, so those ~30 tabs could never be closed by CLOSE DASHBOARD TABS. Unified every category (including Hiring) onto the same tracked `window.open()` pattern used everywhere else, so tracking — and therefore closing — became fully generic with zero per-category code.

---

## OPEN ALL 168 SEARCHES fix

### Fixed
- The global "OPEN ALL" button had a second, separately hand-maintained list of ~57 location/walk-in URLs that had drifted out of sync with the actual links rendered on the page (wrong domain, missing query params, mismatched entries) — so it never actually opened everything shown on the page. Replaced that hard-coded list with a live DOM read of the actual rendered links, guaranteeing it can never drift again.

---

## Baseline

The starting point for this project's tracked history: a working single-`index.html` LinkedIn Job Search Dashboard with role-based search sections, city-specific "Regular Jobs"/"Walk-in Drives" sections, and basic OPEN ALL / CLOSE DASHBOARD TABS buttons (the latter two with the bugs fixed above).
