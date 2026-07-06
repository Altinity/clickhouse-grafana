# Issue #622 — "support JWT / OAuth authorization headers pass to backend"

Deep-dive analysis against branch `datalinks-fixed`, SDK `grafana-plugin-sdk-go v0.292.1`.
Status: **NOT actually supported end-to-end today** — there is a concrete, small backend gap, contrary to the maintainer's "already supported" comment.

---

## 1. The issue and the existing comments

`gh issue view 622 --repo Altinity/clickhouse-grafana --comments`:

- **Title:** support JWT / OAuth authorization headers pass to backend (links Grafana SSO / "Forward OAuth Identity" docs).
- **zvonand (member):** *"It is already supported -- Access token is passed in `Authorization`, id token is passed in `X-Id-Token` header"*.
- **Slach (collaborator):** *"We wait when `clickhouse-server` will implement full OAuth without explicit user definition"*.

zvonand is referring to the fact that the **frontend ConfigEditor exposes Grafana's "Forward OAuth Identity" toggle** (`showForwardOAuthIdentityOption={true}`). Grafana, when that toggle is on, attaches `Authorization: Bearer <access_token>` and `X-Id-Token: <id_token>` to outgoing datasource requests. The standard header names are exactly the ones zvonand quotes — they are SDK constants (`OAuthIdentityTokenHeaderName = "Authorization"`, `OAuthIdentityIDTokenHeaderName = "X-Id-Token"`).

**However**, careful tracing of this plugin's Go backend shows those headers are delivered *to the plugin process* but are **never forwarded onward to clickhouse-server**, because the plugin never opts into header forwarding (`httpclient.Options.ForwardHTTPHeaders` is left `false`). This is the load-bearing finding.

---

## 2. End-to-end auth header flow (traced, with file:line)

### 2.1 Frontend dispatch path — confirmed backend (gRPC), not browser HTTP

- `src/datasource/datasource.ts:30-31` — `export class CHDataSource extends DataSourceWithBackend<CHQuery, CHDataSourceOptions>`.
- `src/datasource/datasource.ts:60` — `super(instanceSettings)`.

Because the datasource extends `DataSourceWithBackend`, **all queries (`QueryData`) and resource calls (`CallResource`) are routed through the Go backend** over gRPC. There is no browser-side HTTP path to ClickHouse for normal queries. Therefore the only thing that matters for #622 is what the **Go backend** does with the forwarded headers.

### 2.2 Config UI enables Grafana's forward-OAuth toggle

- `src/views/ConfigEditor/ConfigEditor.tsx:105-112` renders Grafana's `<DataSourceHttpSettings ... showForwardOAuthIdentityOption={true} />`.
- Added by Eugene Klimov (zvonand) in commit `66a48b28` (2024-01-10) — same author as the issue comment.

When the operator turns this on, Grafana stores `jsonData.oauthPassThru = true` and, at query time, attaches the signed-in user's `Authorization` and `X-Id-Token` headers to the gRPC `QueryDataRequest.Headers` map sent to the plugin.

### 2.3 Backend: headers arrive but are not propagated

In the SDK, the headers land in `QueryDataRequest.Headers` and are exposed through:
- `backend/data.go:48-50` — `Headers map[string]string` (`To access forwarded HTTP headers please use GetHTTPHeaders`).
- `backend/data.go:87-90` — `(*QueryDataRequest).GetHTTPHeaders()` → `getHTTPHeadersFromStringMap(req.Headers)`.
- `backend/http_headers.go:64-86` — `getHTTPHeadersFromStringMap` explicitly surfaces `Authorization`, `X-Id-Token`, `Cookie`, and `http_`-prefixed headers.

The SDK auto-installs a handler middleware that *tries* to forward these to outgoing HTTP:
- `backend/serve.go:430-438` — `defaultHandlerMiddlewares()` includes `newHeaderMiddleware()` (auto-wired via `backend.Manage`, which the plugin uses at `pkg/main.go:26`).
- `backend/http_headers.go:101-167` — `headerMiddleware.applyHeaders(ctx, headers)` injects an httpclient **contextual middleware** into the request `ctx` (it runs for `QueryData`, `CallResource`, `CheckHealth`).
- **Critical gate** — `backend/http_headers.go:119-122`:
  ```go
  httpclient.MiddlewareFunc(func(opts httpclient.Options, next http.RoundTripper) http.RoundTripper {
      if !opts.ForwardHTTPHeaders {
          return next   // <-- no-op: headers are NOT copied onto the outgoing request
      }
      ...
  ```
- The httpclient applies contextual middlewares only via `ContextualMiddleware()` (`backend/httpclient/http_client.go:236`), so this gate is the single decision point.

