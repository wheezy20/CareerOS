# GitHub OAuth prod-only 400 — audit findings

Scope: `app/routes/auth.py`, `app/config.py`, `app/main.py`,
`frontend/src/routes/login.tsx`, `frontend/src/routes/api.auth.callback.tsx`,
`frontend/src/lib/auth.ts`, `frontend/src/lib/api.ts` (fetchJson/exchangeGithubCode),
`frontend/src/router.tsx`, `frontend/src/start.ts`.

No fixes applied. Temporary diagnostic logging added — see "Logging added" at the
bottom — needs one real production login attempt to produce the evidence that
resolves the still-open items below.

---

## Ruled out (verified, not assumed)

### 1. Missing `.env` in the Railway container — NOT the cause

`app/config.py:7` — `SettingsConfigDict(env_file=".env", extra="ignore")`.

Verified empirically: ran `Settings()` from `/tmp` (no `.env` anywhere on the
path) with only real `os.environ` values set for `GITHUB_CLIENT_ID`,
`GITHUB_CLIENT_SECRET`, `JWT_SECRET`. All three fields populated correctly —
`pydantic-settings` 2.14.2 silently skips a missing `env_file` and falls back
to real process environment variables, which is exactly the Railway
condition (`.env` is gitignored, never present in the container; the four
service variables are set directly in Railway's dashboard). This is not the
bug.

### 2 & 5. Request body shape / Content-Type mismatch — NOT the cause

`frontend/src/lib/api.ts` `fetchJson` (~line 29): when `body !== undefined`
it sets `headers["Content-Type"] = "application/json"` and
`init.body = JSON.stringify(body)`. `exchangeGithubCode` (line 213) calls
`fetchJson("POST", "/auth/callback", { code })` — shape and header both
match what `CodeExchangeRequest` (`app/routes/auth.py:21`, `{code: str}`)
expects.

This is confirmed by evidence already in hand, not by re-reading the code in
isolation: the Railway log shows the response was **400**, not **422**. If
the frontend were sending the wrong body shape, missing the `code` key, or
a non-JSON content type FastAPI couldn't parse, Pydantic's request-body
validation would reject it *before* `github_callback` ever runs, and FastAPI
returns **422 Unprocessable Entity** for that — a distinct status from the
manually-raised `HTTPException(status_code=400, ...)` inside the function
body (`app/routes/auth.py:115`). Getting exactly 400 proves the request
reached line 101, parsed successfully into a valid `CodeExchangeRequest`,
and failed specifically at "GitHub didn't give us an `access_token`." This
was determinable from the log line already given, not from new evidence.

### StrictMode double-invoke (part of point 3) — NOT present

`grep -rn "StrictMode" frontend/src/` — zero matches. `frontend/src/router.tsx`
and `frontend/src/start.ts` don't wrap anything in `<React.StrictMode>`.
TanStack Start doesn't enable it by default either. Even if it were present,
StrictMode's effect double-invocation is a **development-only** behavior —
it would make the bug worse locally, not reproduce only in production. This
specific sub-hypothesis is eliminated.

---

## Real, code-verifiable issues found

### A. Token exchange never sends `redirect_uri` — but the authorize call now does, and it's dynamic

- `frontend/src/routes/login.tsx:16` — `redirect_uri` is now computed as
  `` `${window.location.origin}/api/auth/callback` `` (this changed from a
  static `VITE_GITHUB_REDIRECT_URI` env var to a dynamic value — see the
  diff note). In production this evaluates to
  `https://career-os-seven-eta.vercel.app/api/auth/callback` (or whatever
  Vercel domain served the page); locally it's
  `http://localhost:8080/api/auth/callback`.
- `app/routes/auth.py:106-110` — the token-exchange POST to
  `https://github.com/login/oauth/access_token` sends only `client_id`,
  `client_secret`, `code`. **No `redirect_uri` field at all**, in either
  environment.
- `app/config.py` has no `github_redirect_uri` field, so even though the
  task states `GITHUB_REDIRECT_URI` is set as a Railway service variable,
  nothing in the code reads it — `extra="ignore"` means `pydantic-settings`
  silently drops it. That variable is currently inert.

Why this can plausibly pass locally and fail in prod: GitHub's own
documented behavior is that if a `redirect_uri` was supplied to the
authorize step, and a *different* (or absent) one is supplied at the token
exchange step, GitHub can reject the exchange with
`{"error":"redirect_uri_mismatch", ...}`. Locally, if `localhost` happens to
be treated as GitHub's single implicitly-trusted callback for this OAuth
App (or is the only one ever registered/exercised), omitting it at exchange
time may be tolerated; a different-origin production `redirect_uri` used at
authorize time is more likely to trigger the strict check at exchange time.

**I'm not asserting this is confirmed** — this is exactly the kind of thing
the task correctly said not to guess about. It's the strongest code-level
candidate because it's a real, visible asymmetry between the two calls, and
because GitHub's JSON error for this case is `error` + `error_description`
— which the existing code already surfaces via
`token_data.get("error_description", "GitHub exchange failed")`. **The fact
that users are seeing the generic fallback string, not a specific GitHub
error message, means `error_description` was absent from GitHub's response
too** — which either means this isn't the failure mode, or GitHub's error
shape here doesn't include that key. Only the new logging (see below)
resolves this either way.

### B. `api.auth.callback.tsx` has no guard against firing the exchange more than once

`frontend/src/routes/api.auth.callback.tsx:16-28` — the `useEffect` has
dependency array `[navigate]` and no `useRef` idempotency flag. If this
component ever mounts twice for the same `code` — from a hydration-mismatch
remount, a route re-entry, or anything else — the second `exchangeGithubCode`
call reuses an already-consumed, now-invalid authorization code, and GitHub
will reject it. This is a real gap regardless of root cause.

This codebase has prior, confirmed history of exactly this class of bug:
`ProtectedRoute.tsx` (see its comment block) previously read `localStorage`
synchronously during render, which diverged between SSR and client-hydration
render passes and caused React to discard and **regenerate the entire tree
on the client** — i.e., a real, observed double-render in this app,
specifically in production/SSR rendering, not local dev. `api.auth.callback.tsx`
has no `ready`-style guard the way `ProtectedRoute.tsx` was fixed to have. I
did not find direct evidence this is currently happening on this page — StrictMode is ruled
out as the *mechanism*, but hydration-driven remounts are a different
mechanism this codebase has already hit once, and the code has no
idempotency guard either way. Confirmable from the new logging: two log
lines with the same `code_prefix` for one login attempt means this is live.

### C. Stale, unused `VITE_GITHUB_REDIRECT_URI`

`frontend/.env:3` (gitignored, local-only) — still defines
`VITE_GITHUB_REDIRECT_URI=http://localhost:8080/api/auth/callback`, but
`login.tsx` no longer reads `import.meta.env.VITE_GITHUB_REDIRECT_URI`
anywhere (it computes the value dynamically now instead — see item A). Not
a bug by itself, but if Vercel's dashboard has a project-level
`VITE_GITHUB_REDIRECT_URI` env var mirroring the old static design, it's
dead configuration now and worth removing so nobody debugs against it later
thinking it's live.

---

## Still open — needs the logging evidence, not further static reading

- **Point 4, definitively**: whether GitHub actually requires
  `redirect_uri` to match between the authorize and exchange calls *for
  this specific OAuth App's configuration*. This depends on GitHub's
  server-side validation and the app's registered callback URL(s), neither
  of which is inspectable from this repo.
- **Point 3, definitively**: whether the callback page is actually mounting
  (and thus POSTing) more than once in production. Two log lines with the
  same `code_prefix` in one login attempt confirms it; one line rules it
  out.
- What GitHub's `token_data` body actually contains on the failing request
  — this is the one piece of evidence that turns every hypothesis above
  from "plausible" into "confirmed" or "eliminated."

## Logging added (temporary — revert after root-causing)

`app/routes/auth.py`:
- Added `import logging` and a module-level `logger`.
- In `github_callback`, right after `token_data = token_res.json()`:
  logs `token_res.status_code`, the first 6 characters of the authorization
  code (enough to correlate log lines across a request without logging the
  full single-use code), and the full `token_data` dict with `access_token`
  redacted if present (harmless in the failure case we're chasing, since a
  failure response has no `access_token` — but kept as a safety habit in
  case a future run unexpectedly succeeds while this logging is still in
  place).

Next step: trigger one real login attempt against production, pull the
Railway logs for the `GitHub token exchange:` line, and paste it back — that
single log line should immediately confirm or eliminate items A and B above.
