# Access control

Deny-by-default authorisation for every route under `/api/v1`.

Implements **R-1** from `audit_report.md`, which closes findings **C-1** (unauthenticated
appointments/dashboard), **C-2** (tenant isolation), **C-3** (RBAC privilege escalation),
**C-5** (unguarded refunds), **H-2** (34 route files with no authorisation) and **CC-1**
(two competing RBAC systems).

## The idea

`policy.ts` is the single source of truth. One gate consults it before any handler runs.

**A request that matches no policy entry is denied.** That asymmetry is the point:

| Situation | Result |
|---|---|
| Route exists, no policy entry | **Denied** — 403 `NO_POLICY`, and `verify:policy` fails the build |
| Policy entry, no route | Harmless dead config — reported as *orphaned* |

Drift can only fail safe. Forgetting the security step on a new route produces a broken
feature in development, never an open door in production.

## Files

| File | Role |
|---|---|
| `policy.ts` | The table. 424 entries. **Edit this to change access.** |
| `types.ts` | `PUBLIC` / `SELF` symbols and the `PolicyEntry` shape |
| `gate.ts` | `accessControl` middleware + the pure `decide()` function |
| `permissions.ts` | DB-backed permission lookup, Redis-cached, with invalidation |
| `registry.ts` | Records every declared route (see *Why not walk the stack* below) |
| `install.ts` | Side-effect import that installs the registry — must load first |
| `reconcile.ts` | Proves every route has a policy; used at boot and in CI |

## Adding a route

1. Add the handler as usual.
2. Add a line to `policy.ts`.
3. `npm run verify:policy`.

Order matters — first match wins, exactly like Express. Put literal segments **before**
their `:param` siblings (`/api/patients/me` precedes `/api/patients/:id`).

## Rolling it out

The table was generated from the routes as they exist today, so `perm` values on routes
that never had a `checkPermission` call were **derived** from the route shape and carry
`review: true` (338 of 424). They are best guesses, not decisions.

Do not switch straight to enforcement.

```bash
# 1. Observe. Logs would-be denials, denies nothing.
POLICY_MODE=report npm run dev
```

Exercise the app and the web/mobile clients. Every `[POLICY:report] would deny …` line is
either a policy entry to correct or a real hole the audit found. Fix the table until the
log is quiet.

```bash
# 2. Enforce.
POLICY_MODE=enforce npm start

# 3. Once every `review: true` has been confirmed and removed, hold the line in CI:
npm run verify:policy:strict
```

During migration the existing `authentication` / `checkPermission` middleware can stay —
it is redundant but harmless. Remove it per route file afterwards; the gate is then the
only authority.

## Why not walk `app.router.stack`?

Express 5 removed `layer.regexp` in favour of `layer.matchers`, and `layer.path` is
`undefined` until a request matches. The Express 4 idiom of parsing `layer.regexp.source`
to recover a mount path yields nothing here — **silently**, so the reconciler would report
"all clear" forever. `registry.ts` records paths at declaration time instead, depending on
no Express internals.

This is why `install.ts` must be the first import in `router.ts`: TypeScript hoists
`import` statements above ordinary statements, so a bare `installRegistry()` call between
imports would run *after* every route file had already created its routers.

## Notes

- Cross-tenant access returns **404, not 403** — a 403 would confirm another tenant's
  record exists.
- `PUBLIC` entries are the unauthenticated attack surface. There are 16, and
  `src/tests/security/policy.test.ts` pins the exact list; adding one fails that test
  until the list is updated deliberately.
- `SELF` means the handler resolves the caller's own record from `req.user.userId`. Never
  use it on a route that takes an id.
- The gate rejects tokens whose `purpose` is not `access`, closing the 2FA bypass (C-4):
  password-reset, email-verification and TOTP-challenge tokens share `JWT_SECRET` and were
  previously usable as access tokens.
- Permissions are cached in Redis for 5 minutes. `invalidatePrincipal(userId)` and
  `invalidateRoleMembers(roleId)` are wired into the role service — call them from any new
  code path that changes a user's role or a role's permissions.

## Related fixes shipped alongside

**C-6 — Socket.IO handshake auth.** `notification.service.ts` now authenticates the
handshake via `io.use()` and derives rooms from the verified token. There is deliberately
no client-controlled join: previously any anonymous client could connect and name any
room via `join_tenant` / `join_user`, receiving another tenant's clinical stream. Those
events are kept as logged no-ops for older clients. CORS origin is `FRONTEND_URL`, never
`*`. Clients must pass a token:

```js
io(url, { auth: { token: accessToken } })          // or an Authorization: Bearer header
```

**H-3 — Flutterwave webhook fails closed.** The old `signature !== secretHash` compared
two `undefined`s when `FLUTTERWAVE_WEBHOOK_HASH` was unset and the caller omitted the
`verif-hash` header — which is `false`, so the request was *admitted*. It now rejects when
the secret is unconfigured, and compares with `timingSafeEqualStr`. Paystack's HMAC check
uses the same constant-time comparison.

## Still open

Everything else in `audit_report.md` — notably C-2's controller-level header fallbacks
(the gate enforces tenancy, but `req.headers['x-tenant-id']` fallbacks should still be
deleted from controllers), H-1 (the audit trail is never mounted), H-4/H-5 (rate-limit
fail-open and `trust proxy`), and UJ-1/UJ-2 (client path mismatch, no token refresh).
