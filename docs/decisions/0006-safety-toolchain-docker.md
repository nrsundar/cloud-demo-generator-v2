# ADR-0006 — Safety toolchain in Docker image

**Status:** accepted (2026-05-07)
**Decided by:** project owner
**Supersedes:** none

## Context

P1.5 requires deterministic scanners on every CFN, code, and module emission: `cfn-lint`, `cfn-nag`, `detect-secrets`. None of these are JavaScript libraries. The options:

- **Bake the tools into the Docker image** as Python and Ruby installs; spawn as subprocesses from Node.
- **Run the tools out-of-process via Lambda** — separate function per scanner, IPC over invoke.
- **Find or write JavaScript equivalents** (tooling like cfn-guard has Node bindings).
- **Skip the scanners** and rely on the LLM to self-check.

## Decision

Bake the tools into the Docker image. The `node:18-alpine` runtime stage installs Python 3, Ruby, then `pip install cfn-lint detect-secrets` and `gem install cfn-nag`. Tools are spawned via Node's `child_process.spawn` with stdin-only input, 10s timeout, and bounded output buffers.

Image size grows by ~120MB. Constraint 5 (no new dependencies) is interpreted as referring to the **JavaScript bundle** — the runtime image is not part of that constraint.

## Consequences

**Easier:**

- The frontend bundle stays at 344KB. Constraint 5 in spirit is preserved.
- Scanners run in-process (synchronous wait), keeping the agent loop's flow simple.
- Tools are at canonical versions trusted by the AWS community; no in-house re-implementation risk.
- Subprocess spawn overhead is modest (~50ms cold per call, less when cached after first call).

**Harder:**

- Backend Docker image grows ~120MB. Push and pull times grow proportionally; ECS task cold-start grows by a few seconds.
- The image now has Python, Ruby, and Node runtimes. Three security update cadences instead of one. Document quarterly review.
- Subprocess hygiene must be careful (the `server/safety/subprocess.ts` wrapper covers timeouts, stdin-only, output bounding).

## Alternatives considered

- **Lambda-based scanners.** Cleaner isolation but adds latency (Lambda cold start) and a new piece of infrastructure to operate. Rejected — the in-process spawn is simpler and fast enough.
- **JavaScript equivalents.** `cfn-lint` has no Node port. `cfn-nag` has no Node port. Writing them in-house is a multi-month project with poor ROI. Rejected.
- **Skip scanners.** Eliminates the safety story for a tool field SAs deploy in customer-adjacent environments. Rejected on principle.
- **Run scanners on the client.** Browsers cannot run Python or Ruby. Rejected.
