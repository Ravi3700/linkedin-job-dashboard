# LinkedIn Job Search Hub

A public job-search and career-resource hub with curated LinkedIn searches across job families and locations, plus company career pages and job platforms. The public site is static; its 39 Jobs sections and 444 search shortcuts are published from `data/site-content.json`.

Developed by **Ravi Kumar Shrivastav**.

## What it does

- One click opens pre-scoped LinkedIn job searches as separate tabs — globally, by category, or by city.
- A state filter narrows the dashboard to one Indian state at a time.
- A "Close Opened Search Tabs" button closes every tab opened by the dashboard.
- The public experience is a static GitHub Pages site. An optional, separate content admin proposes edits through GitHub pull requests; changes remain unpublished until a human reviews and merges them.

## Main features

- Search sections spanning technology, data, business, support and other career families
- Hiring / Recruitment Posts section (LinkedIn post search, not job search)
- Walk-in / interview-drive sections
- City-wise "Regular Jobs" sections for major Indian IT hubs
- 14 additional career-family search sections for students/freshers (Software Development, Full Stack, Frontend, Backend, Data & Analytics, AI/ML, Cloud/DevOps, Cybersecurity, QA/Testing, Mobile, Business & Product, UI/UX, IT Support & Operations, Digital & Marketing)
- 🔥 Open every search at once, or 🚀 just one section/city at a time
- ✖ Close every dashboard-opened tab at once
- 📍 Filter the whole dashboard by state
- ↑ Mobile-friendly Back to Top button
- 🎯 Separate Career tab: target companies + job platforms to check regularly
- 🔎 Combined keyword and state filtering; OPEN ALL respects active filters
- ℹ️ About and Request a Search pages
- ⚙️ Centralized configuration for social profiles and the Microsoft Forms destination

## Project structure

```
index.html          ← public page and Jobs/Career views
css/                 ← shared public styling, including the scoped redesign layer
js/                   ← public interactions, filters, data rendering and page setup
data/                 ← published search JSON, location/career data and site config
admin/                ← separate GitHub-authenticated content-admin interface
worker/               ← optional OAuth/API Worker; credentials are configured outside this repository
docs/                 ← architecture, project guide, security and change history
ADMIN_SETUP.md        ← required review rules and one-time admin setup
```

For the full breakdown of what each file does, see **[docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md)**.

## Running locally

No build step or npm dependencies are needed. Serve the folder over HTTP so the Jobs JSON can load:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`.

## Deploying to GitHub Pages

Use the existing GitHub repository, remote, branch and Pages source. Do not create a replacement repository or change its publishing configuration as part of these updates.

The public pages require no build step. Keep this existing repository, remote, branch and GitHub Pages source unchanged; the relative asset paths are designed for `https://ravi3700.github.io/linkedin-job-dashboard/`. Verify the current publishing configuration in GitHub before changing it. The optional admin and Worker require separate setup; do not enable writes until GitHub requires an approving review on `main`.

## Maintenance

See **[docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md)** for the architecture map and file responsibilities, **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for technical/diagram detail, and **[docs/CHANGELOG.md](docs/CHANGELOG.md)** for project history.

## Known limitations

- Request links open the Microsoft Forms destination configured in `data/config.js`. The local Request page prepares and copies a summary but does not transmit or store it.
- This is a static site hosted on GitHub Pages: GitHub Pages does not support custom server-level HTTP headers (e.g. Content-Security-Policy), and none of the source here is or can be hidden from anyone who views the page source — see `docs/ARCHITECTURE.md` §5 for the realistic security notes.
- Browsers throttle how many tabs a single click can open (`window.open` pop-up limits) — if "Open All" opens fewer tabs than expected, allow pop-ups for the site and click again.
- The discreet Admin link is only a convenience. Admin writes require the configured GitHub OAuth/Worker flow and must be reviewed and merged as a pull request. See `ADMIN_SETUP.md`; the Worker and branch-protection setup are not live until separately configured.