So forwarding happens **iff** the plugin builds its `*http.Client` with `httpclient.Options.ForwardHTTPHeaders = true`.

### 2.4 The plugin never sets `ForwardHTTPHeaders`

- `pkg/datasource_settings.go:63-67` — builds the client:
  ```go
  httpClientOptions, err := settings.HTTPClientOptions(ctx)
  ...
  dsSettings.HTTPClient, err = httpclient.New(httpClientOptions)
  ```
- `DataSourceInstanceSettings.HTTPClientOptions(ctx)` (`backend/common.go:121-154`) calls `httpSettings.HTTPClientOptions()` (`backend/http_settings.go:54-104`) and `setCustomOptionsFromHTTPSettings` (`backend/common.go:216-226`). **Neither ever sets `ForwardHTTPHeaders`.** A full-SDK grep confirms the SDK *never* auto-assigns `opts.ForwardHTTPHeaders = true` anywhere; it is purely the plugin's responsibility (`grep -rni 'ForwardHTTPHeaders =' <sdk>` → no production assignment).
- A grep of `pkg/` confirms the plugin reads none of `oauthPassThru`, `ForwardHTTPHeaders`, `ForwardedOAuthIdentity`, `Authorization`, or `X-Id-Token`. Auth handling in `pkg/client.go` is limited to:
  - BasicAuth (`pkg/client.go:64-66`),
  - Yandex.Cloud `X-ClickHouse-User`/`X-ClickHouse-Key`/`X-ClickHouse-SSL-Certificate-Auth` (`pkg/client.go:67-79`, `UseYandexCloudAuthorization` at `pkg/datasource_settings.go:21`),
  - static custom headers `httpHeaderNameN`/`httpHeaderValueN` (`pkg/client.go:80-84`, parsed at `pkg/datasource_settings.go:50-60`).

### 2.5 The actual ClickHouse request build

- `pkg/client.go:31-90` — `ClickHouseClient.Query` constructs the `*http.Request`, sets only BasicAuth / Yandex / static custom headers, then does `req = req.WithContext(ctx)` (`pkg/client.go:86`) and `client.settings.HTTPClient.Do(req)` (`pkg/client.go:90`).
- The `ctx` passed in is the per-query context from `QueryData` → `executeQuery(... ctx ...)` (`pkg/datasource.go:43`, `pkg/datasource.go:78-131`). That ctx **does** carry the contextual middleware injected by `headerMiddleware`. So the plumbing reaches the right place — but the contextual middleware no-ops at `http_headers.go:121` because `ForwardHTTPHeaders` is false.

**Net result:** with "Forward OAuth Identity" enabled, the user's `Authorization`/`X-Id-Token` reach the *plugin* but are **silently dropped** before the ClickHouse HTTP call. clickhouse-server receives no token.

> Note on the only path to CH: `pkg/resource_handlers.go` handlers (createQuery, applyAdhocFilters, getAstProperty, replaceTimeFilters, processQueryBatch, etc.) are **pure SQL/AST utilities** — they do not issue HTTP to ClickHouse (no `client.Query` / `http.NewRequest`). The single HTTP egress is `pkg/client.go:Query`, used by `QueryData` and `CheckHealth`. So the fix only needs to touch the httpclient build.

---

## 3. What "Forward OAuth Identity" actually does in Grafana

- Enabling the toggle sets `jsonData.oauthPassThru = true`.
- For **proxy/backend datasources**, Grafana attaches the current user's OAuth **access token** as `Authorization: Bearer …` and the **id token** as `X-Id-Token` to the request envelope sent to the plugin. The SDK exposes them via `GetHTTPHeaders()` (`backend/http_headers.go:64-86`).
- **It is NOT automatic** for a plugin that builds its own `*http.Client`. The plugin must opt in by setting `httpclient.Options.ForwardHTTPHeaders = true` (doc comment at `backend/httpclient/options.go:68-73`: *"enable forwarding of all HTTP headers included in QueryDataRequest/CallResourceRequest/CheckHealthRequest, e.g. based on if Allowed cookies or Forward OAuth Identity is configured"*).
- Idiomatic implementation in other datasources: read `oauthPassThru` (and/or `httpHeaderName*`, `keepCookies`) from jsonData and set `opts.ForwardHTTPHeaders = true` before `httpclient.New`. This plugin omits that step.

---

## 4. JWT specifically

