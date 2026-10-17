const CONTENT_LIMIT_BYTES = 750_000;
const MAX_SECTIONS = 100;
const MAX_SEARCHES = 2_000;
const STATUS_VALUES = new Set(["published", "hidden"]);
const LINKEDIN_HOSTS = new Set(["www.linkedin.com", "in.linkedin.com"]);
const LINKEDIN_SEARCH_PATHS = new Set(["/jobs/search/", "/search/results/content/"]);
const GITHUB_API = "https://api.github.com";

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...headers
    }
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  if (origin !== env.ADMIN_ORIGIN) throw new HttpError(403, "Origin not allowed.");
  return {
    "Access-Control-Allow-Origin": env.ADMIN_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin"
  };
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function derValue(tag, content) {
  const length = content.length;
  let encodedLength;
  if (length < 0x80) {
    encodedLength = [length];
  } else {
    const octets = [];
    let remaining = length;
    while (remaining > 0) {
      octets.unshift(remaining & 0xff);
      remaining >>>= 8;
    }
    encodedLength = [0x80 | octets.length, ...octets];
  }
  return new Uint8Array([tag, ...encodedLength, ...content]);
}

function pkcs8PrivateKey(pem) {
  const normalized = pem.replace(/\\n/g, "\n");
  const isPkcs1 = normalized.includes("-----BEGIN RSA PRIVATE KEY-----");
  const label = isPkcs1 ? "RSA PRIVATE KEY" : "PRIVATE KEY";
  if (!normalized.includes(`-----BEGIN ${label}-----`) ||
      !normalized.includes(`-----END ${label}-----`)) {
    throw new Error("The GitHub App key must be an RSA private key in PEM format.");
  }
  const encoded = normalized
    .replace(`-----BEGIN ${label}-----`, "")
    .replace(`-----END ${label}-----`, "")
    .replace(/\s/g, "");
  const der = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
  if (!isPkcs1) return der;

  const algorithm = Uint8Array.from([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d,
    0x01, 0x01, 0x01, 0x05, 0x00
  ]);
  const version = Uint8Array.from([0x02, 0x01, 0x00]);
  const privateKey = derValue(0x04, der);
  const body = new Uint8Array(version.length + algorithm.length + privateKey.length);
  body.set(version);
  body.set(algorithm, version.length);
  body.set(privateKey, version.length + algorithm.length);
  return derValue(0x30, body);
}

async function sign(value, secret) {
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function randomToken(size = 32) {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(size)));
}

function cookieValue(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  const prefix = `${name}=`;
  const cookie = cookies.split(";").map(value => value.trim()).find(value => value.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) : "";
}

function clearOAuthCookie() {
  return "cms_oauth_state=; Path=/auth/callback; Max-Age=0; HttpOnly; Secure; SameSite=Lax";
}

function requireConfigured(env) {
  const required = [
    "ADMIN_GITHUB_LOGIN", "ADMIN_ORIGIN", "ADMIN_URL", "REPO_OWNER", "REPO_NAME",
    "BASE_BRANCH", "CONTENT_PATH", "GITHUB_APP_ID", "GITHUB_APP_INSTALLATION_ID",
    "GITHUB_APP_CLIENT_ID", "GITHUB_APP_CLIENT_SECRET", "GITHUB_APP_PRIVATE_KEY",
    "SESSION_SECRET", "AUTH_CALLBACK_URL"
  ];
  const missing = required.filter(name => !env[name]);
  if (missing.length) throw new HttpError(503, `Admin publishing is not configured: ${missing.join(", ")}.`);
  const adminUrl = new URL(env.ADMIN_URL);
  if (adminUrl.origin !== env.ADMIN_ORIGIN || !adminUrl.pathname.endsWith("/admin/")) {
    throw new HttpError(503, "ADMIN_URL must be the configured admin page under ADMIN_ORIGIN.");
  }
  const callbackUrl = new URL(env.AUTH_CALLBACK_URL);
  if (callbackUrl.protocol !== "https:" || callbackUrl.pathname !== "/auth/callback" ||
      callbackUrl.search || callbackUrl.hash) {
    throw new HttpError(503, "AUTH_CALLBACK_URL is invalid.");
  }
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function githubApi(env, token, path, options = {}) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "linkedin-job-dashboard-admin",
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });
  const text = await response.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new HttpError(502, "GitHub returned an unreadable response.");
    }
  }
  if (!response.ok) {
    const detail = typeof body.message === "string" ? body.message.slice(0, 220) : "GitHub API request failed.";
    throw new HttpError(response.status === 404 ? 404 : 502, detail);
  }
  return body;
}

