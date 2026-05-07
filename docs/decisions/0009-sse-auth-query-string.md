# ADR-0009 — SSE auth via query-string token

**Status:** accepted (2026-05-07)
**Decided by:** project owner
**Supersedes:** none

## Context

P1.3 adds an SSE endpoint at `/api/generator/agent/stream`. The browser's `EventSource` API does not support custom request headers — `Authorization: Bearer <jwt>` cannot be sent. Constraint 18 requires Cognito JWT verification on every protected route.

The available patterns for authenticating an SSE connection:

- **Cookie-based auth** — set the JWT in an `httpOnly` cookie at login; CloudFront forwards it; the SSE handler reads it. Disruptive across the app's auth model.
- **Query-string token** — append `?token=<jwt>` to the SSE URL; server validates with `aws-jwt-verify`.
- **WebSocket with handshake auth** — different protocol, more infrastructure changes.
- **First-flight POST then GET** — POST to start a turn (with header auth), receive a one-time stream URL with a short-lived ticket; GET the SSE with the ticket. Two requests per turn.

## Decision

Use the **query-string token** approach for the SSE endpoint only. The handler validates the token with the same `aws-jwt-verify` path used by all other endpoints. The query parameter is filtered out of CloudFront access logs and CloudWatch logs.

## Consequences

**Easier:**

- Constraint 18 preserved — same JWT, same verification path.
- No change to the rest of the auth model (`Authorization: Bearer` everywhere else).
- Implementation is a one-line change to the SSE handler and a 5-line CloudFront log-format adjustment.

**Harder:**

- The token in the URL is more visible than in a header — it appears in browser dev tools, in any error reports the browser surfaces, in any non-redacted log path. We must audit log paths once before rollout.
- The token rotates with each session; if a token were leaked it would be valid only for the JWT's TTL (Cognito default: 1 hour). Acceptable risk envelope.
- Documentation must call out the SSE endpoint's exception so future contributors don't think we're bypassing constraint 18 elsewhere.

## Mitigations

- Filter `token` query parameter from CloudFront access logs (`CACHE_BEHAVIOR_LOGGING` config).
- Filter from CloudWatch via log-format adjustment in the SSE handler before logging.
- Document the exception in `HANDOFF.md` so it survives.

## Alternatives considered

- **Cookie auth.** Best long-term answer. Disruptive to the existing flow; defer to a future auth-model overhaul if one happens.
- **WebSocket.** Different protocol; CloudFront support is fine but the SDK and code path become bigger. Rejected — SSE is sufficient.
- **First-flight POST then GET.** Cleanest from a security standpoint. Implementation cost not justified for a tool inside Amazon's network with short-lived JWTs.