- The issue's "JWT" is the OAuth **id token** (a JWT) and/or the **access token** (often a JWT). There is nothing JWT-specific needed beyond *forwarding the header* — the plugin does not parse, mint, or validate the token; it only needs to relay `Authorization`/`X-Id-Token` to clickhouse-server, which then validates the JWT.
- clickhouse-server auth modes relevant here: HTTP Basic, `X-ClickHouse-User`/`X-ClickHouse-Key`, and (newer) **Access Token / JWT authentication** (`Authorization: Bearer <jwt>`), incl. external/IdP token validation. Slach's comment ("wait until clickhouse-server implements full OAuth without explicit user definition") refers to CH being able to derive the user identity purely from the token without a pre-provisioned user mapping.
- **Two distinct halves:**
  1. **Plugin side (in scope, fixable now):** forward `Authorization`/`X-Id-Token` to CH. This is a real, present gap (§2.4).
  2. **Server side (partially upstream):** clickhouse-server's ability to *consume* a forwarded JWT. Modern CH versions can validate JWT/access tokens; "full OAuth with no explicit user definition" is the part Slach flags as pending. But even for the CH versions that *do* accept JWTs today, **this plugin still cannot deliver the token**, so the plugin-side fix is independently valuable.

---

## 5. Verification — is the request fully implemented?

| Layer | Present? | Evidence |
|---|---|---|
| Config UI to enable forwarding | **Yes** | `ConfigEditor.tsx:110` `showForwardOAuthIdentityOption={true}` → `jsonData.oauthPassThru` |
| Grafana attaches `Authorization`/`X-Id-Token` to backend req | **Yes** (SDK/Grafana) | `data.go:48-50`, `http_headers.go:64-86` |
| Plugin receives headers | **Yes** | `req.GetHTTPHeaders()` available; ctx carries contextual middleware |
| Plugin **forwards** headers to ClickHouse | **NO** | `ForwardHTTPHeaders` never set (`datasource_settings.go:63-67`); gate no-ops at `http_headers.go:121` |
| ClickHouse accepts JWT/access token | Version-dependent; "full OAuth" pending | Slach's comment |

**Conclusion:** the feature is **half-wired**. The UI toggle exists and gives users the (false) impression it works, but the backend drops the headers. The missing piece is a one-line-class change in the backend httpclient construction.

---

## 6. Decision & recommendation

**Do NOT close #622 as "already supported."** Recommendation: **keep open and implement the small backend fix**, then optionally track the "full OAuth, no explicit user" part as upstream-blocked.

Rationale: the maintainer's "already supported" is accurate only at the *UI* layer; the backend forwarding is absent. Closing now would leave a toggle that silently does nothing.

### Proposed fix (small, low-risk)

Set `ForwardHTTPHeaders` on the httpclient options, ideally gated on `oauthPassThru`/cookie settings so behavior is opt-in and matches the UI toggle.

In `pkg/datasource_settings.go`, after building options (around lines 63-67):

```go
httpClientOptions, err := settings.HTTPClientOptions(ctx)
if err != nil {
    return nil, fmt.Errorf("unable to build http client options: %w", err)
}

// Forward Grafana-attached headers (Authorization / X-Id-Token / cookies)
// to clickhouse-server when "Forward OAuth Identity" or cookie forwarding is enabled.
if oauthPassThru, _ := tmpMap["oauthPassThru"].(bool); oauthPassThru {
    httpClientOptions.ForwardHTTPHeaders = true
}

dsSettings.HTTPClient, err = httpclient.New(httpClientOptions)
```

Notes:
- `tmpMap` already exists in that function (`datasource_settings.go:44-48`) and contains the parsed jsonData, so reading `oauthPassThru` is free.
- The SDK's `headerMiddleware` then copies `Authorization`/`X-Id-Token` onto the outbound CH request — but only if the request didn't already set them. Order matters: when `UseYandexCloudAuthorization`/BasicAuth is on, `pkg/client.go` already sets auth, and the SDK only adds a header "if it is not already set" (`http_headers.go:124`). So forwarded OAuth will not clobber explicit Yandex/Basic auth — good, but document the precedence.
- Optionally also honor `keepCookies` for the `Cookie` header, but that's beyond #622's ask.

### Effort
- **Code:** ~5-8 lines in `pkg/datasource_settings.go`. ~30 min.
- **Tests:** extend `pkg/datasource_settings_test.go` to assert `dsSettings.HTTPClient` is built with `ForwardHTTPHeaders` when `oauthPassThru: true`. Because `httpclient.New` hides options, the cleanest test is to verify the parsed flag path, or add a thin wrapper to capture options. ~1-2 h incl. an integration check that a forwarded `Authorization` header reaches a stub CH server.
- **Docs:** README snippet (see §7-equivalent below). ~20 min.
- **Total:** roughly half a day.

