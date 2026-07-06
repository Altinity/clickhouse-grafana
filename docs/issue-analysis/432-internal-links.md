# Issue #432 — "[Feature] Add support for internal link" — Deep-Dive Analysis

**Repo:** Altinity/clickhouse-grafana (Grafana datasource plugin for ClickHouse)
**Issue:** <https://github.com/Altinity/clickhouse-grafana/issues/432>
**State:** OPEN · label `p3` · milestone `3.5.0` · author `caibirdme` · opened 2022-06-30 · **0 comments**
**Analysis date:** 2026-07-04
**Analysis branch:** `feature/advanced-logs-field-settings` (data-links code is NOT present here)
**Implementation lives on:** `datalinks-fixed-2` → **open PR [#904](https://github.com/Altinity/clickhouse-grafana/pull/904)** "Datalinks fixed" (base `master`, +3349/-44, 26 files, MERGEABLE, not merged)
**Superseded PR:** [#899](https://github.com/Altinity/clickhouse-grafana/pull/899) "Datasource-level data link configuration" (`datalinks-fixed` → `master`) — **CLOSED, not merged.** #904 is the live continuation.

---

## 0. TL;DR

**What's requested.** Grafana **internal links** so a user can jump from query results directly into another datasource. The verbatim example: logs are stored in ClickHouse; when searching logs the user wants to click the `trace_id` column and have a trace panel open showing that trace. The author explicitly notes "Now ElasticSearch and Loki support internal link, I hope clickhouse could support this as well." This is exactly Grafana's `DataLink.internal` mechanism (Loki derived fields / Elasticsearch data links / Tempo trace-to-logs), where a result field carries a clickable link that opens a *query* against a chosen datasource in Explore.

**What already exists.** A complete implementation already exists — but **only on the unmerged `datalinks-fixed-2` branch (open PR #904)**, not on `master` and not on the current working branch. It adds a `src/datasource/datalinks/` module (`buildDataLink`, `applyDataLinks`, types), a `ConfigEditor` "Data Links" section, wiring through `SqlSeries` into the `logs`/`traces`/`time_series`/`flamegraph` converters, unit + component tests, a demo dashboard, a provisioning example, and README/CHANGELOG entries. The design is documented in `docs/superpowers/specs/2026-05-17-data-links-design.md` (present on the PR branch). Critically for #432, the **logs converter auto-promotes any column referenced by a data-link config to a top-level field**, so the canonical `trace_id`-in-logs example works *without* aliasing the column as `content`/`body`. The plugin's own CHANGELOG says this "closes #432, partially addresses #645."

**Gap.** The feature is functionally done for #432 but **not merged**. The only real work remaining for #432 specifically is: (1) get PR #904 merged (or re-land the module onto `master` / the current branch), (2) add an E2E test (none exists — the whole data-links feature has zero Playwright coverage), and (3) minor polish (log-context code path drops `dataLinks`; `table` format is a documented non-goal). There is **no algorithmic gap** — #432 does not need the span-tag-mapping / time-shift machinery that #645 wants; the generic per-field internal link already satisfies it.

**Recommendation.** Treat #432 as **implementation-complete pending merge of PR #904.** Do NOT re-implement the module — reference and land the existing code. Fix the PR/commit metadata to `closes #432` (it currently is honest in the CHANGELOG). The junior-agent work is: land the branch, add the missing E2E spec, and optionally close the log-context gap.

**Effort.** **S (≈1–2 days)** if the task is "land PR #904 + add E2E + close small gaps." **M (≈3–5 days)** only if the module must be re-created from scratch on a fresh branch (e.g. PR #904 is abandoned) — the design spec and this document make that a mechanical port.

**Relation to other issues / docs.**
- **#645 (trace-to-metrics)** — analysed in `docs/issue-analysis/645-trace-to-metrics.md`. Same feature, same PR. That doc concludes #432 is *fully* satisfied by this feature while #645 is only *partially* satisfied (native trace-to-metrics needs per-span `$__tags` mapping + span-window time-shift + a span-detail dropdown, none of which the generic mechanism provides — and the span-detail dropdown is SDK-blocked for third-party plugins). **This document does not duplicate that analysis; for the trace-to-metrics gap read the #645 doc.**
- **`docs/superpowers/specs/2026-05-17-data-links-design.md`** (on PR branch) — the canonical design. This document references it rather than restating every line.
- **`docs/superpowers/plans/2026-05-17-data-links.md`** (on PR branch) — the canonical, task-by-task implementation plan that produced PR #904.
- **`docs/superpowers/plans/2026-04-13-data-links.md`** (present on the current branch) — an **OLDER, SUPERSEDED prototype plan.** It stores links **per-query** on `CHQuery.dataLinks`, edits them in the **QueryEditor**, and attaches links to **every field**. The final design (spec `2026-05-17`) explicitly discards this: "It stored data link configs per-query … and attached links to every field … Neither matches Grafana convention. This design discards the prototype's structure and re-implements from scratch." **Do NOT follow `2026-04-13-data-links.md` — it is retained only as history.**

---

## 1. What the issue is actually asking for

Verbatim body:

> Could this plugin support grafana internal link, so that people can jump from the research results directly into other datasource. For example, If I use clickhouse to store logs, and when I search the logs, I can click the trace_id column, then a trace panel opened and show that trace info. Now ElasticSearch and Loki support internal link, I hope clickhouse could support this as well.

Decoded:

1. **"grafana internal link"** = Grafana's `DataLink` with an `internal` block (`InternalDataLink`), which opens a query against another datasource in Explore/split-pane — as opposed to `DataLink.url`, which opens an external web URL.
2. **The driving scenario** is logs→traces correlation: click `trace_id` on a log line → open a trace query in the tracing datasource. This is the single most common internal-link use case in observability.
3. **The named precedents** — Elasticsearch "data links" (config UI storing `{field, url, datasourceUid?}` and `enhanceDataFrameWithDataLinks`) and Loki "derived fields" (regex-extracted fields with `{name, matcherRegex, url, datasourceUid?}`) — both attach links to *named fields* at the *datasource* configuration level. This tells us the expected shape: **datasource-level config, per-field attachment.**

The screenshot in the issue (Grafana derived-fields/data-links config panel) confirms this is the datasource-config-level derived-fields UI.

### 1.1 Grafana's `DataLink.internal` model (the target API)

From the Grafana SDK types (`@grafana/data` `types/dataLink.d.ts`, as verified in the #645 analysis):

```ts
interface DataLink {
  title: string;
  url: string;                     // '' when internal
  targetBlank?: boolean;
  internal?: InternalDataLink;
  // ...
}
interface InternalDataLink {
  query: any;                      // the target datasource's query object
  datasourceUid: string;
  datasourceName: string;
  panelsState?: ExplorePanelsState;   // e.g. { trace: { spanId } }
  range?: TimeRange;
}
```

At click time Grafana interpolates variables inside the link (both the `url` and the `internal.query`): `${__value.raw}` (the clicked cell), `${__data.fields.<name>}` (any other field in the same row), `$__from` / `$__to` (dashboard time range), `${__field.name}`, and dashboard template variables. **All interpolation is done by Grafana, not the plugin** — the plugin only has to emit the link with the template strings in place.

---

## 2. Map of all relevant code

All paths below are as they exist on `datalinks-fixed-2` (PR #904) unless noted. On the current analysis branch (`feature/advanced-logs-field-settings`) and on `master`, the `datalinks/` module and `ConfigEditor/components/DataLinks/` do **not** exist yet.

| File | Line(s) | Role |
|---|---|---|
| `src/datasource/datalinks/types.ts` | 1–16 | `CHFormat` union + `DataLinkConfig` (`{fieldName, title, url?, targetDatasourceUid, query, format?}`) |
| `src/datasource/datalinks/buildDataLink.ts` | 1–90 | config → Grafana `DataLink`; three branches (external URL / CH target / non-CH target); `isClickHouseTarget`; `targetBlank` heuristic; trace `panelsState.trace.spanId` |
| `src/datasource/datalinks/applyDataLinks.ts` | 1–37 | attach built links to fields by **exact case-sensitive name**; honors optional `allowedFieldNames`; pure mutation, no-op when configs empty |
| `src/datasource/datalinks/index.ts` | 1–3 | barrel exports |
| `src/types/types.ts` | 3, 99 | `import { DataLinkConfig }`; `CHDataSourceOptions.dataLinks?: DataLinkConfig[]` |
| `src/datasource/datasource.ts` | 59, 81 | `dataLinks` field on datasource class; `this.dataLinks = instanceSettings.jsonData.dataLinks` |
| `src/datasource/datasource.ts` | 399, 407–408 | `processQueryResponse` builds `SqlSeries` with `dataLinks: this.dataLinks, app: options.app` |
| `src/datasource/datasource.ts` | 285–287, 333–335 | **log-context path builds `SqlSeries` WITHOUT `dataLinks`/`app`** (minor gap — log-context rows carry no links) |
| `src/datasource/sql-series/sql_series.ts` | — | `SqlSeries` carries `dataLinks` / `app`, forwards to converters |
| `src/datasource/sql-series/toLogs.ts` | 4 | `import { applyDataLinks }` |
| `src/datasource/sql-series/toLogs.ts` | 94–111 | build `promotedColumns` set from `dataLinks[].fieldName`; exclude them from `labelFields` (so they aren't folded into `labels`) |
| `src/datasource/sql-series/toLogs.ts` | 203–219 | **promote data-link source columns to top-level fields** when not already a standard field — this is what makes `fieldName: trace_id` work without aliasing |
| `src/datasource/sql-series/toLogs.ts` | 228 | `applyDataLinks(result.fields, self.dataLinks, { app: self.app })` |
| `src/datasource/sql-series/toTraces.ts` | 3–4, 37, 87 | signature `toTraces(series, meta, dataLinks?, app?)`; `applyDataLinks(fieldArray, dataLinks, { app })` |
| `src/datasource/sql-series/toTimeSeries.ts` | 5, 212 | `applyDataLinks(fields, self.dataLinks, { app: self.app })` |
| `src/datasource/sql-series/toFlamegraph.ts` | 2–3, 12, 65 | signature `toFlamegraph(inputSeries, dataLinks?, app?)`; `applyDataLinks(fieldArray, dataLinks, { app })` |
| `src/datasource/sql-series/toTable.ts` | — | **NOT wired** — legacy `{columns, rows}` shape, documented non-goal |
| `src/views/ConfigEditor/components/DataLinks/DataLinkEditor.tsx` | 1–end | single-link editor: `fieldName`, `title`, `External URL`, `Target` (`DataSourcePicker`), `Format` (only when target is CH), `Query` (`CodeEditor`); invalid-target detection; hides internal fields when `url` set |
| `src/views/ConfigEditor/components/DataLinks/DataLinksSection.tsx` | 1–end | list + add/remove; `EMPTY_LINK` template; renders under a "Data Links" heading |
| `src/views/ConfigEditor/ConfigEditor.tsx` | 11, 96–99, 253–255 | imports section; `onDataLinksChange` persists to `jsonData.dataLinks`; renders `<DataLinksSection>` |
| `docker/grafana/provisioning/datasources/clickhouse.yaml` | ~18–33 | provisioning example: a logs internal link on `query_id` + an external-URL link |
| `docker/grafana/dashboards/data_links_demo.json` | — | demo dashboard |
| `src/spec/datalinks.test.ts` | — | unit tests for `buildDataLink` / `applyDataLinks` |
| `src/spec/DataLinkEditor.test.tsx`, `src/spec/DataLinksSection.test.tsx` | — | React component tests |
| `src/spec/sql_series_specs.jest.ts` | 792+ | converter-level wiring tests (`toTraces` `:792`, `toLogs` `:841` incl. promotion, `toFlamegraph` `:891`, `toTimeSeries` `:909`) |
| `docs/superpowers/specs/2026-05-17-data-links-design.md` | — | **canonical design spec** |
| `docs/superpowers/plans/2026-05-17-data-links.md` | — | **canonical implementation plan** (produced PR #904) |
| `docs/superpowers/plans/2026-04-13-data-links.md` | — | **superseded prototype plan** (per-query, QueryEditor, all-fields) — DO NOT follow |

---

## 3. Current data-links capability (on the PR branch)

The implementation on `datalinks-fixed-2` already delivers everything #432 needs. Summary of behaviour (details verified against the source):

### 3.1 Config model & storage
`DataLinkConfig = { fieldName, title, url?, targetDatasourceUid, query, format? }`, stored as an array at **datasource level** in `jsonData.dataLinks` (read at `datasource.ts:81`). No `id` field — React keys by array index. This matches the Elasticsearch/Loki datasource-config convention the issue references.

### 3.2 `buildDataLink` — three branches
1. **External URL** (`config.url` set): returns `{ title, url, targetBlank }`. Internal fields ignored. Grafana interpolates `${__value.raw}` etc. This is the ES `DataLinkConfig.url` analog.
2. **ClickHouse target** (`isClickHouseTarget(uid)` true): `internal.query` is a full `CHQuery` (`refId:'datalink'`, `query`, `rawQuery`, `format`, `datasourceMode: Datasource`, `extrapolate:false`, `adHocFilters:[]`, `showHelp:false`, `showFormattedSQL:false`). For `format === 'traces'` it adds `internal.panelsState = { trace: { spanId: '${__value.raw}' } }` so the target TraceView scrolls to / highlights the clicked span.
3. **Non-CH target**: generic `internal.query = { refId:'datalink', query }` — used to link to Tempo/Jaeger/Prometheus/Loki/etc.

`targetBlank` heuristic: `false` in Explore (link opens in split pane), `true` everywhere else (new tab). `isClickHouseTarget` resolves the target type via `getDataSourceSrv().getInstanceSettings(uid)?.type === 'vertamedia-clickhouse-datasource'`.

### 3.3 `applyDataLinks` — per-field attachment
Iterates fields; for each field whose `name === config.fieldName` (exact, case-sensitive; optionally gated by `allowedFieldNames`), builds links and **appends** to `field.config.links`. No-op if configs empty.

### 3.4 The logs→traces use case (the exact #432 example) works end to end
- User configures a data link with `fieldName: trace_id`, target = tracing datasource (CH traces format or Tempo/Jaeger), `query` referencing `${__value.raw}`.
- The logs converter (`toLogs.ts:94–111, 203–219`) sees `trace_id` in the `dataLinks` config, **excludes it from the `labels` bucket**, and **promotes it to a top-level DataFrame field**. So the field exists to attach the link to — the user does **not** have to `SELECT trace_id AS content` or otherwise alias it. This is the single most important detail that makes the issue's verbatim scenario work out of the box.
- `applyDataLinks` (`toLogs.ts:228`) then attaches the link to the promoted `trace_id` field. Clicking `trace_id` in the logs panel/Explore opens the trace query in the target datasource.

### 3.5 What's wired vs. not
- **Wired:** `logs`, `traces`, `time_series`, `flamegraph`.
- **Not wired:** `table` (`toTable.ts` returns legacy `{columns, rows}`, not DataFrames — documented non-goal; would need a `toTable`→DataFrame refactor).
- **Gap:** the **log-context** code path (`datasource.ts:285, 333`) constructs `SqlSeries` without `dataLinks`/`app`, so log-context rows won't carry links. Low priority for #432 (the main logs panel does carry them) but a real inconsistency.

---

## 4. Comparison with Loki / Elasticsearch (design reference)

The design spec confirms patterns against real Grafana code. Summary of how this plugin's model maps onto the precedents named in the issue:

| Concern | Loki derived fields | Elasticsearch data links | This plugin (`DataLinkConfig`) |
|---|---|---|---|
| Config location | Datasource config | Datasource config | Datasource config (`jsonData.dataLinks`) — same |
| Field targeting | `matcherRegex` extracts a field from log line, then names it | `field` = exact field name | `fieldName` = exact field name (regex/extraction deferred) |
| Internal link | `datasourceUid` + `url`(query template) | `datasourceUid` (optional) + `url` | `targetDatasourceUid` + `query` (+ `format` for CH targets) |
| External link | `url` (no `datasourceUid`) | `url` (no `datasourceUid`) | `url` (takes precedence, internal fields ignored) |
| Variable in link | `${__value.raw}` | `${__value.raw}` | `${__value.raw}`, `${__data.fields.X}`, `$__from/$__to`, template vars |
| Regex capture / derived field creation | **Yes** (`matcherRegex`) | No | **No** (deferred non-goal) — links attach to existing/aliased columns; logs format auto-promotes referenced columns instead |

The one Loki capability intentionally **not** replicated is **regex-based derived-field extraction** (pulling `trace_id` out of an unstructured log line via a pattern). This plugin instead relies on ClickHouse returning `trace_id` as a real column (which it will, given structured log tables) and auto-promoting it. For the issue's scenario (a `trace_id` column exists in the logs table) this is sufficient. If a user's `trace_id` is embedded inside a free-text message, they'd need to extract it in SQL (`extract(...)/splitByChar(...)`) and alias it — a documented limitation, not a blocker.

---

## 5. Proposed design (for the case where the module must be (re)created)

**If PR #904 lands, skip this section — the design is already implemented.** This section exists so a junior agent can rebuild the module deterministically if the PR is abandoned. It restates the canonical spec `docs/superpowers/specs/2026-05-17-data-links-design.md`.

### 5.1 Config schema
```ts
// src/datasource/datalinks/types.ts
export type CHFormat = 'table' | 'logs' | 'traces' | 'time_series' | 'flamegraph';
export interface DataLinkConfig {
  fieldName: string;          // exact, case-sensitive column name
  title: string;              // link label shown in the popover
  url?: string;               // if set → external link; internal fields ignored
  targetDatasourceUid: string;
  query: string;              // template; Grafana interpolates at click time
  format?: CHFormat;          // only meaningful when target is a CH datasource
}
```
Store as `CHDataSourceOptions.dataLinks?: DataLinkConfig[]` in `jsonData`.

### 5.2 `buildDataLink(config, targetIsClickHouse, { app })`
Three branches exactly as §3.2. Key rules:
- External URL wins when `config.url` is truthy.
- CH target → full `CHQuery` internal query; add `panelsState.trace.spanId = '${__value.raw}'` when `format === 'traces'`.
- Non-CH target → minimal `{ refId:'datalink', query }`.
- `targetBlank = !!(app && app !== 'explore')`.

### 5.3 `applyDataLinks(fields, configs, { allowedFieldNames?, app? })`
Match by exact `field.name === config.fieldName`; append built links to `field.config.links`; no-op if configs empty.

### 5.4 Frame decoration (per converter)
- `toLogs`: build a `promotedColumns` set from `dataLinks[].fieldName`; exclude from `labelFields`; after building `baseFields`, append promoted columns as top-level fields when not already present; call `applyDataLinks(result.fields, self.dataLinks, { app: self.app })`.
- `toTraces` / `toFlamegraph`: accept `dataLinks?` + `app?` params; call `applyDataLinks(fieldArray, dataLinks, { app })` after fields are built.
- `toTimeSeries`: call `applyDataLinks(fields, self.dataLinks, { app: self.app })`.
- `toTable`: **do not wire** (non-goal).

### 5.5 Wiring
- `datasource.ts`: `this.dataLinks = instanceSettings.jsonData.dataLinks`; in `processQueryResponse` pass `dataLinks: this.dataLinks, app: options.app` into `new SqlSeries(...)`.
- `sql_series.ts`: store `dataLinks`/`app`; forward to converters.

### 5.6 Template-variable interpolation in link queries
Nothing to implement — Grafana interpolates `${__value.raw}`, `${__data.fields.<name>}`, `$__from`/`$__to`, `${__field.name}` and dashboard variables at click time inside both `url` and `internal.query`. The plugin only emits template strings. (For a CH-target link, note the target CH datasource will still run its own macro expansion — `$timeFilter` etc. — on the resolved query, because the internal query is a real `CHQuery` executed by the target instance.)

### 5.7 UI (ConfigEditor)
`DataLinksSection` (list + add/remove) rendering `DataLinkEditor` per link. `DataLinkEditor` fields: `Field name`, `Title`, `External URL` (optional; hides internal fields when set), `Target` (`DataSourcePicker`, `noDefault`), `Format` (`Select`, shown only when target is a CH datasource), `Query` (`CodeEditor`, SQL). Show an invalid-target error when the configured UID no longer resolves. Persist via `onOptionsChange` into `jsonData.dataLinks`.

---

## 6. Step-by-step implementation plan

There are two scenarios. **Determine which applies first** by checking whether PR #904 is still open/mergeable (`gh pr view 904`).

### Scenario A — PR #904 is viable (RECOMMENDED, effort S)
The feature is built; just land it and close the gaps.

1. **Confirm PR state.** `gh pr view 904 --json state,mergeable`. If OPEN + MERGEABLE, proceed.
2. **Rebase / resolve conflicts against current `master`.** `datalinks-fixed-2` also carries unrelated streaming work (see §7). If the goal is a clean #432 landing, prefer cherry-picking only the data-links files listed in §2 onto a fresh branch off `master`, OR merge #904 wholesale if the streaming work is also wanted. Coordinate with the maintainer — do not silently split someone else's PR.
3. **Run the existing test suite** on the branch: `npm run test` (expect `datalinks.test.ts`, `DataLinkEditor.test.tsx`, `DataLinksSection.test.tsx`, and the `sql_series_specs.jest.ts` converter blocks to pass). Run `npm run lint` and `npm run build:frontend`.
4. **Add the missing E2E spec** (see §7 — none exists). New file `tests/e2e/features/data-links.spec.ts`:
   - Provision (or configure via UI) a datasource with a logs data link `fieldName: query_id` → same CH datasource, format `logs`, query using `${__value.raw}` (mirror `docker/grafana/provisioning/datasources/clickhouse.yaml`).
   - Run a logs query in Explore that returns `query_id`.
   - Assert the `query_id` field cell renders a link popover with the configured title.
   - (Optional, flakier) click it and assert Explore navigates / opens a split pane with the target query.
5. **Close the log-context gap** (optional, small): pass `dataLinks: this.dataLinks, app: options.app` in the two log-context `SqlSeries` constructions (`datasource.ts:285, 333`) so log-context rows also carry links. Add/extend a unit test.
6. **Fix issue metadata:** ensure the PR body / merge commit says `closes #432` (the CHANGELOG already does). #645 should remain `partially addresses` (per the #645 doc), so merging #904 auto-closes #432 only.
7. **Verify:** `npm run test && npm run lint && npm run build:frontend`, then manual check per README (configure a `trace_id` link on a logs query, click it).

### Scenario B — module must be recreated from scratch (effort M)
Only if #904 is abandoned. Follow the canonical plan `docs/superpowers/plans/2026-05-17-data-links.md` verbatim (it is task-by-task with TDD steps). In outline:
1. `src/datasource/datalinks/types.ts` — `DataLinkConfig` + `CHFormat`.
2. `buildDataLink.ts` — three branches (§5.2) + `isClickHouseTarget` + tests (`src/spec/datalinks.test.ts`).
3. `applyDataLinks.ts` — exact-name attachment (§5.3) + tests.
4. `index.ts` barrel.
5. `types.ts` — add `dataLinks?` to `CHDataSourceOptions`.
6. `datasource.ts` — read `jsonData.dataLinks`; pass `dataLinks` + `app` into `SqlSeries` in `processQueryResponse`.
7. `sql_series.ts` — carry `dataLinks`/`app`, forward to converters.
8. Converters: `toLogs` (with column promotion, §5.4), `toTraces`, `toTimeSeries`, `toFlamegraph`. Leave `toTable` alone.
9. `ConfigEditor/components/DataLinks/{DataLinkEditor,DataLinksSection}.tsx` + wire into `ConfigEditor.tsx` (`onDataLinksChange` → `jsonData.dataLinks`).
10. Component tests + converter wiring tests in `sql_series_specs.jest.ts`.
11. Provisioning example + demo dashboard + README/CHANGELOG.
12. E2E spec (as in Scenario A step 4).
13. `npm run test && npm run lint && npm run build:frontend`; manual verify.

**Do NOT follow `docs/superpowers/plans/2026-04-13-data-links.md`** — that is the superseded per-query/all-fields prototype (§0).

---

## 7. Test plan

### Existing coverage (on the PR branch)
- `src/spec/datalinks.test.ts` — `buildDataLink` / `applyDataLinks` unit tests (branches, exact-match attachment, no-op cases).
- `src/spec/DataLinkEditor.test.tsx`, `src/spec/DataLinksSection.test.tsx` — React component tests.
- `src/spec/sql_series_specs.jest.ts:792+` — converter wiring: `toTraces` (attach + no-op), `toLogs` (attach + column promotion + label exclusion + body link), `toFlamegraph`, `toTimeSeries`.

### Gaps to fill
1. **E2E: ZERO tests exist for data links.** `grep -R "dataLink|internal|spanId|panelsState" tests/e2e/` → no hits; the design spec defers E2E to manual verification. This is the single most valuable missing test. Add `tests/e2e/features/data-links.spec.ts` per §6 Scenario A step 4 — this is the direct #432 acceptance test (configure `trace_id`/`query_id` link → run logs query → link appears → navigation opens target).
2. **Unit: logs column-promotion assertion for the exact #432 field.** Extend the `toLogs` block in `sql_series_specs.jest.ts` to assert that a `dataLinks: [{ fieldName: 'trace_id', ... }]` config causes a top-level `trace_id` field (not folded into `labels`) carrying `config.links[0]` with the built internal query — i.e. the "click trace_id in logs" scenario verified at the converter layer.
3. **Unit: external-URL link.** Assert a config with `url` set produces `{ title, url, targetBlank }` and no `internal` (ES-style external link).
4. **Unit (if §6 step 5 done): log-context carries links** once `dataLinks`/`app` are threaded through the log-context `SqlSeries`.

---

## 8. Risks / edge cases

1. **Not merged.** The whole feature is on an unmerged branch (PR #899 closed; #904 open). The primary risk to #432 is landing logistics, not code. `datalinks-fixed-2` also contains unrelated streaming-append work — merging #904 wholesale pulls that in too; cherry-picking only the data-links files (§2) avoids that but is more manual. **Coordinate with the maintainer before splitting the PR.**
2. **Exact, case-sensitive `fieldName` match.** `trace_id` ≠ `traceID` ≠ `TraceId`. Users must type the column name exactly as returned. The `DataLinkEditor` tooltip warns about this but there's no validation against actual result columns. (Loki solves this with regex; deferred here.)
3. **`trace_id` embedded in free-text logs.** If the logs table has no `trace_id` column and it's inside the message body, auto-promotion can't help — the user must extract+alias it in SQL. No regex derived-field support (documented non-goal). Worth calling out in README for the #432 use case specifically.
4. **`table` format unsupported.** If a user expects to click a link in a Table panel, it won't work (`toTable` returns legacy shape). Non-goal, but a likely support question.
5. **Log-context path drops links** (`datasource.ts:285, 333`). Minor inconsistency; log-context rows won't show links.
6. **Target datasource must exist.** If `targetDatasourceUid` points to a deleted datasource, the link is dead. `DataLinkEditor` shows an invalid-target error in config, but a provisioned/exported dashboard could still carry a stale UID.
7. **CH-target internal query re-runs macros.** For a CH→CH link, the target instance runs its own macro expansion (`$timeFilter`, `$table`, …) on the resolved query. Authors must write the link query with the target's macros/time semantics in mind (e.g. `$__from`/`$__to` for the *source* click context vs. `$timeFilter` executed by the *target*). This is subtle but is how Grafana + the CH plugin are designed to interoperate.
8. **React keys by index** in `DataLinksSection` — reordering/removing middle entries can cause minor input-focus quirks. Cosmetic.
9. **Trace `spanId` pin is trace-to-trace, not trace-to-metrics.** The `panelsState.trace.spanId` only highlights the clicked span in the *target trace view*. For metrics navigation and the full #645 trace-to-metrics parity gap, see `docs/issue-analysis/645-trace-to-metrics.md` — out of scope for #432.

---

## 9. Bottom line for the implementer

#432 is **done in code** and needs to be **landed, not written**. The generic datasource-level internal-link mechanism on `datalinks-fixed-2` (PR #904) satisfies the issue's verbatim logs→trace scenario, including auto-promotion of the `trace_id` column so no aliasing is required. The concrete remaining work is: land PR #904 (or cherry-pick its data-links files onto `master`), add the missing E2E acceptance test, optionally thread links through the log-context path, and ensure the merge closes #432 (leaving #645 as "partially addresses"). Do not follow the superseded `2026-04-13-data-links.md` plan; follow `2026-05-17-data-links.md` / the design spec if any rebuild is needed.
