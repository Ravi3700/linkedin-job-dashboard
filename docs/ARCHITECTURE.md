# ARCHITECTURE.md

Technical companion to `PROJECT_GUIDE.md`. Read that file first for the "what and where" — this file covers the "how and why" for the trickier parts of the refactor.

---

## 1. High-level diagram

```
                              index.html
                                  │
                 ┌────────────────┼─────────────────┐
                 ▼                                   ▼
            <link> CSS                          <script defer> JS
                 │                                   │
   ┌─────────────┼─────────────┐      ┌──────────────┼───────────────────────────┐
   ▼              ▼              ▼      ▼              ▼                          ▼
main.css   components.css  responsive.css  public-redesign.css  data/locations.js   data/search-data.js   data/career-data.js
                                            │                    │                    │
                                            ▼                    ▼                    ▼
                                       js/filters.js  ◄──────────┘             js/career.js
                                            │                                        ▲
                                            │          js/utils.js                   │
                                            │                │                       │
                                            ▼                ▼                       │
                                       js/tab-manager.js  js/open-all.js ────────────┘
                                            │                │
                                            └───────┬────────┘
                                                     ▼
                                                  js/ui.js
                                                     │
                                                     ▼
                                                  js/app.js  (entry point — runs last)
```

Arrows show "depends on" / "runs after." `js/site-content.js` fetches and renders the published Jobs data from `data/site-content.json`; `js/app.js` initializes link filtering and registers the service worker. The rest of the public scripts provide rendering and interaction helpers.

---

## 2. Published search content and rendering

The original Jobs content was a mix of hard-coded HTML sections and generated career-family sections. For integration with the existing review-only admin, all 444 original search titles and exact LinkedIn destinations are now stored in `data/site-content.json` using the admin's existing schema. `js/site-content.js` validates that data and renders the published sections into the Jobs view. The original HTML sections remain as a graceful source fallback until JSON loads; the loader removes them after a successful render and displays an explicit error if the published file cannot be loaded.

The Careers view and its company/platform data remain separate and unchanged. The admin writes only `data/site-content.json`; the Worker validates a proposed document and opens a pull request. GitHub branch rules, not the discreet footer link, must enforce human approval before merge.

---

## 3. The CSS split and the one deliberate exception

`css/responsive.css` contains 15 of the original 16 `@media` blocks. Splitting CSS by moving every `@media` block into a separate, later-loaded file is only cascade-safe if none of those media rules are later overridden (for the same selector *and* the same property, accounting for shorthand/longhand pairs — e.g. `padding` vs `padding-top`) by a **non-media** rule that appeared after it in the original file. Loading order determines the winner when specificity ties.