### Caveat to verify before shipping
The SDK forwards **all** headers present in `req.Headers` whitelisted by `getHTTPHeadersFromStringMap` (Authorization, X-Id-Token, Cookie, `http_*`). Confirm this does not conflict with `UseYandexCloudAuthorization` deployments (it shouldn't, due to the "only if not already set" rule), and that enabling it doesn't leak the Grafana service-account token in alerting contexts where `PluginContext.User` is nil (in that path Grafana typically does not attach a user OAuth token, so this is low risk, but worth a manual check).

---

## 7. Documentation status & recommended snippet

- **Not documented.** README only documents `useYandexCloudAuthorization` / `xHeaderKey` / `xHeaderUser` (README ~lines 1323-1335) and TLS auth. No mention of "Forward OAuth Identity", JWT, or `Authorization`/`X-Id-Token` forwarding.
- Even after the code fix, a doc snippet is required so operators know the toggle exists and what CH-side configuration is needed.

Recommended README addition (under datasource configuration / authorization):

> ### Forward OAuth Identity (JWT / access-token pass-through)
> Enable **"Forward OAuth Identity"** in the datasource HTTP settings to forward the
> signed-in Grafana user's OAuth **access token** (`Authorization: Bearer …`) and
> **id token** (`X-Id-Token`) to clickhouse-server. The plugin relays these headers
> unchanged; clickhouse-server must be configured to accept JWT / access-token
> authentication for the matching identity provider.
> Notes:
> - Requires a clickhouse-server version that supports JWT / access-token auth.
> - When BasicAuth or "Use Yandex.Cloud authorization headers" is also configured,
>   those explicit credentials take precedence and the forwarded OAuth header is not applied.

---

## 8. What to confirm with maintainers (zvonand / Slach) before closing

1. **zvonand:** Did you verify the *backend* actually forwards `Authorization`/`X-Id-Token` to clickhouse-server, or only that the UI toggle is present? Our trace shows `ForwardHTTPHeaders` is never set, so the headers are dropped at `http_headers.go:121`. Can you reproduce with Query Inspector / a CH access log?
2. **Scope:** Is the intended design to forward on `oauthPassThru` only, or always when the headers are present? (Recommend gating on `oauthPassThru` to match the UI.)
3. **Slach:** Which clickhouse-server versions are targeted for JWT acceptance, and what is the minimal `users.xml`/access-control config the docs should reference? This determines whether we ship the plugin fix now and label the "no explicit user" part as upstream-pending.
4. **Interaction with Yandex.Cloud / BasicAuth precedence:** confirm desired precedence (current SDK behavior: explicit headers win because forwarding only fills unset headers).
5. **Alerting / service-account contexts:** confirm forwarding behavior is acceptable when there is no interactive user token.

---

## Appendix — key file:line references

Plugin:
- `pkg/main.go:26` — `backend.Manage(...)` (auto-installs `headerMiddleware`).
- `pkg/datasource_settings.go:63-67` — httpclient built; **`ForwardHTTPHeaders` not set** (the gap).
- `pkg/datasource_settings.go:44-60` — `tmpMap` parse + static custom-header handling.
- `pkg/client.go:31-90` — CH request build; auth headers; `req.WithContext(ctx)`; `HTTPClient.Do`.
- `pkg/client.go:64-79` — BasicAuth + Yandex.Cloud auth only.
- `pkg/datasource.go:78-131` — `QueryData`; per-query ctx flows to `executeQuery`/`client.Query`.
- `pkg/resource_handlers.go` — pure SQL/AST utilities; no HTTP to CH.
- `src/datasource/datasource.ts:30-31,60` — `DataSourceWithBackend`.
- `src/views/ConfigEditor/ConfigEditor.tsx:110` — `showForwardOAuthIdentityOption={true}`.

SDK `grafana-plugin-sdk-go@v0.292.1`:
- `backend/http_headers.go:13-30` — header-name constants (`Authorization`, `X-Id-Token`, `X-Grafana-Id`, `Cookie`).
- `backend/http_headers.go:64-86` — `getHTTPHeadersFromStringMap` (whitelist).
- `backend/http_headers.go:101-167` — `headerMiddleware`; gate at `:119-122`.
- `backend/httpclient/options.go:68-73` — `ForwardHTTPHeaders` doc.
- `backend/httpclient/http_client.go:236` — `ContextualMiddleware()` wiring.
- `backend/serve.go:430-438` — `defaultHandlerMiddlewares()` incl. `newHeaderMiddleware()`.
- `backend/common.go:121-154` + `backend/http_settings.go:54-104` + `backend/common.go:216-226` — option building; never sets `ForwardHTTPHeaders`.
- `backend/data.go:48-50,87-90` — `QueryDataRequest.Headers` / `GetHTTPHeaders`.