async function createAppToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    iat: now - 30,
    exp: now + 540,
    iss: env.GITHUB_APP_ID
  })));
  const message = `${header}.${payload}`;
  const der = pkcs8PrivateKey(env.GITHUB_APP_PRIVATE_KEY);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(message)
  ));
  const appJwt = `${message}.${base64UrlEncode(signature)}`;
  const installation = await fetch(
    `${GITHUB_API}/app/installations/${encodeURIComponent(env.GITHUB_APP_INSTALLATION_ID)}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${appJwt}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "linkedin-job-dashboard-admin"
      },
      body: JSON.stringify({
        permissions: { contents: "write", pull_requests: "write" }
      })
    }
  );
  const result = await installation.json();
  if (!installation.ok || !result.token) {
    throw new HttpError(502, "Could not obtain a repository-scoped GitHub App token.");
  }
  return result.token;
}

async function issueSession(login, env) {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    sub: login,
    aud: `${env.REPO_OWNER}/${env.REPO_NAME}`,
    exp: Math.floor(Date.now() / 1000) + 30 * 60
  })));
  const signature = base64UrlEncode(await sign(payload, env.SESSION_SECRET));
  return `${payload}.${signature}`;
}

async function verifySession(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  const match = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(authorization);
  if (!match) throw new HttpError(401, "Sign in with the authorized GitHub account.");

  const [payload, signature, extra] = match[1].split(".");
  if (!payload || !signature || extra) throw new HttpError(401, "The admin session is invalid.");
  const expected = base64UrlEncode(await sign(payload, env.SESSION_SECRET));
  if (!constantTimeEqual(signature, expected)) throw new HttpError(401, "The admin session is invalid.");

  let claims;
  try {
    claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
  } catch {
    throw new HttpError(401, "The admin session is invalid.");
  }
  if (claims.sub !== env.ADMIN_GITHUB_LOGIN ||
      claims.aud !== `${env.REPO_OWNER}/${env.REPO_NAME}` ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new HttpError(401, "The admin session has expired or is not authorized.");
  }
  return claims;
}

function validateContent(value) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.sections) ||
      value.sections.length < 1 || value.sections.length > MAX_SECTIONS) {
    throw new HttpError(400, "Content must contain between 1 and 100 sections.");
  }

  const ids = new Set();
  let searchCount = 0;
  const content = {
    schemaVersion: 1,
    sections: value.sections.map((section, sectionIndex) => {
      if (!section || typeof section.id !== "string" ||
          !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(section.id) ||
          ids.has(section.id) ||
          typeof section.title !== "string" ||
          !section.title.trim() ||
          section.title.trim().length > 120 ||
          !STATUS_VALUES.has(section.status) ||
          !Array.isArray(section.searches)) {
        throw new HttpError(400, `Section ${sectionIndex + 1} has invalid fields.`);
      }
      ids.add(section.id);

      const searches = section.searches.map((search, searchIndex) => {
        searchCount += 1;
        if (!search || typeof search.id !== "string" ||
            !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(search.id) ||
            ids.has(search.id) ||
            typeof search.title !== "string" ||
            !search.title.trim() ||
            search.title.trim().length > 160 ||
            typeof search.url !== "string" ||
            !STATUS_VALUES.has(search.status)) {
          throw new HttpError(400, `Shortcut ${sectionIndex + 1}.${searchIndex + 1} has invalid fields.`);
        }
        let url;
        try {
          url = new URL(search.url);
        } catch {
          throw new HttpError(400, `Shortcut ${sectionIndex + 1}.${searchIndex + 1} needs a valid LinkedIn URL.`);
        }
        if (url.protocol !== "https:" || !LINKEDIN_HOSTS.has(url.hostname) ||
            !LINKEDIN_SEARCH_PATHS.has(url.pathname) ||
            url.username || url.password) {
          throw new HttpError(400, `Shortcut ${sectionIndex + 1}.${searchIndex + 1} must use a secure LinkedIn search URL.`);
        }
        ids.add(search.id);
        return {
          id: search.id,
          title: search.title.trim(),
          url: url.href,
          status: search.status
        };
      });

      return {
        id: section.id,
        title: section.title.trim(),
        status: section.status,
        searches
      };
    })
  };

  if (searchCount > MAX_SEARCHES) throw new HttpError(400, `Content exceeds the ${MAX_SEARCHES}-shortcut limit.`);
  if (new TextEncoder().encode(JSON.stringify(content)).length > CONTENT_LIMIT_BYTES) {
    throw new HttpError(413, "The content file is too large.");
  }
  return content;
}

async function readPublishedContent(env, token, ref = env.BASE_BRANCH) {
  let file;
  try {
    file = await githubApi(
      env,
      token,
      `/repos/${encodeURIComponent(env.REPO_OWNER)}/${encodeURIComponent(env.REPO_NAME)}/contents/${encodePath(env.CONTENT_PATH)}?ref=${encodeURIComponent(ref)}`
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      throw new HttpError(503, "The CMS bootstrap is not merged yet; data/site-content.json is not on the publishing branch.");
    }
    throw error;
  }
  if (file.encoding !== "base64" || typeof file.content !== "string") {
    throw new HttpError(502, "The managed content file could not be read.");
  }
  const bytes = Uint8Array.from(atob(file.content.replace(/\s/g, "")), character => character.charCodeAt(0));
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(502, "The managed content file on GitHub is not valid JSON.");
  }
  return { content: validateContent(parsed), sha: file.sha };
}

async function createContentPullRequest(env, token, currentSha, content) {
  const repoPath = `/repos/${encodeURIComponent(env.REPO_OWNER)}/${encodeURIComponent(env.REPO_NAME)}`;
  const branch = `cms/content-${Date.now()}-${randomToken(5)}`;
  const reference = await githubApi(env, token, `${repoPath}/git/ref/heads/${encodeURIComponent(env.BASE_BRANCH)}`);
  const parentSha = reference.object.sha;
  const parent = await githubApi(env, token, `${repoPath}/git/commits/${encodeURIComponent(parentSha)}`);
  const file = await githubApi(env, token, `${repoPath}/contents/${encodePath(env.CONTENT_PATH)}?ref=${encodeURIComponent(parentSha)}`);
  if (file.sha !== currentSha) throw new HttpError(409, "The published content changed while this form was open. Reload it and review the latest version.");

  const body = JSON.stringify(content, null, 2) + "\n";
  const blob = await githubApi(env, token, `${repoPath}/git/blobs`, {
    method: "POST",
    body: { content: body, encoding: "utf-8" }
  });
  const tree = await githubApi(env, token, `${repoPath}/git/trees`, {
    method: "POST",
    body: {
      base_tree: parent.commit.tree.sha,
      tree: [{
        path: env.CONTENT_PATH,
        mode: "100644",
        type: "blob",
        sha: blob.sha
      }]
    }
  });
  const commit = await githubApi(env, token, `${repoPath}/git/commits`, {
    method: "POST",
    body: {
      message: "Propose job-search dashboard content",
      tree: tree.sha,
      parents: [parentSha]
    }
  });
  await githubApi(env, token, `${repoPath}/git/refs`, {
    method: "POST",
    body: { ref: `refs/heads/${branch}`, sha: commit.sha }
  });

  let pullRequest;
  try {
    pullRequest = await githubApi(env, token, `${repoPath}/pulls`, {
      method: "POST",
      body: {
        title: "Review proposed job-search content changes",
        head: branch,
        base: env.BASE_BRANCH,
        body: [
          "This pull request was submitted from the authenticated content admin.",
          "",
          "Review `data/site-content.json` before approving and merging.",
          "The admin integration cannot approve, merge, or publish this change."
        ].join("\n")
      }
    });
  } catch (error) {
    await githubApi(env, token, `${repoPath}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: "DELETE"
    }).catch(cleanupError => console.error("Could not clean up an unsubmitted CMS branch.", cleanupError.message));
    throw error;
  }
  return { number: pullRequest.number, url: pullRequest.html_url };
}

