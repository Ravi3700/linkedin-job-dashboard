# Security Notes

## Scope
The public site is static and inspectable: HTML, CSS, JavaScript, search URLs and career data are public. A separate content-admin page delegates authentication and authorized write operations to an optional Cloudflare Worker; no credentials belong in public files. The admin proposes changes only by pull request and has no approval, merge or direct-publish operation.

## Frontend protections
- Career data inserted into HTML is escaped before rendering.
- Career destinations are limited to HTTPS URLs before insertion.
- External new-tab links use `noopener noreferrer`.
- No `eval`, dynamic script execution or third-party runtime dependency is used.
- The local request page validates and prepares text without storing or transmitting it; a separate configured Microsoft Forms link is available for requests.
- Social profile and Microsoft Forms destinations are centralized in `data/config.js`; empty social values render as disabled controls rather than broken links.
- Client-side filters and counts are convenience features, not security controls.

## Hosting and headers
GitHub Pages does not provide arbitrary server response headers for this project. The included HTML metadata and service worker do not replace HTTP security headers. On Cloudflare Pages, add headers at the hosting layer when needed, for example a CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and an appropriate `Permissions-Policy`. Test any CSP against the external job links and static assets before enforcing it.

## Dependencies and external destinations
There are no package dependencies or third-party scripts. LinkedIn, company career sites and job platforms are destinations selected by the user; they may redirect, require login, block automation or change independently. Existing search URLs are protected project data and must not be rewritten without explicit approval.

## Maintenance
Never add API keys, passwords, private tokens, personal records or service credentials to this repository. Configure Worker secrets only through Wrangler, and enable required pull-request approval rules on `main` before enabling admin writes. See `ADMIN_SETUP.md`; its placeholders indicate setup that has not been completed.
