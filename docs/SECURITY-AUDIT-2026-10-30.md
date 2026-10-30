# KostKraft — Security Audit

**Application:** KostKraft (kostkraft.bookends.co.in) — recipe costing for Bookends Hospitality
**Stack:** React SPA on Render (static) · Supabase (Postgres + Auth + Edge Functions) · project ref `jtdcivneerokhknmfhqe`
**Date:** 30 October 2026
**Users in scope:** 5 staff accounts
**Prepared at the request of:** Rituraj Singh, in response to a third-party report rating KostKraft **CRIT / AUTH BYPASS**

---

## 1. Verdict

**The reported critical authentication bypass does not exist.** It was tested directly against the
live project and failed at every step. The underlying claims are true in isolation — the Supabase URL
and anonymous key *are* in the JavaScript bundle, and the browser *does* keep a copy of the signed-in
user — but neither grants access to data, because authorisation is enforced in the database and keyed
to a signed token, not to anything the browser says about itself.

**The application's authorisation model is sound.** Every table enforces row-level security, an
anonymous caller reads nothing, and the privileged operations run server-side with their own checks.

**The real risk sits outside the code**, in credentials and operational practice: password-only
sign-in without multi-factor, project access tokens that were disclosed in a chat transcript, and a
connector URL that carries its own token. Those are what an attacker would actually use.

| | |
|---|---|
| Critical findings | 0 |
| High | 2 (both credential/operational) |
| Medium | 3 |
| Low | 2 |
| Closed during this audit | 2 |

---

## 2. Scope and method

Testing was performed against the live production project and the current `main` branch, combining
source review with unauthenticated probes from outside the application.

**Covered**
- Row-level security on every table in the `public` schema, probed as an anonymous caller
- Authentication flows: sign-in, sign-up, session handling, client-side session storage
- The four deployed Edge Functions (`create-user`, `delete-user`, `mcp-pair`, `mcp-http`)
- Secret exposure in the deployed JavaScript, the published MCP connector, and the git history
- The audit-trail integrity controls that the revert feature depends on
- Production dependency advisories and HTTP security headers

**Not covered** — see §7. This is a review of the authorisation model and the obvious exposure, not a
penetration test.

---

## 3. The third-party report, point by point

> *"Supabase database URL + anon key … The Supabase keys allow direct database access."*

**Partly true, not a vulnerability.** The anonymous key is designed to be public; it ships in the
browser of every Supabase web application. It identifies the project and authorises nothing on its
own. What stops it being useful is row-level security, which was tested directly:

```
$ curl ".../rest/v1/<table>?select=*&limit=2" -H "apikey: <anon key>"

raw_materials      200 []      user_profiles      200 []
recipes            200 []      ingredient_yields  200 []
recipe_ingredients 200 []      audit_logs         200 []
packaging_items    200 []      mcp_tokens         200 []
brands             200 []
```

Empty on every table, including `raw_materials`, which holds roughly 500 rows. Additionally:

- **No table in the `public` schema has RLS disabled** (`pg_class.relrowsecurity = false` → 0 rows).
- Only one policy grants anything to the anonymous role: `settings_read_contact_anon` on
  `system_settings`, restricted to `key = 'contact_details'` — the support contact shown on the login
  page, which is published on the website anyway.

> *"Interceptor code forges a 'super_admin' session with every permission on a single click."*

**Misleading.** The application kept a copy of the signed-in user in `localStorage` as a first-paint
optimisation. Anyone can edit that in their own browser and the menus will briefly render as though
they were a Super Admin. They gain nothing by it:

- Every data request still goes to Supabase, which decides from the **signed JWT**, not from the
  browser's claim. With no real session that is the anonymous case above — the pages render empty.
- The forged value is cleared as soon as Supabase reports no session
  (`src/lib/auth/initAuth.ts:43-47`).
- The database never consults a client-supplied role. `is_app_admin()`, `is_app_super_admin()`,
  `app_role()` and `has_cap()` all resolve the role from `user_profiles` using `auth.uid()`, which
  comes from the token's signature.

This is a client-side display artefact, not an authentication bypass. **It was removed during this
audit** (§6, CLOSED-2) — not because it granted access, but because there is no reason to render it.

**Conclusion:** the finding warrants an *Informational* rating. A "CRIT auth bypass" that was never
exercised against the live authorisation layer is a false positive, and an expensive one.

---

## 4. Findings

| ID | Severity | Finding |
|---|---|---|
| H-1 | High | Project access tokens disclosed in a chat transcript |
| H-2 | High | Password-only authentication: no MFA, no captcha, no visibility of failed sign-ins |
| M-1 | Medium | MCP connector token embedded in the URL |
| M-2 | Medium | Vulnerable production dependencies (7 high, 4 moderate) |
| M-3 | Medium | Ingredient prices readable by every signed-in user |
| L-1 | Low | No security headers beyond `X-Content-Type-Options` |
| L-2 | Low | `mcp-http` deployed with JWT verification disabled (by design) |

