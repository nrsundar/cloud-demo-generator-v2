// Safety guardrails for the agent loop.
// Belt-and-suspenders: cap inputs, redact obvious secrets, gate tools by principal,
// and rate-limit per user. Full prompt-injection defense is impossible — this aims to
// shrink the blast radius if a malicious tool result or user message slips through.

import type { Principal } from "../tools/types";

// ── Input limits ──

export const MAX_USER_MESSAGE_CHARS = 8_000;

const CONTROL_CHARS_RE = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u200B-\\u200D\\uFEFF]",
  "g",
);

export function sanitizeUserMessage(
  raw: string,
): { ok: true; value: string } | { ok: false; reason: string } {
  if (typeof raw !== "string") return { ok: false, reason: "userMessage must be a string" };
  if (raw.length === 0) return { ok: false, reason: "userMessage is empty" };
  if (raw.length > MAX_USER_MESSAGE_CHARS) {
    return { ok: false, reason: `userMessage exceeds ${MAX_USER_MESSAGE_CHARS} characters` };
  }
  const cleaned = raw.replace(CONTROL_CHARS_RE, "");
  return { ok: true, value: cleaned };
}

// ── Tool gating ──
// `Principal.isAdmin?` is the only role flag today; ADMIN_ONLY_TOOLS is empty but
// the gate is here so adding one is a one-liner.

const ADMIN_ONLY_TOOLS = new Set<string>([]);

export function isToolAllowed(toolName: string, principal: Principal): boolean {
  if (ADMIN_ONLY_TOOLS.has(toolName) && !principal.isAdmin) return false;
  return true;
}

// ── Rate limiting (per-user, in-memory) ──
// Resets on process restart — fine for the demo; real deployment would use Redis.

const ROLLING_WINDOW_MS = 60_000;
const MAX_TURNS_PER_WINDOW = 30;

interface BucketState {
  count: number;
  windowStart: number;
}
const buckets = new Map<string, BucketState>();

export function checkRateLimit(
  userId: string,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterMs: number } {
  const b = buckets.get(userId);
  if (!b || now - b.windowStart > ROLLING_WINDOW_MS) {
    buckets.set(userId, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (b.count >= MAX_TURNS_PER_WINDOW) {
    return { ok: false, retryAfterMs: ROLLING_WINDOW_MS - (now - b.windowStart) };
  }
  b.count++;
  return { ok: true };
}

// ── Secret redaction ──
// Best-effort redaction for content handed back to the model or persisted.

const REDACTORS: Array<[RegExp, string]> = [
  [/\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, "<REDACTED:AWS_ACCESS_KEY_ID>"],
  [
    /("?aws_secret_access_key"?\s*[:=]\s*"?)[A-Za-z0-9/+=]{40}("?)/gi,
    "$1<REDACTED:AWS_SECRET>$2",
  ],
  [/\bghp_[A-Za-z0-9]{36}\b/g, "<REDACTED:GITHUB_PAT>"],
  [
    /-----BEGIN (RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----[\s\S]*?-----END \1PRIVATE KEY-----/g,
    "<REDACTED:PRIVATE_KEY>",
  ],
  [
    /("?authorization"?\s*[:=]\s*"?)Bearer\s+[A-Za-z0-9._\-+=/]+("?)/gi,
    "$1Bearer <REDACTED>$2",
  ],
];

export function redactSecrets(input: string): string {
  let out = input;
  for (const [re, repl] of REDACTORS) out = out.replace(re, repl);
  return out;
}

export function redactJson(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactSecrets(value);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactJson);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = redactJson(v);
  }
  return out;
}
