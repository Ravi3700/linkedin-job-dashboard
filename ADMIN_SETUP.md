# Secure content-admin setup

The admin page is hosted at
`https://ravi3700.github.io/linkedin-job-dashboard/admin/`. The small
**Admin** link in the public-page footer is only a convenience; access to
content operations is protected by GitHub OAuth and the Worker allowlist.
The admin page links back to the public site.

The public Jobs view reads all 39 search sections and 444 original LinkedIn
shortcuts from `data/site-content.json`. The Careers view, company records,
and job-platform records remain in the public site and are not managed by
this admin.

## Review-before-publish flow

1. Sign in through GitHub. The Worker authorizes only the configured login,
   currently `Ravi3700`.
2. Edit and preview sections and shortcuts in the admin page.
3. The Worker validates the submission and opens a branch and pull request
   that changes only `data/site-content.json`.
4. Review the actual JSON diff on GitHub, approve it, and merge it yourself.
   The admin has no approval, merge, or direct-publish endpoint.
5. GitHub Pages publishes the merged content through this repository's
   existing Pages deployment.

The GitHub OAuth access token is used only for identity verification and is
discarded. A short-lived signed session token remains in page memory only.
GitHub App credentials and the signing secret are Cloudflare Worker secrets;
there is no database.

## Required one-time setup

### 1. Require review on `main` before enabling the admin

The target repository's `main` branch was unprotected when checked. Before
deploying/configuring the admin Worker, add a repository ruleset for `main`
that:

- Requires changes through pull requests.
- Requires at least one approving review and dismisses stale approvals.
- Applies to administrators and has no bypass actors.
- Does not enable auto-merge.

Do not use the content admin until the rule is active. The Worker creates a
review branch and PR; GitHub's ruleset is what prevents a proposed change
from being merged without approval.

The initial integration is a code bootstrap, not an admin content submission.
Have a second trusted account review and approve its code PR if the ruleset is
already active. Do not bypass the review rule to bootstrap this feature.

### 2. Create or configure the GitHub App

Create the app under the `Ravi3700` account:

- **Homepage URL:** `https://ravi3700.github.io/linkedin-job-dashboard/`
- **Webhook:** disabled; no webhook is used.
- **Repository permissions:** `Contents: Read and write` and
  `Pull requests: Read and write`; leave all other permissions at `No access`
  (GitHub's required repository metadata permission remains read-only).
- Install the app on **only** `Ravi3700/linkedin-job-dashboard`.

Record the App ID, Client ID, and installation ID. Generate an RSA private
key. Do not install this app on unrelated repositories.

### 3. Deploy the Cloudflare Worker

From this repository:

```powershell
cd worker
npx wrangler login
npx wrangler deploy
```

Use the Worker URL shown by Wrangler to replace
`AUTH_CALLBACK_URL` in `worker/wrangler.toml` with exactly
`https://<your-worker-host>/auth/callback`, then deploy again. Set the same
callback URL in the GitHub App's **User authorization callback URL**.
Configure the App ID, installation ID, and Client ID in
`worker/wrangler.toml`. The repository owner/name, Pages origin/URL, branch,
and JSON path are already set for this site:

- Repository: `Ravi3700/linkedin-job-dashboard`
- Publishing branch: `main`
- Content file: `data/site-content.json`
- Admin URL: `https://ravi3700.github.io/linkedin-job-dashboard/admin/`

Set the three sensitive values as Wrangler secrets:

```powershell
npx wrangler secret put GITHUB_APP_CLIENT_SECRET
npx wrangler secret put GITHUB_APP_PRIVATE_KEY
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```

Enter each value only at Wrangler's prompt. Generate a session secret locally,
for example:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Never put these secrets in the repository, GitHub Pages files, browser
storage, or chat. Revoke and rotate any credential that is exposed.

Finally, replace the placeholder in `admin/config.js` with the Worker origin,
for example `https://<your-worker-host>`. This is public configuration, not a
secret. Publish this code through a reviewed pull request to `main`; do not
push directly to the publishing branch.

### 4. Verify the connection after deployment

After the bootstrap PR is reviewed and merged:

1. Open `https://ravi3700.github.io/linkedin-job-dashboard/` and use the small
   **Admin** link at the bottom of the page.
2. Confirm the admin's **Return to Job Search Hub** link opens the root page.
3. Sign in as `Ravi3700`, change one search title, preview, and submit.
4. Confirm GitHub receives a PR targeting `main` with only
   `data/site-content.json` changed.
5. Confirm the public title remains unchanged before merge, then review,
   approve, and merge manually. Check the Pages deployment status and confirm
   the title updates only after the merged deployment.

## Routine use

- Edit section and shortcut fields; URLs must be secure LinkedIn search URLs.
- Published/Hidden controls affect what the public Jobs view shows after merge.
- Move, add, or remove sections and shortcuts as needed.
- Preview the exact proposed changes before using **Submit for GitHub
  Approval**.
- Review the content diff and approve/merge manually on GitHub.

## Scope and limitations

- This admin manages only job-search sections and shortcuts. The current
  Careers companies and platform resources remain unchanged.
- The admin route is discreet, not secret. GitHub OAuth and Worker
  authorization protect operations; obscurity does not.
- Public GitHub Pages cannot protect server-side credentials. The admin uses
  GitHub sign-in for the allowlisted account; the account password is managed
  by GitHub.
- Cloudflare Worker/App setup and `main` review rules remain manual. No
  Worker deployment, credentials, GitHub PR, or live authentication are
  configured by this source change.