### H-1 — Project access tokens disclosed in a chat transcript

Two Supabase personal access tokens (`sbp_…`) were pasted into an AI chat session to carry out
deploys. A personal access token grants **full control of the Supabase project**: read and write any
table bypassing RLS, read secrets, change authentication settings, deploy functions.

*Evidence:* the first token now returns `401 {"message":"Invalid access token"}` — confirmed revoked.
The status of the second is unverified.

*Impact:* total compromise of the application's data if either token is still live and the transcript
is ever exposed.

*Fix:* revoke every token at https://supabase.com/dashboard/account/tokens and confirm each returns
401. For future deploys, create a token, use it, and revoke it immediately — or deploy from a machine
where it is stored only in a gitignored file.

### H-2 — Password-only authentication

All five accounts sign in with a password alone. Multi-factor authentication is not enabled, captcha
is off (it was switched on briefly and reverted, because the application does not yet send a captcha
token), and failed sign-ins are not visible — on the Supabase free plan those logs exist only in the
dashboard, and the application's Activity Log records successful sign-ins only.

*Impact:* a reused, weak or phished password gives an attacker everything that account can reach. For
an Admin or Super Admin that is the whole dataset, plus user management. This is the **most likely
route to a real compromise.**

*Fix, in order of value:*
1. Confirm every account uses a strong, unique password (a manager, not a memorised variation).
2. Enable TOTP multi-factor in Supabase Auth and enforce it for Admin and Super Admin.
3. Record failed sign-ins in the Activity Log so repeated attempts are visible in the app.
4. If captcha is wanted, implement it properly: the client must send a `captchaToken` with
   `signInWithPassword`, otherwise enabling it locks everyone out (as happened previously).

### M-1 — MCP connector token embedded in the URL

The hosted MCP server accepts its credential as the last path segment —
`.../functions/v1/mcp-http/kk_…` — because ChatGPT's custom-connector dialog offers only "OAuth" or
"No authentication" and has nowhere to put a token. **That URL is the password.** It can leak through
screenshots, browser history, shared devices or a chat transcript.

*Impact:* whoever holds the link acts as that user inside KostKraft: read everything that user can
read, create and edit raw materials, yields, recipes, packaging and wastage. Deletions are not
possible through MCP, and every change is attributed to that user in the Activity Log.

*Mitigating controls already in place:* tokens are stored only as SHA-256, are revocable from Profile
→ AI Assistant, mint a 5-minute JWT per request, and run under that user's own RLS.

*Fix:* treat the link as a credential and revoke it if it is ever shared. Longer term, implement
OAuth for the hosted server so ChatGPT never holds a bearer token in a URL. Claude Code already uses
the header form, which keeps the token out of the URL.

### M-2 — Vulnerable production dependencies

`npm audit --omit=dev` reports **11 advisories: 7 high, 4 moderate**.

| Package | Issue |
|---|---|
| `xlsx` | Prototype pollution (SheetJS) — **the one that matters**: this parses spreadsheets that users upload through Data Import |
| `postcss`, `source-map-js`, `nanoid`, `body-parser`, `fast-uri` | Denial of service / path handling, largely build-time |
| `zod` | Memory exhaustion validating oversized collections |

*Impact:* the `xlsx` advisory is reachable with attacker-influenced input — an imported file. The
others are mostly build-chain or denial-of-service and rate lower in this context.

*Fix:* upgrade `xlsx` to a patched release (SheetJS publishes outside the npm registry; pin the
vendor build) and run an upgrade pass on the rest. Re-run `npm audit --omit=dev` until only accepted
findings remain, and document those.

### M-3 — Ingredient prices readable by every signed-in user

`raw_materials_read` is `USING (true)` for any authenticated role, while `recipes_read` is properly
scoped (`app_role() IN (…) OR has_cap('recipe.viewAll') OR viewer brand scope`). The `show_cost` flag
that hides costs from chefs and viewers is therefore **a user-interface setting, not a rule** — such a
user can read ingredient prices by calling the API with their own valid token.

*Impact:* confidentiality only, and only for people who already have an account. No write access is
implied.

*Fix:* this needs care, not a blunt restriction — the recipes list loads materials for chefs and
viewers too, so simply scoping the policy would break their screen. The correct shape is a
column-limited view (ingredient names without prices) for the low-privilege roles, with the table
itself restricted to `material.view` holders.

### L-1 — Missing security headers

The live site returns only `x-content-type-options: nosniff`. There is no Content-Security-Policy, no
`X-Frame-Options`/`frame-ancestors`, no `Strict-Transport-Security`, no `Referrer-Policy`.

*Impact:* no exposure on its own, but these are the controls that limit the damage of a future
cross-site scripting bug and prevent the site being framed for clickjacking.

*Fix:* add the headers in `render.yaml`. A starting CSP should allow `self`, the Supabase project
origin and the fonts/CDN the application actually uses.

### L-2 — `mcp-http` runs with JWT verification disabled