async function startOAuth(request, env) {
  requireConfigured(env);
  if (request.method !== "GET") throw new HttpError(405, "Method not allowed.");
  const state = randomToken();
  const callbackUrl = env.AUTH_CALLBACK_URL;
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_APP_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", callbackUrl);
  authorize.searchParams.set("state", state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.href,
      "Cache-Control": "no-store",
      "Set-Cookie": `cms_oauth_state=${state}; Path=/auth/callback; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
      "Referrer-Policy": "no-referrer"
    }
  });
}

async function finishOAuth(request, env) {
  requireConfigured(env);
  if (request.method !== "GET") throw new HttpError(405, "Method not allowed.");
  const url = new URL(request.url);
  const callbackUrl = new URL(env.AUTH_CALLBACK_URL);
  if (url.origin + url.pathname !== callbackUrl.origin + callbackUrl.pathname) {
    throw new HttpError(400, "The OAuth callback URL does not match Worker configuration.");
  }
  const state = url.searchParams.get("state") || "";
  const expectedState = cookieValue(request, "cms_oauth_state");
  const redirect = new URL(env.ADMIN_URL);
  const headers = new Headers({
    Location: redirect.href,
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "Set-Cookie": clearOAuthCookie()
  });

  if (!state || !expectedState || !constantTimeEqual(state, expectedState)) {
    redirect.hash = "auth_error=invalid_state";
    headers.set("Location", redirect.href);
    return new Response(null, { status: 302, headers });
  }
  if (url.searchParams.has("error")) {
    redirect.hash = "auth_error=denied";
    headers.set("Location", redirect.href);
    return new Response(null, { status: 302, headers });
  }

  const code = url.searchParams.get("code");
  if (!code) {
    redirect.hash = "auth_error=missing_code";
    headers.set("Location", redirect.href);
    return new Response(null, { status: 302, headers });
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_APP_CLIENT_ID,
      client_secret: env.GITHUB_APP_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/auth/callback`
    })
  });
  const tokenBody = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenBody.access_token) {
    throw new HttpError(502, "GitHub sign-in could not be completed.");
  }

  const identityResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenBody.access_token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "linkedin-job-dashboard-admin"
    }
  });
  const identity = await identityResponse.json();
  if (!identityResponse.ok || typeof identity.login !== "string" ||
      identity.login.toLowerCase() !== env.ADMIN_GITHUB_LOGIN.toLowerCase()) {
    redirect.hash = "auth_error=not_authorized";
    headers.set("Location", redirect.href);
    return new Response(null, { status: 302, headers });
  }

  redirect.hash = `session=${await issueSession(identity.login, env)}`;
  headers.set("Location", redirect.href);
  return new Response(null, { status: 302, headers });
}

