import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";
import { generateKeyPairSync, webcrypto, verify as verifySignature } from "node:crypto";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const source = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
const workerModule = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const originalFetch = globalThis.fetch;

after(() => {
  globalThis.fetch = originalFetch;
});

const env = {
  ADMIN_GITHUB_LOGIN: "Ravi3700",
  ADMIN_ORIGIN: "https://ravi3700.github.io",
  ADMIN_URL: "https://ravi3700.github.io/linkedin-job-dashboard/admin/",
  REPO_OWNER: "Ravi3700",
  REPO_NAME: "linkedin-job-dashboard",
  BASE_BRANCH: "main",
  CONTENT_PATH: "data/site-content.json",
  GITHUB_APP_ID: "123",
  GITHUB_APP_INSTALLATION_ID: "456",
  GITHUB_APP_CLIENT_ID: "test-client",
  GITHUB_APP_CLIENT_SECRET: "test-secret",
  AUTH_CALLBACK_URL: "https://worker.test/auth/callback",
  SESSION_SECRET: "test-session-secret-with-more-than-thirty-two-characters",
  GITHUB_APP_PRIVATE_KEY: ""
};

const originalContent = {
  schemaVersion: 1,
  sections: [{
    id: "section-01",
    title: "Data Analyst",
    status: "published",
    searches: [{
      id: "section-01-search-001",
      title: "Data Analyst",
      url: "https://www.linkedin.com/jobs/search/?keywords=Data+Analyst",
      status: "published"
    }, {
      id: "section-01-search-002",
      title: "Hiring Data Analyst",
      url: "https://www.linkedin.com/search/results/content/?keywords=Hiring+Data+Analyst",
      status: "published"
    }]
  }]
};

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" }
});
env.GITHUB_APP_PRIVATE_KEY = privateKey;

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function sessionToken(login = "Ravi3700") {
  const payload = base64Url(JSON.stringify({
    sub: login,
    aud: "Ravi3700/linkedin-job-dashboard",
    exp: Math.floor(Date.now() / 1000) + 900
  }));
  const key = await webcrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await webcrypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${Buffer.from(signature).toString("base64url")}`;
}

function adminRequest(path, options = {}) {
  return new Request(`https://worker.test${path}`, {
    ...options,
    headers: {
      Origin: env.ADMIN_ORIGIN,
      ...(options.headers || {})
    }
  });
}

test("admin API rejects unauthenticated and foreign-origin requests", async () => {
  globalThis.fetch = async () => {
    throw new Error("Unauthenticated requests must not contact GitHub.");
  };
  const unauthorized = await workerModule.default.fetch(
    adminRequest("/api/content"),
    env
  );
  assert.equal(unauthorized.status, 401);

  const foreign = await workerModule.default.fetch(
    new Request("https://worker.test/api/content", {
      headers: { Origin: "https://attacker.example" }
    }),
    env
  );
  assert.equal(foreign.status, 403);
});

test("admin API rejects a valid session for a different GitHub login", async () => {
  globalThis.fetch = async () => {
    throw new Error("Unauthorized sessions must not contact GitHub.");
  };
  const token = await sessionToken("unapproved-user");
  const response = await workerModule.default.fetch(adminRequest("/api/content", {
    headers: { Authorization: `Bearer ${token}` }
  }), env);
  assert.equal(response.status, 401);
});

test("content validation rejects unsafe links before GitHub access", async () => {
  globalThis.fetch = async () => {
    throw new Error("Invalid content must be rejected before GitHub access.");
  };
  const token = await sessionToken();
  const response = await workerModule.default.fetch(adminRequest("/api/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: {
        schemaVersion: 1,
        sections: [{
          id: "unsafe",
          title: "Unsafe",
          status: "published",
          searches: [{
            id: "unsafe-link",
            title: "Not LinkedIn",
            url: "javascript:alert(1)",
            status: "published"
          }]
        }]
      }
    })
  }), env);
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /secure LinkedIn search URL/);

  const nonSearch = structuredClone(originalContent);
  nonSearch.sections[0].searches[0].url = "https://www.linkedin.com/feed/";
  const nonSearchResponse = await workerModule.default.fetch(adminRequest("/api/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ content: nonSearch })
  }), env);
  assert.equal(nonSearchResponse.status, 400);
  assert.match((await nonSearchResponse.json()).error, /secure LinkedIn search URL/);
});