This was checked programmatically (walking the original `<style>` block, comparing each `@media` block's selector/property set against every non-media rule that appeared *after* it in the original source, including shorthand-family expansion for `padding`/`margin`/`background`/`border`/`font`/`transition`). One block failed the check: the original **"Mobile / Phone enhancements"** block sets `border-radius` on `header`/`.info`/`section`/`.category` and `padding` on `footer`, and later (non-media) "premium" rules in what's now `components.css` also set `border-radius`/`padding-top` on those same selectors. In the original file, the premium rules — being later — won. Moving the media block to a file that loads *after* `components.css` would reverse that, changing the rendered mobile padding/corner-radius. So that one block was **kept inline in `css/main.css`, in its original position** (before the components.css-equivalent content), preserving the exact original cascade. This is documented at the top of `main.css` itself as well.

All other 15 media blocks had no such conflict and were safely moved into `responsive.css`.

`css/public-redesign.css` is loaded after the three existing stylesheets on the public home, About, and request pages. Its selectors are rooted at `body.public-site`, so the modern design stays limited to end-user pages and does not alter a separately hosted/administered CRM. Keeping it as a final, page-scoped layer preserves existing component and responsive rules while allowing the public pages to share a consistent visual system.

---

## 4. Load order rationale (JS)

```
data/locations.js       (CITY_STATE — no dependencies)
data/search-data.js     (groups — no dependencies)
data/career-data.js     (CAREER_* — no dependencies)
js/utils.js             (pure functions — no dependencies)
js/filters.js           (needs CITY_STATE)
js/tab-manager.js       (declares tabs/tabNames/tabSeq — no dependencies)
js/open-all.js          (needs groups, makeUrl/makeLocUrl, currentState/getEntryState, tabs/tabNames/tabSeq)
js/career.js            (needs CAREER_*)
js/ui.js                (no JS dependencies, only DOM)
js/app.js               (needs tagAnchors/applyStateFilter — runs last, on DOMContentLoaded)
```

All script tags use `defer`, which guarantees execution in document order after HTML parsing completes and before `DOMContentLoaded` fires — so inline `onclick="openAll()"` etc. in the HTML always has a fully-initialized function to call by the time a user could possibly click anything.

---

## 5. Security notes (realistic, for GitHub Pages and the optional admin)

- Public HTML/CSS/JS, search URLs and career data are inspectable. The optional admin delegates authentication and write operations to the Worker; no credentials are stored in the public client.
- The Worker proposes changes only through GitHub pull requests. Require approving reviews on `main` before configuring admin writes; the admin itself cannot approve, merge or publish.
- Career cards use template strings, but static career values pass through escaping and HTTPS URL validation before insertion. User-entered request/search values are never inserted into HTML.
- No third-party scripts or external dependencies are loaded. New-tab links use `noopener noreferrer`, and script-opened windows request the same opener protection.
- The local Request page prepares text without transmitting it; navigation links open the Microsoft Forms destination configured in `data/config.js`.
- **GitHub Pages cannot serve custom HTTP response headers** (no `Content-Security-Policy`, `X-Frame-Options`, etc. at the server level). A meta CSP can provide only partial protection and is not currently used. `manifest.json` and `sw.js` are present; the service worker applies only on HTTP(S), not direct `file://` opening.

---

## 6a. The career-search expansion's rendering pattern (and its one real bug)

`data/career-searches.js` + `js/career-searches.js` add a 14-family, 70-search expansion (see `PROJECT_GUIDE.md` §15/§4) using a third rendering pattern, different from both patterns in §2 above: fully data-driven, but rendered into the DOM at runtime rather than existing as static HTML. Each family becomes one `.category` section — same classes as the existing city/walk-in sections — built with `document.createElement`/`textContent` (not `innerHTML`, consistent with the security posture in §5) and inserted into `#jobsView` before the first existing `.category` section.

This insertion is where the one real bug in this expansion lived: the existing `.category` sections (Walk-in, city "Regular Jobs") are not direct children of `#jobsView` — they're nested inside a wrapper `<div id="location-added">`. `Node.insertBefore(newNode, referenceNode)` requires `referenceNode` to be a **direct child** of the node you call it on. The original code called `jobsView.insertBefore(fragment, anchor)`, which throws `NotFoundError` because `anchor.parentElement` is `#location-added`, not `#jobsView`. This is a silent, page-breaking failure: the script's own execution stops at that line, so the sections never render, but no other script on the page is affected (each `<script defer>` tag's errors are isolated) and there's no visible error unless you check the browser console — which is exactly why this needed a real DOM execution to catch, not just a syntax check or a read-through. Fixed by inserting via `anchor.parentElement.insertBefore(fragment, anchor)` instead.

**Lesson for future sections added this way:** never assume a query result's parent is the container you queried from — walk to `.parentElement` (or use `anchor.before(fragment)` / `anchor.replaceWith(...)`, which don't have this requirement) when inserting relative to a queried element.

## 6. Known pre-existing issue (not introduced by this refactor)

The "Walk-in Drives — Gujarat" section has one duplicate URL pair (two differently-labeled links pointing at the same LinkedIn search). This was flagged early in the project's history and intentionally left unchanged per the "don't fix things that weren't asked for" rule that has applied throughout. See `CHANGELOG.md`.
