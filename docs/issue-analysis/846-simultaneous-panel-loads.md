# Issue #846 — Dashboard panels fail to load simultaneously

Deep-dive analysis against the codebase at `/Users/lunaticus/Documents/Work/clickhouse-grafana` (branch `feature/advanced-logs-field-settings`).

- Repo: Altinity ClickHouse datasource plugin for Grafana (TypeScript frontend + Go backend).
- Issue: <https://github.com/Altinity/clickhouse-grafana/issues/846>
- Status at time of writing: **OPEN**, author `Anbu42` (2026-01-23). Maintainer `Slach` (collaborator) triaging; contributor `frvade` supplied the decisive diagnosis.
- Reported environment: Grafana `10.4.18-security-01`, plugin `v3.4.8`, ClickHouse `25.3.4.190`. Grafana runs in Kubernetes; ClickHouse on VMs. Nothing sits between browser↔Grafana or Grafana↔ClickHouse (per reporter).

## Distilled comment-thread timeline

1. **Report (Anbu42):** Opening a dashboard with many panels, some panels fail with `Query execution failed: Unexpected error`. Each panel loads fine **individually**. Grafana logs show repeated `method=GET path=/api/datasources/proxy/uid/<UID>/ status=499 ... size=0 ... status_source=downstream`, interleaved with `plugin.context ... "Could not create user agent" error="invalid user agent format"` warnings. Symptom: dashboard-wide, only under simultaneous load.
2. **Slach:** Asks whether hovering the red panel icons shows an error, and whether the JS console shows anything.
3. **Anbu42:** Hover shows only `Query execution failed: Unexpected error`. JS console has many such messages (screenshot).
4. **Slach:** Asks to inspect the DevTools **Network** tab, filter by `/api/datasource`, check whether all requests return 200.
5. **Anbu42:** Insists the network is fine (ClickHouse reachable via CLI from the same cluster; datasource "Test" passes; reproduces against any node). Screenshot of network traffic.
6. **Slach:** Notes the responses are **zero-size**, suspects a network issue; `status=499` means the **client closed the connection before Grafana sent a response**; asks about the network topology (proxies between browser↔Grafana or Grafana↔ClickHouse) and asks for response-header screenshots on the failing requests.
7. **Anbu42:** No response data available for the failing requests. Reiterates there is no proxy and dashboards load fine one-by-one. Later adds that *some* queries have now stopped working even individually and asks **how to debug the plugin**.
8. **frvade (decisive):** "It looks like it happens when the query is too long. With **HTTP/1.1** the server responds with **414** normally and only the problematic query breaks; with **HTTP/2** it breaks the **whole connection** and the whole page fails because of one long query. So the root cause is the method of sending the SQL query **in the URL**. Is it possible to migrate it to POST?"
9. **Slach:** POST is already available — points to the `usePOST` datasource setting and the provisioning example (`docker/grafana/provisioning/datasources/clickhouse.yaml`). Asks Anbu42 to enable the **"Use POST"** checkbox and retest.
10. **Slach (follow-ups):** Repeats the request to enable POST; asks whether the error is still present. **No confirmation from the reporter yet** at time of writing.

Net: the thread converges on **query-in-URL (GET) + long SQL + HTTP/2** as the trigger. `usePOST=true` is the known workaround. The unresolved product question is whether the plugin should stop putting SQL in the URL by default.

---

## 0. TL;DR