test("valid content submission creates an open review pull request only", async () => {
  const calls = [];
  const encodedContent = Buffer.from(JSON.stringify(originalContent)).toString("base64");
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input);
    const method = options.method || "GET";
    calls.push({ url: url.href, method, body: options.body ? JSON.parse(options.body) : null });

    if (url.pathname.endsWith("/access_tokens")) {
      const [header, payload, signature] = options.headers.Authorization.split(" ")[1].split(".");
      assert.equal(JSON.parse(Buffer.from(payload, "base64url").toString()).iss, env.GITHUB_APP_ID);
      assert.equal(verifySignature(
        "RSA-SHA256",
        Buffer.from(`${header}.${payload}`),
        publicKey,
        Buffer.from(signature, "base64url")
      ), true);
      return Response.json({ token: "installation-token" });
    }
    if (url.pathname.endsWith("/contents/data/site-content.json")) {
      return Response.json({ encoding: "base64", content: encodedContent, sha: "file-sha" });
    }
    if (url.pathname.endsWith("/git/ref/heads/main")) {
      return Response.json({ object: { sha: "parent-commit" } });
    }
    if (url.pathname.endsWith("/git/commits/parent-commit")) {
      return Response.json({ commit: { tree: { sha: "parent-tree" } } });
    }
    if (url.pathname.endsWith("/git/blobs")) return Response.json({ sha: "new-blob" });
    if (url.pathname.endsWith("/git/trees")) return Response.json({ sha: "new-tree" });
    if (url.pathname.endsWith("/git/commits")) return Response.json({ sha: "new-commit" });
    if (url.pathname.endsWith("/git/refs")) return Response.json({ ref: "refs/heads/cms/test" });
    if (url.pathname.endsWith("/pulls")) {
      return Response.json({ number: 17, html_url: "https://github.com/Ravi3700/linkedin-job-dashboard/pull/17" }, { status: 201 });
    }
    throw new Error(`Unexpected GitHub API request: ${method} ${url.pathname}`);
  };

  const proposed = structuredClone(originalContent);
  proposed.sections[0].searches[0].title = "Updated Data Analyst";
  const token = await sessionToken();
  const response = await workerModule.default.fetch(adminRequest("/api/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ content: proposed })
  }), env);

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    number: 17,
    url: "https://github.com/Ravi3700/linkedin-job-dashboard/pull/17"
  });
  const pullRequest = calls.find(call => call.url.endsWith("/pulls"));
  assert.equal(pullRequest.body.base, "main");
  assert.equal(pullRequest.body.head.startsWith("cms/content-"), true);
  assert.equal(calls.some(call => /\/(merge|reviews)(\/|$)/.test(new URL(call.url).pathname)), false);
  const ref = calls.find(call => call.url.endsWith("/git/refs"));
  assert.equal(ref.body.ref, `refs/heads/${pullRequest.body.head}`);
  assert.equal(ref.body.sha, "new-commit");
  const tree = calls.find(call => call.url.endsWith("/git/trees"));
  assert.deepEqual(tree.body.tree.map(entry => entry.path), ["data/site-content.json"]);
});

test("OAuth start uses the configured callback and secure state cookie", async () => {
  const response = await workerModule.default.fetch(
    new Request("https://worker.test/auth/start"),
    env
  );
  assert.equal(response.status, 302);
  const location = new URL(response.headers.get("Location"));
  assert.equal(location.origin, "https://github.com");
  assert.equal(location.searchParams.get("redirect_uri"), env.AUTH_CALLBACK_URL);
  assert.ok(location.searchParams.get("state"));
  assert.match(response.headers.get("Set-Cookie"), /HttpOnly; Secure; SameSite=Lax/);
});
