# Issue #908 — Make TestFlows tests work on the latest Grafana version

Deep-dive analysis against the codebase at `/Users/lunaticus/Documents/Work/clickhouse-grafana` (branch `feature/advanced-logs-field-settings`).

- Repo: Altinity ClickHouse datasource plugin for Grafana (TypeScript frontend + Go backend + legacy TestFlows Python/Selenium e2e suite).
- Issue: <https://github.com/Altinity/clickhouse-grafana/issues/908>
- Status at time of writing: **OPEN**. Author & sole assignee: `Slach` (maintainer, `COLLABORATOR`). Created 2026-06-28, part of milestone **`3.4.13`** (milestone #30, alongside #906 and the closed #907). **The issue has an empty body and zero comments** — the title *"make testflows test work on latest grafana version"* is the entire specification. It is a terse tracking issue, not a bug report. There are no screenshots.
- Context from sibling issues/PRs (all in the same recent workstream): **#893** *"ci(testflows): run suites against fixed + latest Grafana in parallel"* (closed/merged), **#901 / #902** *"stabilize testflows … fix fragile selectors"* (closed/merged), **#907** *"replace gh-api datasource with gh-play"* (closed/merged). #908 is the natural next step of that stream: **#893 built the fixed+latest CI matrix; #908 asks to make the `latest` column actually green.**

---

## 0. TL;DR

The CI matrix that runs TestFlows against two Grafana versions already exists (`.github/workflows/testflows.yml:118-120`): `fixed = 12.4.0-20977568970` (`required: true`) and `latest` (`required: false`, informational via `continue-on-error`). Today "latest" resolves to **Grafana 13.1.0** (released 2026-07-01) — the plugin ships `@grafana/*` `13.0.1` and declares `grafanaDependency: >=12.3.0` (`src/plugin.json:52`), but the Selenium suite was written/verified against 12.4.0. **The task is: get the `latest` (13.x) column passing so it can eventually be promoted to `required`.** The failures will come almost entirely from *selectors that don't survive the Grafana 12→13 UI overhaul* — Grafana 13 shipped a new v2 dashboard schema, a redesigned "dynamic dashboards" edit experience (sidebar-docked edit mode, drag-and-drop panel creation, per-query data source picker) and a redesigned query editor. The suite has ~60 stable `data-testid` selectors (low risk) but also ~40+ text-based XPath selectors (`//*[text()="FROM"]`, `//button[.//text()='Go to Query']`, etc.) and ~15 `aria-label` selectors that are the likely breakage points, concentrated in the dashboard-edit / panel / query-editor step files.

This is **not a code fix in the plugin** — it is **e2e test maintenance**: run the suite against 13.x, triage each failing suite, and repair or re-anchor selectors (preferring `data-testid`), plus any auth/route drift. **Recommendation: IMPLEMENT (it's an explicitly-tracked milestone item and the CI scaffold is already in place). Do NOT deprecate TestFlows now** — see §8 for the argument; the Playwright suite (`tests/e2e/`) does not yet cover the same surface. **Effort: MEDIUM (~2–4 days), iterative and hard to estimate precisely** because the exact set of broken selectors can only be enumerated by running against 13.x (statically we can only rank likelihood).

**One correctness caveat for the implementer:** the version-branch logic in the locators keys off `self.context.grafana_version`, which the main suites set to **`None`** (`regression.py:150`). `None` always takes the *newer* selector branch. So the branch is effectively "legacy 10.4.3 (only the `legacy_alerts` suite) vs. everything-else"; it is **not** a "12 vs 13" switch. The suite has no notion of which modern Grafana it is running against — so any 13-specific selector must either be made to work for both 12 and 13, or a real 12-vs-13 discriminator must be introduced (see §5, step 4).

---

## 1. Map of all relevant code / config

### 1.1 CI matrix & orchestration

| Location | Symbol / content | Role |
|---|---|---|
| `.github/workflows/testflows.yml:82-121` | `tests:` job + `strategy.matrix` | The 2D matrix **suite × grafana**. `fail-fast: false`. |
| `.github/workflows/testflows.yml:99-117` | `matrix.suite` (18 entries) | One CI job per suite (`window_functions`, `sql_editor`, `e2e`, `functions`, `macros`, `adhoc_macro`, `unified_alerts`, `legacy_alerts`, `log_context`, …). |
| `.github/workflows/testflows.yml:118-120` | `matrix.grafana` | `{version: "12.4.0-20977568970", label: fixed, required: true}` and `{version: "latest", label: latest, required: false}`. **This is the #893 output; #908 targets the `latest` row.** |
| `.github/workflows/testflows.yml:152-162` | Run step | `continue-on-error: ${{ !matrix.grafana.required }}` → **latest failures don't fail the build today**. Passes `GRAFANA_VERSION: ${{ matrix.grafana.version }}` and runs `regression.py --suite <name>`. |
| `.github/workflows/testflows.yml:189-287` | `coverage:` job | Downloads only `raw-coverage-*-fixed` (`:217`) — coverage is computed from the **fixed** run only. |
| `docker-compose.yaml:54-81` | `grafana` service | `image: ${GRAFANA_IMAGE:-grafana/grafana}:${GRAFANA_VERSION:-latest}` — the version the matrix injects lands here. |
| `docker-compose.yaml:83-111` | `grafana_legacy_alerts` service | Pinned `${GRAFANA_LEGACY_VERSION:-10.4.3}` — only used by the `legacy_alerts` suite. |
| `docker-compose.yaml:113-129` | `grafana_external_install` service | Installs a released `.zip` plugin build; not part of the TestFlows matrix. |

### 1.2 TestFlows runner & version plumbing

| Location | Symbol | Role |
|---|---|---|
| `tests/testflows/regression.py:70-179` | `regression()` `@TestModule` | Entry point. Builds docker cluster, creates webdriver, logs in, then loads each suite as a `Feature`. |
| `tests/testflows/regression.py:81-88` | context setup | `endpoint="http://grafana:3000/"`, `global_wait_time=30`, `browser="chrome"`. |
| `tests/testflows/regression.py:150` | `self.context.grafana_version = None` | **Main suites always run with `grafana_version=None`.** `None` ⇒ locators take the *modern* branch. |
| `tests/testflows/regression.py:155-175` | `legacy_alerts` block | The **only** place `grafana_version` is set to a real value (`"10.4.3"`, `:156`); it also spins up the `grafana_legacy_alerts` service and re-points `endpoint`. |
| `tests/testflows/regression.py:40-47` | `ffails` | Permanent expected-failures: the `#`/`#!` hash-comment scenarios (→ issue #610). |
| `tests/testflows/regression.py:49-65` | `xfails` | Known flaky/failing scenarios (e.g. `rate_space_in_variable`). |
| `tests/testflows/regression.py:130-148` | `main_suites` list | The 17 modern suites (mirrors the CI matrix minus `legacy_alerts`). |
| `tests/testflows/infra/setup.sh` | CI setup | Creates venv, `pip install -r requirements.txt`, installs `ffmpeg/libsm6/libxext6`, prepares `tmp/`, `assets/sessions.json`. |
| `tests/testflows/requirements.txt` | pins | `selenium==4.29.0`, `testflows==2.4.19`, `pillow==12.2.0`, `opencv-python==4.9.0.80`, `numpy==1.26.4`. |
| `tests/testflows/steps/cluster.py:176-192` | docker-compose wrapper | Reads `GITHUB_ACTIONS`, `SKIP_BUILDERS`; sets compose timeouts. |
| `tests/testflows/steps/ui.py` | webdriver helpers | `create_driver`, `open_endpoint`, `wait_for_element_to_be_clickable`, etc. |

### 1.3 Login (stable) — `tests/testflows/steps/login/`

`locators.py` uses `data-testid` for all four fields (`Username input field`, `Password input field`, `Login button`, `Skip change password button`). `view.py:96` logs in as `admin/admin`. **Low breakage risk** — `data-testid` login selectors have been stable across Grafana 10/11/12/13.

### 1.4 Selector inventory by breakage risk

**STABLE (~60 selectors, low risk):** `[data-testid='data-testid …']` — the supported test API. Examples: `data-testid panel content`, `data-testid Save dashboard button`, `data-testid Edit dashboard button`, `data-testid Panel header {name}`, `data-testid Data source settings page Save and Test button`. These are Grafana's public e2e contract and least likely to move.

**FRAGILE — text-based XPath (~40+, HIGH risk on the 12→13 query-editor redesign):**
- `tests/testflows/steps/connections/datasources/locators.py:11,15` — `//a[text()='{datasource_name}']` (+ `/parent::*/parent::*`). (These are the "stable-ified" ones from #901, but still text-based.)
- `tests/testflows/steps/panel/sql_editor/locators.py:23,31,40,49,57,65,73,81,89,97,115` — `//*[./text()="FROM"]…`, `…"Format As"…`, `…"Skip Comments"…`, `//button[.//text()="Show generated SQL"]`, `//h5[text()="Macros"]…`.
- `tests/testflows/steps/panel/query_settings/locators.py:23,40,48,58` — `…"Column timestamp type"…`, `…"Timestamp Column"…`, `…"Date column"…`.
- `tests/testflows/steps/dashboard/locators.py:85,91,102,108,114,119,139` — `//button[.//text()='Go to Query']`, `//*[./text()="FROM"]…`, `//button[.//text()="Show generated SQL"]`.
- `tests/testflows/steps/panel/locators.py:107,139,287,292,301,305` — `//*[text()='Download CSV']…`, `//*[text()="Data is missing a time field"]`, `//*[text()="No data"]`, table cell by column/time text.
- `tests/testflows/steps/alerting/alert_rules/new/locators.py:26,33,49,57,65,71,83,104,111,118,125,176` — `//button[.//text()='Go to Query']`, `//button[.//text()='Run Query']`, `//button[./span/text()='Add expression']`, expression-type/label text matches.
- `tests/testflows/steps/connections/datasources/altinity_edit/locators.py:27,32,169-223` — `//label[contains(text(),'Browser')]…`, `//label[contains(text(),'Server')]…`, and the `Datetime Field` / `Timestamp64(3) Field` / `Date Field` / `Context window` field locators (all text-anchored). **This is the datasource config form — critical for `data_source_setup*` suites.**

**FRAGILE — `aria-label` (~15, MEDIUM risk):**
- `tests/testflows/steps/dashboards/locators.py:18` — `[aria-label='New']`; `:24` — `//a[@href='/dashboard/new']` (route-anchored).
- `tests/testflows/steps/panel/locators.py:77,82,87,97,102,268,310,321,326,337,346` — `Panel header error`, `Query inspector button`, `Panel inspector Query refresh button`, `Panel inspector Data content`, `Select dataframe`, adhoc-filter edit/remove (`Edit filter with key {…}`, `Remove filter with key {…}`).
- `tests/testflows/steps/panel/query_options/locators.py:12` — `//button[@aria-label="Expand query row" or @aria-label="Collapse query row"]`.

**FRAGILE — hashed Emotion CSS (2, only in the `<=10` legacy branch, N/A for 13):**
- `tests/testflows/steps/dashboard/locators.py:33` — `[class ='css-8tk2dk-input-input']`; `:40` — `[class ='css-td06pi-button']`. These sit behind `if int(grafana_version.split(".")[0]) <= 10` and are only reached by `legacy_alerts`; they do **not** affect the 13.x run.

**FRAGILE — legacy Angular attrs (only Grafana 10 legacy alerts):** `tests/testflows/steps/alerting/alert_rules_legacy/new/locators.py:17,22,27,33,43,48,78,90` — `ng-model`, `ng-blur`, `ng-class`, `//div[@class='gf-form-group'][{n}]…`. N/A for 13.x.

### 1.5 Version-branching logic (the "12 vs 13" gap)

| Location | Content | Note |
|---|---|---|
| `tests/testflows/steps/dashboard/locators.py:24-45` | `save_dashboard`, `save_dashboard_title`, `save_dashboard_button` | `if grafana_version is not None and int(split(".")[0]) <= 10:` → old (aria-label / css-hash); `else:` → `data-testid`. |
| `tests/testflows/steps/dashboard/view.py:298,304,307,314` | passes `grafana_version=self.context.grafana_version` into the above | For main suites this is `None` ⇒ modern branch. |
| `tests/testflows/steps/dashboard/view.py:493-494` | `add_visualization` | `if grafana_version is None or int(split(".")[0]) > 10:` → click edit button first. |
| `tests/testflows/steps/panel/locators.py` and `panel/sql_editor/locators.py`, `panel/query_settings/locators.py` | 76 total `grafana_version <= 10` conditionals | Same pattern throughout — **binary "legacy-10 vs modern"**, no 12-vs-13 discriminator. |

**Consequence:** there is currently *no mechanism* to select a 13-specific selector distinct from a 12-specific one. Both 12.4.0 and 13.1.0 hit the `else`/modern branch identically. Any selector that changed *between* 12 and 13 will fail on 13 and there's nowhere to special-case it without adding a real version signal (§5 step 4).

### 1.6 Data source provisioning (used to avoid UI creation — from #902 fix #3)

`docker/grafana/provisioning/datasources/*.yaml` provisions: `clickhouse` (default, no explicit uid), `clickhouse-limited` (uid `clickhouse-limited`), `clickhouse-direct`, `clickhouse-get`, `clickhouse-hide-adhoc-tables`, `clickhouse-ontime`, `clickhouse-x-auth`, `clickhouse-x-auth-http`, `clickhouse-x509`, `grafanalabs-clickhouse`, `gh-api` (uid `gh-api`), `postgres`, `test-data` (`grafana-testdata-datasource`), `trickster`. Tests reference datasources mostly **by name** (text), a handful by uid. Note the working tree still has `gh-api` here and `gh_api_check` in `e2e.py:18` — the `gh-play` rename from #907 is **not yet on this branch** (see §1.7).

### 1.7 Branch state (important — avoid analyzing stale code)

The working branch `feature/advanced-logs-field-settings` is a **feature branch that predates the recent testflows-stabilization merges** on `master`. Confirmed:
- `git log HEAD..master` = 0 (this branch is a descendant tip, last commit 2026-07-04), yet the working tree still contains `gh_api_check` (`tests/testflows/tests/automated/e2e.py:18`) and `docker/grafana/provisioning/datasources/gh-api.yaml`, whereas #907 (merged) renamed these to `gh-play`. In other words the branch has *its own* testflows tree that has diverged from the stabilized master state. `git grep gh_play master -- tests/testflows` returns nothing locally too, so the local `master` ref may itself be behind `origin/master`.
- **Implication for the implementer:** do the #908 work on a branch cut from **fresh `origin/master`** (which contains #893/#901/#902/#907), not from this feature branch. The `.github/workflows/testflows.yml` matrix and version-branch scaffolding described here are present on `master`; the `gh-play`/selector-stabilization deltas from #901/#902/#907 are the baseline you build on. Re-run `gh pr view` / `git fetch origin` first to establish the true baseline.

---

## 2. Analysis — what is pinned where, and what is likely broken

### 2.1 The version landscape

- **Plugin build target:** `@grafana/data|ui|runtime` `13.0.1` (`package.json:71-73`), `@grafana/e2e-selectors ^13.0.1` (`:27`), `grafanaDependency: ">=12.3.0"` (`src/plugin.json:52`). So the *plugin* is already 13-aware at the SDK level.
- **CI "fixed":** `12.4.0-20977568970` (`testflows.yml:119`) — the version the suite is known-good against, gates the build.
- **CI "latest":** the `latest` docker tag → **Grafana 13.1.0** at the time of writing (2026-07-01 release). This is the moving target #908 is about.
- **Legacy:** `10.4.3` (`docker-compose.yaml:85`) only for `legacy_alerts`.

### 2.2 Why "latest" fails today (static reasoning — the exact list needs a live run)

Grafana 13 (GrafanaCON 2026, April 21) is a **major** release with UI changes that directly intersect this suite's fragile selectors:

1. **New "dynamic dashboards" edit experience.** Sidebar docks in edit mode / floats in view mode; drag-and-drop panel creation from the sidebar onto the canvas; variables/annotations moved into a sidebar with drag-and-drop reordering and inline editing. → The **dashboard edit → add-panel → configure flow** is exactly what `steps/dashboard/view.py` (`add_visualization`, `:490-500`) and the panel step files drive. Any assumption about "click Edit, then Add panel" ordering, or the DOM layout of the panel editor, is at risk. This is the **highest-probability breakage cluster**.

2. **Redesigned query editor** with per-query data source picker and color-coded query/expression/transformation cards. → The suite's text-anchored `//*[./text()="FROM"]/..//..//input[contains(@id,"react-select")]` chains (`panel/query_settings/locators.py`, `panel/sql_editor/locators.py`) walk sibling/parent DOM relative to visible labels. A redesigned editor almost certainly reshapes those parent/sibling relationships even if the label text survives. **These deep relative XPaths are the second-highest risk.**

3. **New v2 dashboard schema** (v1 auto-migrated on load). → Provisioned dashboards used by `e2e`/`worldmap`/`flamegraph` suites will be auto-migrated; usually transparent, but panel `data-testid`/aria structure or "No data"/"Data is missing a time field" messaging (`panel/locators.py:287,292`) can shift.

4. **New dashboard creation page with a default-layout selector.** → `open_new_dashboard_endpoint` navigates to `/dashboard/new` (`dashboard/view.py:484`) and `dashboards/locators.py:24` matches `//a[@href='/dashboard/new']`. A creation-page redesign may add an intermediate layout-picker step or change the route/entry button (`[aria-label='New']`, `dashboards/locators.py:18`).

5. **Text/i18n drift.** Any XPath that hard-codes English button/label text (`'Go to Query'`, `'Run Query'`, `'Add expression'`, `'Show generated SQL'`, `'Download CSV'`) breaks if that text is renamed — a common occurrence across a major release.

### 2.3 What is *not* the problem

- **Login/auth:** `data-testid`-based, historically stable; unlikely to break at 13.
- **The Go/TS plugin code:** #908 is a test-maintenance task, not a plugin bug. (The plugin already targets `>=12.3.0` and 13.x SDKs.) No `pkg/` or `src/` change is expected unless a test surfaces a genuine 13 incompatibility in the plugin itself — in which case that's a *separate* issue.
- **The legacy Angular / css-hash / `<=10` selectors:** guarded behind the `<=10` branch, only reached by `legacy_alerts` against 10.4.3; irrelevant to the 13.x run.
- **`gh-api`/`gh-play`:** already handled by #907 on master (external-dependency flakiness), orthogonal to the 12→13 selector question. Just make sure you branch from post-#907 master.

### 2.4 What "done" means for #908

Two credible interpretations; recommend confirming with `Slach`, but the CI structure implies the first:
- **(a) Make the `latest` column green**, i.e., every suite passes on 13.x with `continue-on-error` still on, and then **flip `required: false → true`** (or drop `continue-on-error`) for the `latest` row in `testflows.yml:120`/`:153`. This is the concrete, verifiable deliverable.
- **(b) Weaker:** just make it green while keeping it informational, deferring promotion. Even (b) requires the same selector work; only the final `testflows.yml` edit differs.

---

## 3. Step-by-step implementation plan

> Do this on a branch cut from **fresh `origin/master`** (post #893/#901/#902/#907), *not* from the current feature branch (§1.7). All selector work should prefer `data-testid`, then `aria-label`, then text-XPath as a last resort — mirroring the #901/#902 stabilization philosophy already established in this repo.

### Phase 0 — Establish the true baseline & reproduce
1. `git fetch origin && git switch -c fix/908-testflows-latest origin/master`. Confirm `tests/testflows/tests/automated/e2e.py` has `gh_play_check` and `docker/grafana/provisioning/datasources/gh-play.yaml` exist (proves you're post-#907). Confirm `testflows.yml:118-120` has the fixed+latest matrix.
2. **Reproduce the failures locally against 13.x.** From repo root:
   ```bash
   docker compose run --rm frontend_builder && docker compose run --rm backend_builder   # or reuse dist/
   cd tests/testflows
   python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
   # run each suite against latest, capturing failures:
   GRAFANA_VERSION=latest ./regression.py --before=0.1 --after=0.1 --suite e2e --log raw.log -o short
   ```
   Repeat per suite (or loop over the 17 `main_suites` names). Use `localhost:4444` (password `secret`) to *watch* the Selenium session live (README §"Watching running tests") — this is the fastest way to see exactly which selector hangs/misses.
3. **Build the failure inventory:** for each suite, record (suite, failing step, the selector string, the observed DOM in 13.x). This inventory is the real spec — §2.2 only ranks likelihood.

### Phase 1 — Triage & fix selectors (the bulk of the work, iterate suite-by-suite)
Order suites cheapest-first to build momentum: `data_source_setup_connections`, `data_source_setup_defaults` (datasource form), then `sql_editor`, `query_options`, `functions`, `macros`, `adhoc_macro`, `template_variables_editor`, `window_functions`, `conditional_test`, `search_filter`, `worldmap_and_table_format`, `flamegraph_and_tracing`, `limited_access`, `log_context`, `e2e`, `unified_alerts`.

For each failing selector, in priority order of fix strategy:
4. **Re-anchor to `data-testid` where 13 exposes one.** Inspect the 13.x DOM (via the live Selenium view or `docker exec`/browser devtools against the running Grafana). Replace text-XPath / aria-label with the `data-testid` Grafana 13 provides. Files most likely touched: `steps/panel/sql_editor/locators.py`, `steps/panel/query_settings/locators.py`, `steps/panel/locators.py`, `steps/dashboard/locators.py`, `steps/connections/datasources/altinity_edit/locators.py`, `steps/dashboards/locators.py`.
5. **If a genuine 12-vs-13 divergence exists** (a selector that must differ between the two modern versions), introduce a real version discriminator instead of overloading the `<=10` branch:
   - Plumb the actual Grafana version into context. Options: (a) read `GRAFANA_VERSION` env in `regression.py` and set `self.context.grafana_version` to the real value for main suites (instead of hard `None` at `:150`) — but note `latest` is not a parseable semver, so map `latest`→a high sentinel like `"99.0.0"`; or (b) query Grafana's `/api/health` (returns `version`) after login and store it. Option (b) is more robust (works regardless of how the image tag is spelled).
   - Then extend the existing `int(grafana_version.split(".")[0]) <= 10` conditionals with a `>= 13` branch where needed. Keep the 12 path working (fixed column must stay green).
6. **Fix flow/ordering changes** in `steps/dashboard/view.py` (`add_visualization` `:490-500`, save flow `:298-314`) if Grafana 13's edit experience inserts/removes steps (e.g., a layout-picker on `/dashboard/new`, sidebar-docked edit mode). Prefer waiting on a `data-testid` that marks the editor-ready state rather than fixed sleeps.
7. **Re-run the affected suite against BOTH `GRAFANA_VERSION=12.4.0-20977568970` and `GRAFANA_VERSION=latest`** after each fix — every change must keep the *fixed* column green (it's `required`) while greening the *latest* column. This dual-run discipline is the core safety property.

### Phase 2 — Route / provisioning / auxiliary drift
8. Verify hardcoded routes still resolve on 13: `/login`, `/dashboards`, `/dashboard/new`, `/connections/datasources`, `/connections/datasources/new`, `/plugins/vertamedia-clickhouse-datasource` (`steps/*/view.py`). Adjust if 13 moved any.
9. Verify provisioned datasources still load on 13 (schema of the provisioning YAML is stable, but confirm the plugin registers under `vertamedia-clickhouse-datasource` and appears in the 13 datasource list).
10. If the datasource **config form** (`altinity_edit`) changed field layout in 13, its text-anchored field locators (`:169-223`) are high-risk — re-anchor to `data-testid` / `id` where possible.

### Phase 3 — Promote & document
11. **Flip the `latest` row to required** in `.github/workflows/testflows.yml`: change `required: false → true` at `:120` and remove/negate the effect at `:153` (`continue-on-error: ${{ !matrix.grafana.required }}` will then be `false`). *Optionally* also add the latest run's coverage to the `coverage:` job (`:217` currently only globs `-fixed`). **Recommendation:** promote to required *only after* several green runs to avoid re-introducing flakiness; a maintainer (Slach) should sign off on the promotion since it changes what gates the build.
12. Consider **re-pinning the `fixed` version to a 13.x digest** once latest is stable, so "fixed" tracks the current major and "latest" continues to catch the *next* one. (Optional, maintainer call.)
13. Update `tests/testflows/README.md` if any run instructions changed; note in the PR which selectors were re-anchored and why (link #908, reference the #901/#902 selector-stabilization precedent).

---

## 4. Test / verification plan

TestFlows *is* the test suite here, so "verification" = running it and observing green.

- **Per-suite dual-version run** (the primary gate). For every suite `S` in the 17 main suites (+ `legacy_alerts`):
  ```bash
  cd tests/testflows
  GRAFANA_VERSION=12.4.0-20977568970 ./regression.py --before=0.1 --after=0.1 --suite S --log raw.log -o short   # must stay OK (required)
  GRAFANA_VERSION=latest             ./regression.py --before=0.1 --after=0.1 --suite S --log raw.log -o short   # target: OK
  ```
  Acceptance: both exit `OK` for every suite. `legacy_alerts` continues to run against its own pinned 10.4.3 service and must remain unaffected.
- **Live observation** at `localhost:4444` (password `secret`) during iteration to confirm the *right* element is being hit (not a coincidental match).
- **Full CI dry run** on the PR: the `Run testflows tests` workflow will exercise the whole matrix. With `continue-on-error` still on for `latest`, inspect the per-job logs to confirm `latest` jobs are genuinely green (not just non-blocking). Only after that, do the Phase-3 `required` flip and re-run.
- **No plugin unit tests are involved** unless a real plugin incompatibility surfaces; if it does, that's a separate issue with its own `go test ./pkg/...` / `npm run test` verification.
- **Coverage sanity:** if you extend the `coverage:` job to include `latest`, confirm `tests/testflows/coverage/lcov.info` and `go_coverage/coverage.txt` still generate (the `Verify frontend coverage` step, `:260-271`, will error loudly if empty).

---

## 5. Risks / edge cases / open questions

| # | Item | Notes / mitigation |
|---|---|---|
| 1 | **Static analysis can't enumerate the exact broken selectors** | Only a live 13.x run does. §2.2 ranks *likelihood*; the true list comes from Phase 0. This is why the estimate is a range. |
| 2 | **`latest` is a moving tag** | Between the fix and merge, `latest` may bump (13.1→13.2→…) and re-break. Mitigation: consider pinning `latest` to a specific 13.x digest for reproducibility, or accept the informational-until-green model and pin only when promoting to required. Discuss with Slach. |
| 3 | **No 12-vs-13 discriminator exists** (`grafana_version=None` for main suites, `regression.py:150`) | If any selector must differ between 12 and 13, you must add a real version signal (§3 step 5). Prefer querying `/api/health` post-login so it works regardless of tag spelling (`latest` isn't semver-parseable). Keep the existing `<=10` legacy path intact. |
| 4 | **Every fix must keep the `fixed` (12.4.0) column green** | It's `required: true`. A selector re-anchored to a 13-only `data-testid` could break 12. Always dual-run (§3 step 7). Where 12 and 13 truly differ, branch. |
| 5 | **Branch hygiene** | Do the work off fresh `origin/master`, not this feature branch, which has a diverged/stale testflows tree (still `gh_api`, pre-#907). (§1.7) |
| 6 | **Dashboard v2 schema auto-migration** | Provisioned dashboards (`docker/grafana/dashboards/`) are v1; 13 auto-migrates on load. Usually transparent but can shift panel DOM/messaging — watch `e2e`, `worldmap_and_table_format`, `flamegraph_and_tracing`. |
| 7 | **Deep relative XPath chains** (`//*[./text()="FROM"]/..//..//input[…react-select]`) | Even if the label text survives, the query-editor redesign likely changes parent/sibling structure. These need the most careful re-anchoring; a `data-testid` on the actual input is far preferable. |
| 8 | **Flake vs. real failure** | The suite already carries `xfails`/`ffails` (`regression.py:40-65`). Distinguish a genuine 13 selector break from pre-existing flake before "fixing" — check whether the same step passes on `fixed`. If it fails on both, it's a pre-existing issue, not #908. |
| 9 | **Chrome/Selenium/Grafana compat** | `selenium==4.29.0` + Grafana 13 SPA should be fine, but confirm no new client-side feature (e.g., stricter CSP, web components) trips the driver. Unlikely, but check if whole-page loads hang. |
| 10 | **Promotion timing** | Flipping `latest` to `required` (Phase 3) changes build gating — get maintainer sign-off and require several consecutive green runs first. |
| 11 | **Open question for Slach** | Does "done" mean *promote latest to required* (recommended reading, given #893 set up the matrix) or *just make it green while informational*? Both need the same selector work; only the final `testflows.yml` edit differs. |

---

## 6. Estimated effort

| Sub-task | Estimate |
|---|---|
| Phase 0: baseline + reproduce all 17 suites against 13.x, build failure inventory | 0.5–1 day |
| Phase 1: triage + re-anchor selectors, iterate suite-by-suite, dual-version verify | 1.5–2.5 days (dominant, high variance) |
| Phase 2: route/provisioning/datasource-form drift | 0.25–0.5 day |
| Phase 3: promote `latest` to required, coverage/README/PR | 0.25 day |
| **Total** | **~2–4 days** |

**Final sizing: MEDIUM (M).** The CI scaffold and version-branch pattern already exist; the work is mechanical-but-iterative selector repair against a live 13.x, gated by "keep 12 green." Variance is driven entirely by how many selectors the 13 UI overhaul actually broke — knowable only after Phase 0.

---

## 7. Recommendation

**IMPLEMENT.** It is an explicitly-tracked milestone-3.4.13 item authored by the maintainer, and the enabling CI matrix (#893) plus selector-stabilization groundwork (#901/#902/#907) are already merged. The concrete deliverable is: **get the `latest` (Grafana 13.x) TestFlows column green across all 17 suites, then promote it from `required: false` to `required: true` in `testflows.yml`.** The work is e2e-test maintenance (selector re-anchoring + minor flow/route/version-plumbing changes), **not** a plugin code change.

---

## 8. Should TestFlows be maintained at all, given the Playwright suite? (explicit assessment)

**Keep TestFlows for now — do not deprecate as part of #908.** Arguments:

**For keeping (why #908 is worth doing):**
- **Coverage breadth.** TestFlows drives 17 substantive suites (`functions`, `macros`, `adhoc_macro`, `query_options`, `sql_editor`, `window_functions`, `flamegraph_and_tracing`, `worldmap_and_table_format`, `limited_access`, `log_context`, `unified_alerts`, `legacy_alerts`, `data_source_setup*`, `template_variables_editor`, `conditional_test`, `search_filter`, `e2e`). The Playwright suite (`tests/e2e/`) is far younger and, per the repo layout (`tests/e2e/features/functions/`, `datasource/config.spec.ts`, `visual/`), covers a *narrower* slice. Deleting TestFlows today would drop real regression coverage with no equivalent replacement.
- **Backend coverage instrumentation.** TestFlows is wired to collect **Go + TS code coverage** through instrumented builds (`README.md` §"Collecting code coverage", the `coverage:` job in `testflows.yml:189-287`, `GOCOVERDIR`, nyc). This end-to-end coverage pipeline reports to Coveralls (`:273-276`). The Playwright suite does not (yet) reproduce this. That coverage signal is a concrete asset.
- **Recent, active investment.** The git log shows sustained, *recent* work on TestFlows: #893 (matrix), #901/#902 (stabilization), #907 (gh-play), plus `log_context`, `limited_access`, `flamegraph`, `worldmap`, `conditional_test`, `search_filter` suites all added in the last stretch. The maintainer is clearly treating it as a living asset, not legacy debt — and explicitly filed #908 to keep it current. Deprecating now would waste that investment.
- **The multi-version matrix itself is the feature.** #893 deliberately built fixed+latest so TestFlows acts as an *early-warning system* for Grafana-version breakage — precisely the value #908 unlocks. Playwright would need the same matrix built out before it could replace this role.

**Against (the case for eventual migration, not now):**
- The suite's fragility is real and recurring — hashed CSS (historically), text-XPath, aria-label churn — which is *why* #901/#902 and #908 keep needing to happen. Each Grafana major will re-break it.
- Playwright + `@grafana/plugin-e2e` (already a dependency, used in `tests/e2e/`) provides Grafana-maintained, version-resilient selectors and is the direction Grafana Labs itself recommends for plugin e2e. Long term, migrating the TestFlows scenarios into `@grafana/plugin-e2e` would reduce exactly the maintenance #908 represents.

**Recommendation:** treat #908 as *maintenance of a still-valuable suite*, and (separately, not blocking #908) open a follow-up to **incrementally port the highest-value TestFlows scenarios to Playwright/`@grafana/plugin-e2e`**, retiring TestFlows suites only as their coverage (including the Go coverage pipeline) is genuinely reproduced. Do not couple that migration to #908 — #908's job is simply to make the existing suite green on 13.x.

---

## 9. Key file:line references

- `.github/workflows/testflows.yml:82-121` — CI matrix (suite × grafana); `:118-120` fixed+latest rows; `:152-162` run step; `:153` `continue-on-error`; `:217` fixed-only coverage.
- `docker-compose.yaml:54-81` — `grafana` service (version injected via `GRAFANA_VERSION`); `:83-111` legacy 10.4.3 service.
- `tests/testflows/regression.py:150` — `grafana_version = None` for main suites; `:155-175` legacy_alerts block; `:40-65` ffails/xfails; `:130-148` suite list.
- `tests/testflows/steps/dashboard/locators.py:24-45` — version-branch (`<=10`) save-dashboard selectors; `:85,91,102,108,114,119` text-XPath.
- `tests/testflows/steps/dashboard/view.py:298-314` save flow, `:490-500` `add_visualization`, `:484` `/dashboard/new` route.
- `tests/testflows/steps/panel/sql_editor/locators.py`, `panel/query_settings/locators.py`, `panel/locators.py` — the fragile text-XPath / aria-label clusters (HIGH risk for 13).
- `tests/testflows/steps/connections/datasources/altinity_edit/locators.py:27,32,169-223` — datasource-config-form field locators (text-anchored).
- `tests/testflows/steps/dashboards/locators.py:18,24` — `[aria-label='New']`, `//a[@href='/dashboard/new']`.
- `tests/testflows/steps/login/locators.py`, `login/view.py:96` — stable `data-testid` login (low risk).
- `src/plugin.json:52` — `grafanaDependency: ">=12.3.0"`; `package.json:71-73` — `@grafana/*` 13.0.1.
- `docker/grafana/provisioning/datasources/*.yaml` — provisioned datasources (name/uid); `tests/testflows/tests/automated/e2e.py:18` — `gh_api_check` (note: pre-#907 on this branch).
- `tests/testflows/README.md` — run instructions; live watch at `localhost:4444` (password `secret`).