async function handleApi(request, env, url) {
  let headers;
  try {
    headers = corsHeaders(request, env);
  } catch (error) {
    if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status);
    throw error;
  }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

  try {
    requireConfigured(env);
    await verifySession(request, env);

    if (url.pathname === "/api/content" && request.method === "GET") {
      const token = await createAppToken(env);
      const result = await readPublishedContent(env, token);
      return jsonResponse({ content: result.content }, 200, headers);
    }
    if (url.pathname === "/api/submit" && request.method === "POST") {
      const length = Number(request.headers.get("Content-Length") || 0);
      if (length > CONTENT_LIMIT_BYTES) throw new HttpError(413, "The content file is too large.");
      const text = await request.text();
      if (new TextEncoder().encode(text).length > CONTENT_LIMIT_BYTES) {
        throw new HttpError(413, "The content file is too large.");
      }
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new HttpError(400, "The request body must be valid JSON.");
      }
      const content = validateContent(parsed.content);
      const token = await createAppToken(env);
      const current = await readPublishedContent(env, token);
      if (JSON.stringify(current.content) === JSON.stringify(content)) {
        throw new HttpError(409, "There are no content changes to submit.");
      }
      const result = await createContentPullRequest(env, token, current.sha, content);
      return jsonResponse(result, 201, headers);
    }
    throw new HttpError(404, "Admin endpoint not found.");
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status, headers);
    }
    console.error("Admin API request failed.", error instanceof Error ? error.message : "Unknown error.");
    return jsonResponse({ error: "The request could not be completed. Check Worker logs and try again." }, 500, headers);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/auth/start") return await startOAuth(request, env);
      if (url.pathname === "/auth/callback") return await finishOAuth(request, env);
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env, url);
      return jsonResponse({ error: "Not found." }, 404);
    } catch (error) {
      if (error instanceof HttpError) {
        return jsonResponse({ error: error.message }, error.status);
      }
      console.error("Admin Worker request failed.", error instanceof Error ? error.message : "Unknown error.");
      return jsonResponse({ error: "The authentication service could not complete this request." }, 500);
    }
  }
};