**Most probable root cause (confirmed by code + frvade's repro):** the plugin sends the full SQL query as a `query=<url-encoded-SQL>` **GET URL parameter** by default (`usePOST` defaults to `false`). Both request paths do this:

- **Frontend/browser path** (what the #846 logs show — `/api/datasources/proxy/uid/...`): `buildRequestOptions()` builds a GET URL with `query=...` (`src/datasource/request-options.ts:60-63`).
- **Backend/plugin path** (Go `QueryData`): `ClickHouseClient.Query` builds a GET request and adds `params.Add("query", query)` (`pkg/client.go:49-57`).

When a dashboard renders many panels at once, several large queries are issued **concurrently over one HTTP/2 connection** to the same ClickHouse origin. A URL that exceeds the server's/proxy's URI-length limit yields a **414**; under **HTTP/2** the stream reset / connection error cascades and tears down the shared connection, so **sibling panels on the same connection also fail** (each records `status=499`, `size=0`). This is exactly why panels load fine individually (short-lived, isolated connection) but fail together. The `status_source=downstream` and `size=0` in the logs are consistent with Grafana's proxy receiving a broken/empty downstream response and the browser aborting (499). The `Could not create user agent / invalid user agent format` warnings are a **separate, cosmetic** log-noise issue (see §Risks) — not the cause.

**Recommendation:** Make the plugin **default to POST** (or auto-switch to POST when the query length exceeds a safe URL threshold), so SQL never rides in the URL. POST is already fully implemented on both frontend (`request-options.ts:57-59`) and backend (`pkg/client.go:44-48`); the fix is primarily changing the default and/or adding a length-based fallback, plus documentation. Also fix the concurrency subtlety that a single failing panel can poison siblings (see §Fallback / hardening).

**Effort:** SMALL–MEDIUM (S/M). Flipping the default is trivial; the safer "auto-POST for long queries" fallback and migration/back-compat handling push it toward Medium. Core plumbing already exists.

---

## 1. Map of relevant code (file:line)

| Location | Symbol | Role |
|---|---|---|
| `src/datasource/request-options.ts:45-120` | `buildRequestOptions()` | **Frontend request builder.** Decides GET-with-`query`-in-URL vs POST-with-body. |
| `src/datasource/request-options.ts:57-63` | `usePOST` branch | `usePOST` → `method=POST`, `data=query`; else `method=GET`, `params.push('query=' + encodeURIComponent(query))`. **The GET branch is the defect.** |
| `src/datasource/request-options.ts:115-117` | URL assembly | Appends all `params` (including `query=...`) to the URL. |
| `src/datasource/datasource.ts:71` | `this.usePOST = instanceSettings.jsonData.usePOST \|\| false` | **Frontend default is `false`** (GET). |
| `src/datasource/datasource.ts:151-159` | `_getRequestOptions` / `_request` | Wires `this.usePOST` into `buildRequestOptions`; issues the request via `backendSrv.fetch`. |
| `src/datasource/datasource.ts:161-185` | `_request` | Sends through Grafana's `backendSrv.fetch` → datasource proxy → ClickHouse. |
| `src/datasource/datasource.ts:446-483` | `executeQueries` | Panel query fan-out: `Promise.all(queries.map(... seriesQuery ...))`. One rejected promise rejects the whole `Promise.all` batch. |
| `src/datasource/datasource.ts:496+` | `query()` | Grafana entry point per panel; builds targets, calls executeQueries. |
| `src/datasource/datasource.ts:855-858` | `seriesQuery` | Appends `FORMAT JSON`, delegates to `_request`. |
| `src/datasource/datasource.ts:466-476` | error mapping | Produces the user-facing `Query execution failed: ...` messages. |
| `src/views/ConfigEditor/ConfigEditor.tsx:173-184` | "Use POST" switch | `value={jsonData.usePOST \|\| false}` — **default off** in the config UI. |
| `pkg/client.go:31-57` | `ClickHouseClient.Query` | **Backend request builder.** `if UsePost {POST body} else {GET + params.Add("query", query)}`. |
| `pkg/client.go:87-98` | `HTTPClient.Do` | Executes the request on the **shared** `*http.Client`. |
| `pkg/datasource_settings.go:20` | `UsePost bool json:"usePOST"` | Backend setting; zero-value **`false`** (GET) when JSON key absent. |
| `pkg/datasource_settings.go:63-70` | `httpclient.New(httpClientOptions)` | Builds the shared `*http.Client` from Grafana's SDK. HTTP/2 negotiation is default Go/SDK behavior over TLS. |
| `pkg/datasource.go:78-131` | `QueryData` | **Concurrent** query execution: one goroutine per query via `errgroup`, all sharing the same `*http.Client`. |
| `pkg/datasource.go:99-105` | `wg.Go` closures | If any closure returned a non-nil error, `errgroup` cancels `wgCtx`, cancelling **sibling in-flight requests** (`context canceled`). Note: current code returns `nil` from closures and stores per-query errors, so this specific cancel path is mostly avoided — see §Root-cause detail. |
| `pkg/datasource_settings_test.go:48` | `require.Equal(t, false, dsSettings.UsePost)` | Test that pins the **default to `false`** (must be updated if we flip the default). |
| `src/plugin.json:55-84` | `routes` | Datasource proxy routes (used for X-header auth variants). The default route is Grafana's generic datasource proxy. |
| `docker/grafana/provisioning/datasources/clickhouse.yaml:15` | `usePOST: true` | Provisioning examples already default POST — inconsistent with the code default. |

---

## 2. Root-cause analysis (ranked)

### Hypothesis A — SQL sent in the GET URL; long queries + HTTP/2 tear down the shared connection (CONFIRMED as primary)

**Evidence — code:**
- Frontend default `usePOST=false` (`datasource.ts:71`, `ConfigEditor.tsx:181`) → GET with `query=<encoded SQL>` in the URL (`request-options.ts:60-63`, assembled at `:115-117`).
- Backend default `UsePost=false` (zero value of `pkg/datasource_settings.go:20`, pinned by `datasource_settings_test.go:48`) → GET with `params.Add("query", query)` (`pkg/client.go:49-57`).
- Both paths therefore encode the entire SQL statement into the request-URI. There is **no URL-length guard anywhere** (grep for `maxLength`/`414`/`url.length` found none).

**Evidence — issue:**
- frvade's direct repro: long query → **414** on HTTP/1.1 (isolated failure) vs **whole-connection break** on HTTP/2 (dashboard-wide failure). This is the textbook behavior: a 414/oversized-header on an HTTP/2 stream can trigger `RST_STREAM`/`GOAWAY`, and clients that pipeline multiple panel queries onto the same connection lose the siblings too.
- The #846 log lines are all `method=GET path=/api/datasources/proxy/uid/<UID>/ status=499 size=0 status_source=downstream` — i.e. GET requests to the datasource proxy that produced **empty** responses and were **aborted by the client** (499). Consistent with the browser cancelling sibling requests when the shared connection collapses.
- "Loads fine one-by-one, fails together" is explained precisely: individual loads don't share/saturate a single HTTP/2 connection with a poison-pill long URL alongside siblings.

**Why HTTP/2 specifically matters:** Grafana ≥ recent versions and Go's `http.Transport` negotiate HTTP/2 over TLS by default (`ForceAttemptHTTP2`). Under HTTP/1.1, browsers/proxies open multiple connections and an oversized request fails in isolation (clean 414). Under HTTP/2, many panel requests multiplex over **one** TCP connection; a protocol-level error induced by the oversized request can reset the connection, failing concurrent streams. This matches both frvade's observation and the "simultaneous only" symptom.

**Confidence:** High. The mechanism is directly supported by the code (SQL-in-URL by default) and an explicit maintainer/contributor repro. The fix (POST) is already known to work as a workaround.

### Hypothesis B — Concurrency in the Go backend `QueryData` cancels sibling queries (SECONDARY / contributing)

`pkg/datasource.go:78-131`: `QueryData` runs one goroutine per query via `errgroup.WithContext(ctx)`, all sharing one `*http.Client` (`pkg/client.go:90`). Two facts:

- The `wg.Go` closures **return `nil`** even on query error (errors are stored per-RefId in `response.Responses`, `datasource.go:100-104` / `117-123`), so `errgroup` does **not** normally cancel `wgCtx`. Good — this means one bad panel does not, by itself, cancel siblings **in the current backend code**.
- **However**, the #846 failing path is the **frontend proxy** path (`/api/datasources/proxy/...`), not the Go `QueryData` path. The frontend `executeQueries` uses `Promise.all` (`datasource.ts:455-480`); a single rejection rejects the whole batch for that panel. Across panels, each panel is a separate `query()` call, so this alone is not dashboard-wide — but combined with Hypothesis A (shared HTTP/2 connection collapse), a single oversized query can cause network-level failures that surface as rejections across multiple panels.

**Confidence:** Medium as a **contributing** factor to blast-radius, low as an independent root cause. The backend errgroup is mostly benign due to the return-nil design; the real amplifier is the shared transport/connection, not the goroutine fan-out.

### Hypothesis C — `invalid user agent format` warning indicates a real request malfunction (REJECTED as root cause)

The `plugin.context ... "Could not create user agent" error="invalid user agent format"` lines are Grafana-SDK log noise emitted when the plugin context's user-agent string doesn't match the SDK's expected format. It is **cosmetic** and unrelated to query success; it appears because the SDK cannot construct a `useragent.UserAgent` from the supplied Grafana/plugin version metadata. It does not cause 499s or empty responses. Worth filing/fixing separately for log hygiene, but not the cause of #846.

**Confidence:** High that this is a red herring.

### Hypothesis D — Genuine network/proxy issue (REJECTED)

Slach initially suspected the network (`status=499`, `size=0`). The reporter credibly refuted this (CLI works, no intermediary proxies, any-node reproduction, individual panels fine). frvade's length-dependent, HTTP-version-dependent repro is inconsistent with a plain network fault and consistent with URL-length limits. Rejected as primary.

---

## 3. Implementation plan — Hypothesis A (primary fix: stop putting SQL in the URL)

Two layers of fix; do both. **Layer 1** removes the footgun by default; **Layer 2** makes it robust even if a user has an old datasource with `usePOST` unset/false.

### Layer 1 — Change the default to POST

Rationale: POST is already implemented on both sides and is the correct transport for arbitrary-length SQL. The provisioning examples already use `usePOST: true` (`docker/grafana/provisioning/datasources/*.yaml`), so defaulting to POST aligns code with the shipped examples.

Frontend:
1. `src/datasource/datasource.ts:71` — change `this.usePOST = instanceSettings.jsonData.usePOST || false;` so that an **undefined** `usePOST` is treated as `true` (default POST) while an explicit `false` is still honored. E.g. `this.usePOST = instanceSettings.jsonData.usePOST !== false;` (careful: this makes `undefined`→POST). Confirm desired back-compat semantics with maintainers (see Open Questions).
2. `src/views/ConfigEditor/ConfigEditor.tsx:181` — reflect the new default in the switch: show POST as enabled when `usePOST` is undefined (`value={jsonData.usePOST !== false}`), and/or set the default in the datasource's default `jsonData` on creation so the persisted value is explicit.
3. Update the tooltip (`ConfigEditor.tsx:176`) to explain that POST avoids URL-length limits on large queries and that GET should only be used for read-only enforcement scenarios where POST is undesirable.

Backend:
4. `pkg/datasource_settings.go:20` — the Go struct default is `false` because it's the zero value. To honor a new "default POST" contract you must distinguish "absent" from "explicit false". Options:
   - Parse `usePOST` as `*bool` and treat `nil` as `true`; **or**
   - Rely on the frontend always persisting an explicit `usePOST` value (simpler, but old datasources won't have it). Prefer the `*bool` approach for correctness.
5. `pkg/datasource_settings_test.go:48` — update the expectation (the test currently pins default `false`). New assertion should reflect the chosen contract (e.g. default `true` when key absent).

### Layer 2 — Auto-fallback to POST for long queries (defense in depth)

Even with a new default, users with existing GET datasources, or those who deliberately keep GET, still hit the bug. Add a length-based guard so **oversized queries never go in the URL** regardless of `usePOST`:

Frontend (`src/datasource/request-options.ts`):
6. In `buildRequestOptions`, compute the prospective final URL length (base URL + `query=` + `encodeURIComponent(query)` + other params). If it exceeds a conservative threshold (recommend ~**4000–8000 chars**; many servers/proxies cap the request line/URI around 8 KB, some lower), **force POST** for that request (set `method='POST'`, `data=query`) even if `usePOST` is false. Keep non-`query` params in the URL. This is a per-request, transparent fallback.
7. Add a small exported constant (e.g. `MAX_URL_QUERY_LENGTH`) and a comment referencing #846.

Backend (`pkg/client.go`):
8. Mirror the same guard in `ClickHouseClient.Query`: before building a GET, if `len(query)` (URL-encoded length) would push the URI past the threshold, build a POST instead. This protects the `QueryData` path symmetrically.

### Data-modification caveat (must document)

POST allows write statements; the current tooltip already warns "avoid POST if not connecting as a Read-Only user." Because the plugin already sends `INSERT`/DDL through the same client when users write such queries, defaulting to POST does not add a new capability — but the **read-only enforcement** guidance must remain in the docs. Recommend documenting that read-only users should be enforced at the ClickHouse side (`READONLY` profile / user), which is the correct control regardless of GET/POST. GET is not a real write-protection mechanism (ClickHouse honors `readonly=2` for GET but that's a server setting, not a plugin guarantee).

### Files to touch (Layer 1 + 2)

- `src/datasource/datasource.ts:71`
- `src/datasource/request-options.ts:45-120` (add length guard)
- `src/views/ConfigEditor/ConfigEditor.tsx:173-184` (default + tooltip)
- `pkg/datasource_settings.go:20` (default semantics via `*bool`)
- `pkg/client.go:31-57` (length guard)
- `pkg/datasource_settings_test.go:48` (update default expectation)
- `src/types/types.ts:85` (if `usePOST` typing needs adjusting for the default)
- Docs: README / config docs describing the change and read-only guidance.

---

## 4. Fallback / hardening plan — Hypothesis B (contain blast radius)

If maintainers do **not** want to change the transport default (e.g. to preserve GET read-only semantics), the minimum viable fix is Layer 2 alone (auto-POST for long queries) — this directly neutralizes frvade's repro without changing behavior for normal-length queries.

Additional hardening (independent of transport):
- **Frontend:** In `executeQueries` (`datasource.ts:455-480`), consider `Promise.allSettled` semantics per target so one failing query does not blank the entire panel batch — though note each panel is already a separate `query()` call; the dashboard-wide failure is transport-driven, not `Promise.all`-driven. Lower priority.
- **Backend:** `QueryData` already isolates per-query errors (returns `nil` from `errgroup` closures, stores errors per RefId). This is correct; leave as-is. Do **not** switch to failing the whole `errgroup` on one error — that would re-introduce sibling cancellation.
- **Connection tuning (optional):** If HTTP/2 connection-collapse remains a concern under heavy fan-out even with POST, consider constructing the backend `*http.Client` transport with tuned `MaxConnsPerHost`/`MaxIdleConnsPerHost`, or evaluate disabling forced HTTP/2 (`ForceAttemptHTTP2=false`) for the ClickHouse client. This is a bigger change and should be gated on evidence that POST alone is insufficient (it should be sufficient, since the trigger is URL length, not concurrency per se).

---

## 5. Test plan

### 5.1 Reproduction (manual, matches frvade)

1. `docker compose up --no-deps -d grafana clickhouse`.
2. Provision/edit a datasource with **`usePOST: false`** (GET) over **HTTPS** so HTTP/2 is negotiated.
3. Build a dashboard with several panels; make at least one panel's expanded SQL very long (e.g. a large `IN (...)` list or many columns / a big `$columns`/`$rate` expansion) so the URL exceeds ~8 KB after macro expansion.
4. Open the dashboard so all panels load **simultaneously**. Expected (pre-fix): the long-query panel and its siblings fail with `Query execution failed: Unexpected error`; Grafana logs show `GET /api/datasources/proxy/... status=499 size=0`.
5. Toggle the datasource to **`usePOST: true`**; reload. Expected: all panels load. This confirms the transport is the cause.

### 5.2 Post-fix verification

- With the new default (POST) or the length-guard, repeat 5.1 step 4 **without** manually enabling POST: all panels must load. Inspect Network tab — the long query must be a **POST with SQL in the body**, not a GET with SQL in the URL.
- Confirm normal short queries still work under both GET (if kept) and POST.
- Confirm read-only-related behavior/docs are correct.

### 5.3 Unit tests

Frontend (`src/spec/`, alongside `datasource-get-request-options.spec.ts`):
- `buildRequestOptions` with `usePOST=false` and a **short** query → GET, `query=` in URL (unchanged behavior).
- `buildRequestOptions` with `usePOST=false` and a **query longer than the threshold** → **POST**, `data=query`, no `query=` in URL (new Layer-2 behavior).
- `buildRequestOptions` with `usePOST=true` → POST regardless of length (unchanged).
- Default resolution: `usePOST` undefined → resolves to POST (Layer 1), explicit `false` → GET (short) / auto-POST (long).

Backend (`pkg/`):
- `ClickHouseClient.Query`: with `UsePost=false` and a long query, assert the built request is `POST` with the SQL in the body (add a test hook or inspect via a stub `http.Client`/`httptest.Server`).
- Update `pkg/datasource_settings_test.go:48` to the new default contract; add a case for `usePOST` **absent** in JSON → resolved default; and `usePOST:false` explicit → honored.

### 5.4 E2E (Playwright, optional)

- Add a test under `tests/e2e/features/` that loads a datasource with GET default, runs a deliberately long query, and asserts the request is issued as POST (via network interception) and the panel renders without error.

---

## 6. Risks / edge cases / open questions

**Risks:**
- **Read-only expectation:** Some deployments rely on GET + ClickHouse `readonly` server settings to prevent writes. Defaulting to POST changes the transport; document that write-protection must be enforced server-side (user profile `readonly=1/2`), which is the correct control. The existing tooltip already warns about POST + write. This is the main behavior-change risk of Layer 1.
- **Back-compat of the default:** Flipping `usePOST` default from `false`→`true` must correctly distinguish "absent" (apply new default) from "explicitly false" (honor GET). Getting this wrong could silently override a user's deliberate GET choice. The `*bool` approach on the backend and `!== false` on the frontend handle this, but must be tested.
- **Custom proxies/gateways:** Some setups have gateways that treat POST to ClickHouse differently (e.g. blocking POST for read-only routing). The length-based auto-POST (Layer 2) is safer here because it only switches transport when strictly necessary.
- **`enable_http_compression`, `database`, `add_http_cors_header`, `output_format_json_quote_64bit_integers` params** must remain in the URL query string even when switching to POST (ClickHouse reads settings from URL params while the query is in the body). Verify the fix keeps non-`query` params in the URL for the POST case — the current POST branch already does this on the frontend (`request-options.ts` appends `params` after choosing POST) and backend (`pkg/client.go` adds compression params to `req.URL.Query()` after building the POST). Preserve that.

**Edge cases:**
- Multi-byte UTF-8 in queries inflates URL-encoded length — measure encoded length, not raw string length, for the threshold.
- Very long queries even in POST could hit ClickHouse `max_query_size`; that's a separate server-side limit, unrelated to #846, but worth noting in docs.
- HTTP/1.1 environments will simply see the clean 414 disappear once POST is used; no regression.

**Open questions to confirm with maintainers / reporter:**
1. Preferred fix scope: (a) flip default to POST, (b) length-based auto-POST fallback only, or (c) both (recommended).
2. Back-compat semantics: should an existing datasource with `usePOST` **unset** be migrated to POST automatically? (Recommended yes, via `undefined → POST`.)
3. Confirm with `Anbu42` that enabling `usePOST=true` resolves #846 in their environment (Slach's last two comments are unanswered) — this closes the loop on Hypothesis A.
4. Should the `invalid user agent format` SDK warning be addressed separately (log hygiene)? Recommend a separate issue.

**Info to request from reporter if the POST workaround does *not* fully resolve it:**
- Approximate length of the failing queries (post-macro-expansion).
- Whether Grafana↔ClickHouse is HTTP/1.1 or HTTP/2 (TLS?).
- Any front proxy/ingress (nginx `large_client_header_buffers`, envoy `max_request_headers_kb`) between Grafana and ClickHouse and its URI/header limits.
- Full Network-tab response headers for one failing request (Slach asked for these; still outstanding).

---

## 7. Effort breakdown

| Sub-task | Estimate |
|---|---|
| Frontend default `usePOST` (`datasource.ts:71`, `ConfigEditor.tsx`) | 0.5 h |
| Frontend length-guard in `buildRequestOptions` + constant + comment | 1–1.5 h |
| Backend default semantics (`*bool` in `datasource_settings.go`) + length-guard in `client.go` | 1.5–2 h |
| Update `datasource_settings_test.go` + new unit tests (FE + BE) | 2–3 h |
| Docs (README/config, read-only guidance, tooltip) | 1 h |
| Manual repro + verify (docker, long-query dashboard, HTTP/2) | 1–1.5 h |
| (Optional) Playwright E2E | 1 h |
| **Total** | **~1–1.5 days** |

**Final sizing: SMALL–MEDIUM.** The transport (POST) is already fully implemented on both sides; the work is choosing/setting defaults safely, adding a length-based fallback, and back-compat + tests.

---

### Key file:line references
- `src/datasource/request-options.ts:57-63` — GET-with-`query`-in-URL vs POST (the defect + fix site, frontend)
- `src/datasource/request-options.ts:115-117` — URL assembly
- `src/datasource/datasource.ts:71` — frontend `usePOST` default (`|| false`)
- `src/datasource/datasource.ts:151-185` — `_getRequestOptions` / `_request` (proxy fetch path)
- `src/datasource/datasource.ts:446-483` — `executeQueries` fan-out (`Promise.all`)
- `src/views/ConfigEditor/ConfigEditor.tsx:173-184` — "Use POST" switch + tooltip (default off)
- `pkg/client.go:44-57` — backend GET/POST branch (`params.Add("query", query)`)
- `pkg/client.go:87-98` — shared `*http.Client.Do`
- `pkg/datasource_settings.go:20`, `:63-70` — `UsePost` default (zero value false) + HTTP client construction
- `pkg/datasource_settings_test.go:48` — test pinning default `false` (update on fix)
- `pkg/datasource.go:78-131` — `QueryData` concurrent fan-out (errgroup, shared client; returns nil per closure)
- `src/plugin.json:55-84` — datasource proxy routes
- `docker/grafana/provisioning/datasources/clickhouse.yaml:15` — provisioning already uses `usePOST: true`