The function is deployed `--no-verify-jwt`, so Supabase's gateway does not require a platform token.

*Assessment:* **intentional and correct.** The connector token *is* the credential, and the function
validates it itself before doing anything: it looks the hash up, rejects revoked tokens and
deactivated accounts, then mints a short-lived user JWT so RLS still applies. Recorded here so it is
not re-raised as a finding by a scanner. Verified live: a request without a token returns
`401 -32001 "Missing connector token."`

---

## 5. Controls verified as working

| Control | Evidence |
|---|---|
| RLS on every table | 0 tables with `relrowsecurity = false`; anonymous reads return `[]` across 9 tables |
| Anonymous surface | One policy, `system_settings` where `key = 'contact_details'` |
| Server-side roles | `is_app_admin()`, `app_role()`, `has_cap()` resolve from `user_profiles` via `auth.uid()` |
| Self sign-up closed | `POST /auth/v1/signup` → `422 signup_disabled` (closed during this audit) |
| Privileged operations | `create-user` / `delete-user` require a caller JWT and re-check active admin status, super-admin rules and last-admin protection; both answer `401` unauthenticated |
| Audit trail integrity | `audit_logs` has no UPDATE or DELETE policy (append-only); the `stamp_audit_actor` trigger overwrites `performed_by` with `auth.uid()`, so authorship cannot be forged; reads are Super Admin only |
| Pairing flow | Codes are single-use with a 15-minute expiry; `mcp-pair` answers `400` without one |
| No secrets in shipped code | The site bundle contains exactly one JWT (`role: anon`); the published connector likewise; no service-role key, no `sbp_` token |
| No secrets in git history | Only `.env.example` with blank values was ever committed; `.env*` is gitignored |
| XSS sinks | No `dangerouslySetInnerHTML` anywhere in `src/` |
| MCP blast radius | No delete tool exists; reports and approvals are deliberately excluded; writes are role-checked and attributed |

---

## 6. Closed during this audit

**CLOSED-1 — Open self-registration.** Anyone could create an account. Registrations landed as
pending viewers with no data access (which is why a dozen earlier probe sign-ups were harmless), but
the door is now shut at the source: `disable_signup` is set on the project, verified by
`422 signup_disabled`. The application follows — the login and contact pages direct people to an
administrator, and `/signup` explains that accounts are created for you. Administrators create
accounts from User Management, which works through a service-role Edge Function that is unaffected by
the signup lock.

**CLOSED-2 — Persisted client session.** The browser no longer stores the signed-in user in Supabase
mode, removing the forged-administrator rendering described in §3 entirely.

---

## 7. Limitations

This review did **not** include: fuzzing or abuse testing of the Edge Functions; authentication-flow
abuse (password-reset races, email enumeration, rate-limit testing); CSRF or clickjacking testing;
a review of the Render and GitHub account configuration; mobile/PWA-specific storage review; or any
social-engineering assessment. Supabase's own infrastructure was treated as trusted.

"No critical holes found in the authorisation model" is a narrower statement than "the application is
secure", and should be read as such.

---

## 8. Remediation plan

**This week**
1. Revoke all Supabase personal access tokens and confirm each returns 401 (H-1).
2. Enable multi-factor authentication on the Supabase, GitHub and Render **accounts** — whoever holds
   those does not need an application bug to reach the data.
3. Confirm the five application passwords are strong and unique (H-2).

**This month**
4. Enable TOTP multi-factor for application Admin and Super Admin accounts (H-2).
5. Upgrade `xlsx`; clear or document the remaining advisories (M-2).
6. Add security headers in `render.yaml` (L-1).
7. Record failed sign-ins in the Activity Log (H-2).

**When convenient**
8. Decide whether chefs and viewers should see ingredient prices; if not, build the column-limited
   view (M-3).
9. Implement OAuth for the hosted MCP server so ChatGPT no longer carries a token in a URL (M-1).

---

## Appendix — reproducing the key checks

```bash
# Anonymous read attempt (expect 200 [] for every table)
curl -s "https://<ref>.supabase.co/rest/v1/raw_materials?select=*&limit=2" -H "apikey: <anon key>"

# Self sign-up (expect 422 signup_disabled)
curl -s -X POST "https://<ref>.supabase.co/auth/v1/signup" -H "apikey: <anon key>" \
  -H "Content-Type: application/json" --data '{"email":"x@example.com","password":"…"}'

# Edge Functions without credentials (expect 401 / 400, never data)
curl -s -X POST "https://<ref>.supabase.co/functions/v1/{create-user,delete-user,mcp-pair,mcp-http}"

# Secrets in the shipped bundle (expect one JWT, role: anon)
curl -s "https://kostkraft.bookends.co.in/assets/index-*.js" | grep -oE 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'

# Dependency advisories
npm audit --omit=dev

# Security headers
curl -sI https://kostkraft.bookends.co.in/
```

Tables without RLS, and policies reachable anonymously, were enumerated through the Supabase
Management API against `pg_class.relrowsecurity` and `pg_policies`.
