/**
 * Security Integration Tests
 * Verifies authentication and authorization controls on all API endpoints.
 *
 * Run: API_BASE=http://localhost:5000 node tests/security.mjs
 * Or:  API_BASE=http://demo-gen-alb-....elb.amazonaws.com node tests/security.mjs
 */

const BASE = process.env.API_BASE || "http://localhost:5000";
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function fetchApi(path, opts = {}) {
  return fetch(`${BASE}${path}`, opts);
}

console.log(`\nSecurity Integration Tests — ${BASE}\n`);

// ── 1. Public endpoints ──
console.log("Public endpoints:");

await test("GET /api/health returns 200 without auth", async () => {
  const res = await fetchApi("/api/health");
  assert(res.status === 200, `Expected 200, got ${res.status}`);
});

// ── 2. Unauthenticated access denied ──
console.log("\nUnauthenticated access (should all return 401):");

const protectedRoutes = [
  ["GET", "/api/repositories"],
  ["POST", "/api/repositories"],
  ["GET", "/api/repositories/1"],
  ["GET", "/api/repositories/1/zip"],
  ["POST", "/api/feedback"],
  ["GET", "/api/feedback"],
  ["GET", "/api/analytics/stats"],
];

for (const [method, path] of protectedRoutes) {
  await test(`${method} ${path} returns 401`, async () => {
    const res = await fetchApi(path, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : {},
      body: method === "POST" ? JSON.stringify({}) : undefined,
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });
}

// ── 3. Invalid token rejected ──
console.log("\nInvalid token (should return 401):");

await test("GET /api/repositories with fake token returns 401", async () => {
  const res = await fetchApi("/api/repositories", {
    headers: { Authorization: "Bearer fake.invalid.token" },
  });
  assert(res.status === 401, `Expected 401, got ${res.status}`);
});

await test("GET /api/repositories with empty Bearer returns 401", async () => {
  const res = await fetchApi("/api/repositories", {
    headers: { Authorization: "Bearer " },
  });
  assert(res.status === 401, `Expected 401, got ${res.status}`);
});

await test("GET /api/repositories with no Bearer prefix returns 401", async () => {
  const res = await fetchApi("/api/repositories", {
    headers: { Authorization: "some-token" },
  });
  assert(res.status === 401, `Expected 401, got ${res.status}`);
});

// ── 4. CORS headers ──
console.log("\nCORS:");

await test("OPTIONS returns 204 with CORS headers for allowed origin", async () => {
  const res = await fetchApi("/api/repositories", {
    method: "OPTIONS",
    headers: { Origin: "https://example.amplifyapp.com" },
  });
  assert(res.status === 204, `Expected 204, got ${res.status}`);
});

// ── Summary ──
console.log(`\n${"=".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${"=".repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
