# Issue #786 — Implement e2e tests parallelization

Deep-dive analysis against the codebase at `/Users/lunaticus/Documents/Work/clickhouse-grafana` (branch `feature/advanced-logs-field-settings`).

- Repo: Altinity ClickHouse datasource plugin for Grafana (TypeScript frontend + Go backend).
- Issue: <https://github.com/Altinity/clickhouse-grafana/issues/786>
- Status at time of writing: **OPEN**, author `Slach` (Eugene Klimov), milestoned. **The issue body is empty and there are zero comments** — the title "implements e2e tests parallelization" is the entire specification.

> ⚠️ **Scope-alignment warning.** The task brief that produced this document assumed a **Playwright** e2e stack (`playwright.config.ts`, `tests/e2e/*.spec.ts`, `auth.setup.ts`, `fixtures/clickhouse.ts`, `fullyParallel`, `workers`). **None of that exists in this repository.** A GitHub code search for `playwright` across `Altinity/clickhouse-grafana` returns `total_count: 0`; `package.json` has no `@playwright/*` dependency; there is no `playwright.config.ts` on any branch (checked all local branches and remote `master`). The real e2e layer is **TestFlows** (Python + Selenium) under `tests/testflows/`, plus a vestigial, unused Cypress/`grafana-e2e` hook. This document analyzes the **actual** infrastructure and what "parallelization" concretely means for it. Everything below is grounded in real files.

---

## 0. TL;DR

**Current state.** e2e = TestFlows (Python/Selenium WebDriver against a remote Selenium container). 18 automated suites live in `tests/testflows/tests/automated/`. **Parallelization already exists at the CI level:** `.github/workflows/testflows.yml:96-120` runs a GitHub Actions matrix of `18 suites × 2 Grafana versions` (`fixed` + `latest`) as independent jobs with `fail-fast: false`. Wall-clock CI time is **~15–16 min** (from `gh run list` on `testflows.yml`), i.e. the matrix already collapses what would be a ~1.5–2h serial run into the length of the single slowest suite. This CI matrix was landed in PR #866 ("try to parallelize test jobs", merged) and PR #893 ("run suites against fixed + latest Grafana in parallel", merged); PR #868 ("Test parallel v2") was closed.

**What blocks going further (in-process / same-machine parallelism).** Everything downstream of `regression.py` assumes a **single shared world**: one Grafana instance on the fixed host port `3000`, one ClickHouse on fixed ports `8123/9000`, **one** Selenium WebDriver session created once in `regression()` and shared by every suite, one Grafana login performed once, and **fixed literal names** for every datasource (`clickhouse`, `test_alerts_unified`, `mixed_1`, `mixed_2`, …) and dashboard (`mixed`, `default_values`, …). Two suites run at the same time would collide on the browser session, on datasource/dashboard names, and on the same `default` ClickHouse database. Screenshot assets in `tests/testflows/screenshots/` are shared filenames written and read by tests.

**Recommendation.** Two independent tracks, do the cheap one first:

- **Track A — sharding the existing CI matrix further (LOW effort, recommended first).** The matrix is one-job-per-suite. The three heaviest suites (`functions`, `macros`, `e2e`) dominate wall-clock. Split those into sub-shards and/or move the `latest` (non-required) leg to a scheduled run. Effort: **Small**. Speedup: shave the tail from ~15 min toward ~8–10 min; also cuts total runner-minutes if the `latest` leg is de-scoped from every PR.
- **Track B — intra-process parallelism inside a single TestFlows run (HIGH effort).** Run N suites concurrently against **one** Grafana by giving each concurrency unit its own WebDriver session, per-worker unique datasource/dashboard names, and (where a suite writes data) a per-worker ClickHouse database. This is what "parallelization" would mean if the goal is to speed a *local* `regression.py` run rather than CI. Effort: **Large** (fixtures + naming refactor across ~18 suites + shared-state isolation). Speedup on a single beefy machine: 3–5× depending on Selenium node count.

**Expected speedup / effort summary.** Track A: Small effort, ~1.5–2× on CI tail. Track B: Large effort, 3–5× locally. If the maintainer's intent (given they authored the already-merged CI-matrix PRs) is "make CI faster," Track A is the direct continuation. If the intent is "make TestFlows itself concurrency-capable," Track B is required and this document's shared-state inventory is the blueprint.

---

## 1. Map of all relevant code / config

| Location | Symbol / role | Notes |
|---|---|---|
| `.github/workflows/testflows.yml:96-120` | CI matrix (`strategy.matrix.suite` × `strategy.matrix.grafana`) | **The existing parallelization.** 18 suites × 2 Grafana versions, `fail-fast: false`. |
| `.github/workflows/testflows.yml:82-91` | `tests` job header | `runs-on: ubuntu-latest`; a commented `self-hosted … type-cpx41` line (:85) shows a larger runner was considered. `timeout-minutes: 60`. |
| `.github/workflows/testflows.yml:22-80` | `prepare-frontend-build` / `prepare-backend-build` | Build once, upload artifacts; test jobs download them (`SKIP_BUILDERS: "1"`, :94). |
| `.github/workflows/testflows.yml:152-161` | suite invocation | `python3 regression.py --suite ${{ matrix.suite.name }}` — **one suite per job**. |
| `.github/workflows/testflows.yml:118-120` | Grafana versions | `fixed` (`12.4.0-…`, `required: true`) and `latest` (`required: false`, `continue-on-error`). |
| `.github/workflows/ci.yml:86-104` | legacy Cypress hook | Guarded by `if [ -d "cypress" ]`; **there is no `cypress/` dir**, so this never runs. `package.json:14-15` `e2e` scripts are dead. |
| `tests/testflows/regression.py:70-179` | `regression()` `@TestModule` | The single entry point. Creates cluster, **one** driver, logs in **once**, then runs suites **sequentially** in a `for` loop (:151-153). |
| `tests/testflows/regression.py:81-88` | shared context | `self.context.driver`, `self.context.endpoint = http://grafana:3000/`, `global_wait_time=30`. One browser, one Grafana. |
| `tests/testflows/regression.py:90-94` | `--suite` filter | Comma-separated suite selector; how CI runs one suite per job. |
| `tests/testflows/regression.py:130-148` | `main_suites` list | The 17 always-on suites (order = serial execution order). |
| `tests/testflows/regression.py:155-175` | `legacy_alerts` special-case | Switches `self.context.endpoint` to a **different** Grafana (`grafana_legacy_alerts:3000`, Grafana 10.4.3) mid-run. Mutates shared context. |
| `tests/testflows/steps/cluster.py:44-93` | `Cluster` | Wraps `docker compose … --profile test`. Single compose project. |
| `tests/testflows/steps/cluster.py:114-137` | `bash()` | **Thread-local** bash shells keyed by `f"{thread.ident}-{node}"` — the cluster layer is already thread-aware, but nothing above it uses threads. |
| `tests/testflows/steps/cluster.py:181-266` | `up()` | Brings up compose; in GH mode uses `SKIP_BUILDERS`. Starts `selenium-standalone`. |
| `tests/testflows/steps/ui.py:83-185` | `webdriver()` | Creates a **remote** Chrome session against `http://localhost:4444` (single Selenium standalone, **not** a grid). One session per run. |
| `tests/testflows/steps/ui.py:27-41,178-179` | `append_session()` + `sessions.json` | Every run appends `{session_id: suite}` into the shared `tests/testflows/assets/sessions.json`. |
| `tests/testflows/steps/ui.py:255-270` | `save_coverage()` | Reads `window.__coverage__` from the shared browser and writes timestamped files to `coverage/raw/`. Depends on the one shared page context. |
| `tests/testflows/steps/login/view.py:85-103` | `login()` | Single admin login, done once in `regression()` (:127-128). All suites reuse this session/cookies. |
| `tests/testflows/steps/actions.py:195-492` | `create_new_altinity_datasource()` | Creates a datasource **by name** via the UI, `yield`, then deletes it by that same name in `finally`. Names are caller-supplied literals. |
| `tests/testflows/steps/actions.py:79-109` | `create_dashboard()` | Creates a dashboard **by name**, `yield`, deletes by name in `finally`. |
| `tests/testflows/steps/actions.py:22-76,117-192` | screenshot compare/check | Reads fixed-name PNGs from `tests/testflows/screenshots/`. |
| `docker-compose.yaml:12-40` | `clickhouse` service | Fixed host ports `8123/9000/5432/3306`; schema mounted from `init_schema.sql`. |
| `docker-compose.yaml:54-81` | `grafana` service | Fixed host port `3000`; plugin mounted from `dist/`. |
| `docker-compose.yaml:83-111` | `grafana_legacy_alerts` | `profiles: [test]`, host port `3002`, Grafana 10.4.3 (used only by `legacy_alerts`). |
| `docker-compose.yaml:113-137` | `grafana_external_install`, `trickster` | Aux services on `3001` / `8480`. |
| `docker/clickhouse/init_schema.sql:1-404` | seed data | Creates & fills all `default.*` and `test.*` tables **once** at container init. Tests mostly **read** these. |

---

## 2. What "the e2e suite" actually is (and why the brief was wrong)

The brief described Playwright. Reality:

1. **TestFlows** (`testflows.core`) is the real e2e framework — a Python DSL (`@TestModule`, `@TestFeature`, `@TestScenario`, `with Given/When/Then`). It drives Grafana through **Selenium WebDriver** against a `selenium-standalone` container. Suites are Python modules under `tests/testflows/tests/automated/` loaded by name via `load(module_path, "feature")` (`regression.py:153`).
2. **Cypress / `@grafana/e2e`** is referenced only by dead `package.json` scripts (`:14-15`) and a dormant `ci.yml` branch gated on a non-existent `cypress/` directory (`ci.yml:86-104`). It does nothing today.
3. **Playwright**: absent entirely.

So "e2e tests parallelization" can only mean **TestFlows** parallelization. The confusion in the brief (mentions of `fullyParallel`, `workers`, `storageState`) maps onto TestFlows concepts as: TestFlows `Pool`/`parallel` executors ≈ `workers`; a per-run login/session ≈ `storageState`; suite modules ≈ spec files.

---

## 3. Shared-state inventory (the real blockers)

This is the core deliverable: every source of shared mutable state that prevents two suites (or two scenarios) from running concurrently against **one** Grafana + **one** ClickHouse, and the isolation strategy for each. It applies to **Track B** (intra-process). Track A (more CI shards) sidesteps most of this because each shard is a *fresh, isolated compose stack*.

| # | Shared resource | Where | Who mutates it | Collision risk if parallel | Isolation strategy |
|---|---|---|---|---|---|
| 1 | **Single WebDriver / browser session** | `regression.py:119` creates one `self.context.driver`; every suite uses `self.context.driver`. | All suites. | **Fatal** — two suites issuing clicks/navigations to the same tab. | Per-worker driver: move driver creation out of `regression()` into a **worker-scoped** fixture so each concurrency unit gets its own Selenium session. Requires N Selenium nodes → switch `selenium-standalone` to `selenium-hub` + `node-chrome` replicas (Selenium Grid). |
| 2 | **Single Grafana login / cookies** | `regression.py:127-128` logs in once; session cookies live in the one browser. | Setup. | Follows (1): each new driver session needs its own login. | Log in inside the per-worker driver fixture (mirror of a Playwright `storageState` per worker). Admin user is shared and read-mostly, so concurrent logins as `admin/admin` are fine. |
| 3 | **Fixed datasource names** | `create_new_altinity_datasource(datasource_name=…)` — literals: `clickhouse` (×5), `test_alerts_unified` (×3), `test_alerts_legacy` (×5), `dropdown_variable_values`, `preview_variable_values`, `reformatted_query_for_variable`, `mixed_1`, `mixed_2`, `test_default_adhoc`, `default_values`, `default_values_context_window`, and ~20 `data_source_setup_connections` names (`test_basic_auth_success`, `test_with_tls_client_auth_success`, …). Full list from `grep datasource_name=` in §Appendix. | `actions.py:195-492`, per suite. | **High** — Grafana datasource names are global; two suites creating `clickhouse` collide; deletion in one suite's `finally` removes the other's. | Make the name **worker/run-unique**: `f"{base}_{worker_id}"` (or a uuid suffix). Because create-and-delete are paired in the same `try/finally`, a suffix keyed on the executing worker fully isolates them. The datasource *content* (all point at `http://clickhouse:8123`) is identical, so only the name must change. |
| 4 | **Fixed dashboard names** | `create_dashboard(dashboard_name=…)` and `dashboards.open_dashboard(dashboard_name=…)` — literals: `mixed`, `default_values`, `default_adhoc`, `variable_dropdown`, `"$conditionalTest 3 params issue 869"`, `"Annotation event_time"`, etc. | `actions.py:79-109`, per suite. | **High** — dashboard titles collide; `open_dashboard` may open the wrong one. | Same as (3): suffix created-dashboard names per worker. **Caveat:** provisioned dashboards opened by fixed name (`dashboard-gh-api`, `ClickHouse Queries Analysis`, `Annotation event_time`, `Test Logs support`) come from `docker/grafana/dashboards/` and are **read-only** — those are safe to share (multiple readers). Only *test-created* dashboards need unique names. |
| 5 | **Shared ClickHouse `default` database (writes)** | `data_source_setup.py:222,236` `INSERT INTO default.test_alerts …`; `init_schema.sql` seeds all tables. | `data_source_setup_*` insert rows; alert suites read `default.test_alerts`. | **Medium** — an INSERT during another suite's read of `test_alerts` changes row counts / alert firing. | For write-heavy suites, create a **per-worker database** (`default_w{N}`) and point that worker's datasource at it, or use per-worker table names. Most suites are **read-only** against seeded tables (see §4) and are safe to share the `default` DB concurrently. |
| 6 | **`legacy_alerts` mutates `self.context.endpoint`** | `regression.py:155-175` swaps the endpoint to `grafana_legacy_alerts:3000` and re-logs-in **in the shared context**. | The `legacy_alerts` suite. | **Fatal for shared context** — flips every other suite's Grafana mid-run. | Keep `legacy_alerts` in its **own serial group / own worker** with its own driver+endpoint; never co-schedule it with `main_suites` on a shared context. In CI matrix (Track A) this is already isolated (separate job). |
| 7 | **Shared screenshot files** | `tests/testflows/screenshots/*.png` (e.g. `gh-api_panel.png`, `event_tme_panel.png`, `toUInt64_panel.png`). Written by `take_screenshot_*`, read by `compare_screenshots*`/`check_screenshot*` (`actions.py:22-192`). | Multiple suites write same filenames. | **High** — two suites writing `gh-api_panel.png` race; a compare reads a half-written or wrong image. | Namespace screenshot filenames per worker/scenario (`f"{name}_{worker_id}"`), or write to a per-worker temp dir. These are transient captures, **not** golden snapshots, so renaming is safe. |
| 8 | **`sessions.json`** | `tests/testflows/assets/sessions.json` read-modify-written by `append_session()` (`ui.py:27-41`). | Every driver teardown. | **Low/Medium** — concurrent read-modify-write can lose entries (it's diagnostic metadata for Selenium video mapping). | Guard with a lock, or append per-worker files and merge. Non-blocking for correctness of tests. |
| 9 | **Coverage raw dir** | `coverage/raw/coverage<timestamp>.json` (`ui.py:255-270`). | Every `save_coverage()` call from the shared page. | **Low** — timestamped unique filenames already avoid clobber; but coverage is captured from *the* browser page, so per-worker drivers each capture their own → fine. | No change beyond per-worker drivers. |
| 10 | **Fixed docker host ports** | `docker-compose.yaml` `3000/8123/9000/3002/3001/8480`. | The compose stack. | **Only** blocks running **two full stacks** on one host (relevant to Track A local sharding). Irrelevant to Track B (one stack, many browser sessions). | For multiple stacks per host: parametrize ports via `COMPOSE_PROJECT_NAME` + `.env` port offsets, or rely on CI giving each shard its own runner (current behavior). |
| 11 | **`ffails`/`xfails` global maps** | `regression.py:40-65` keyed by full test path. | Module-level. | None (read-only). | No change. |

---

## 4. Per-suite classification (safe-to-share vs needs-isolation)

Classification is for **Track B** (running suites concurrently against one Grafana). "Reads seeded tables" = safe to share the `default` DB. "Creates DS/dashboard" = needs unique names (#3/#4). "Writes CH" = needs per-worker DB (#5).

| Suite (`main_suites`) | Creates datasource? | Creates dashboard? | Writes ClickHouse? | Screenshots? | Bucket |
|---|---|---|---|---|---|
| `window_functions` | reuses provisioned `clickhouse` | maybe | no | possibly | share DB; unique DS if it creates one |
| `sql_editor` | uses provisioned DS | no (raw editor) | no (reads `numbers()`) | no | **safe to parallelize** (read-only) |
| `data_source_setup_connections` | **many** (~20 named DS) | no | no | no | **needs unique DS names** (#3) — highest name-collision surface |
| `data_source_setup_defaults` | several named DS | some | no | no | needs unique DS names |
| `e2e` | `mixed_1`, `mixed_2` + reads provisioned dashboards | `mixed` + reads `dashboard-gh-api`, `ClickHouse Queries Analysis`, `Annotation event_time` | no | yes (`gh-api_panel`, `event_tme_panel`, `toUInt64_panel`) | needs unique DS/dashboard/screenshot names (#3,#4,#7) |
| `query_options` | uses provisioned DS | maybe | no | maybe | share DB; unique names if created |
| `functions` | uses provisioned DS | no | no (reads `traffic`, `requests`, etc.) | possibly | **safe** (read-only); heaviest suite → shard candidate |
| `macros` | uses provisioned DS (`macros.py:32` asserts `default.test_alerts`) | maybe | no | no | share DB (read `test_alerts`) |
| `adhoc_macro` | `test_default_adhoc` | `default_adhoc`, `"AdHoc …"` | no | no | needs unique names |
| `unified_alerts` | `test_alerts_unified` (`unified_alerts.py:146`) | alert folders/rules (global!) | no (reads `test_alerts`) | no | **needs isolation** — creates **Grafana alert folders/rule groups** (global objects) |
| `template_variables_editor` | `dropdown_variable_values`, `preview_variable_values`, `reformatted_query_for_variable` | `variable_dropdown`, etc. | no | no | needs unique names |
| `conditional_test` | uses DS | `"$conditionalTest 3 params issue 869"` (×4) | no | no | needs unique dashboard name |
| `search_filter` | uses DS | maybe | no | no | mostly safe |
| `flamegraph_and_tracing` | uses DS | maybe | no (reads `numbers()`) | maybe | mostly safe |
| `limited_access` | uses `grafana_limited` CH user (from `init_schema.sql:9`) | maybe | no | no | share (read-only, dedicated CH user) |
| `worldmap_and_table_format` | uses DS | maybe | no | yes | unique screenshot names |
| `log_context` | uses DS (reads `test_logs*`) | maybe | no | maybe | share DB (read-only) |
| `legacy_alerts` (special) | `test_alerts_legacy` (`legacy_alerts.py:285`) | alert rules | no | no | **must be its own serial group** (#6 — swaps Grafana instance) |

**Takeaway:** the majority of suites are **read-only** against pre-seeded tables and become parallel-safe once (1) each gets its own browser session and (2) any datasource/dashboard/screenshot it *creates* is name-namespaced. The genuinely tricky ones are `unified_alerts`/`legacy_alerts` (global alerting objects + instance swap) and `data_source_setup_*` (large DS-name surface).

---

## 5. Step-by-step implementation plan

The suite must stay green at every step. Do Track A first (cheap, independent), then Track B if intra-process speed is required.

### Track A — extend the existing CI matrix (Small, recommended)

The matrix already parallelizes per-suite. Improvements, each independently shippable:

**A1. Balance the matrix by splitting the heaviest suites.** `functions`, `macros`, and `e2e` are the long poles. Add a `shard` dimension for those, e.g. add `--scenario`/`--pattern` support to `regression.py`'s `argparser` (`regression.py:17-38`) so a job can run a subset of a feature's scenarios, then create matrix entries `functions-1of3`, `functions-2of3`, … This shortens the tail (currently ~15 min) toward the next-longest suite.
- Risk: needs a scenario-filter mechanism (TestFlows `--only`/pattern). Low.

**A2. Move the non-required `latest` Grafana leg off every PR.** `.github/workflows/testflows.yml:118-120` runs `latest` on every PR with `continue-on-error`. Gate it behind `if: github.event_name == 'schedule'` (nightly) or a label, keeping only `fixed` on PRs. Halves runner-minutes and removes flaky-`latest` noise from PRs. No wall-clock change on PRs (jobs already run in parallel), but big cost savings.
- Risk: lose per-PR `latest` signal — acceptable since it's already non-required.

**A3. Consider the larger self-hosted runner.** `testflows.yml:85` has a commented `self-hosted … type-cpx41` runner. On a bigger runner each suite runs faster; combined with A1 this compounds. Purely infra.

**A4. Fail-fast tuning.** Keep `fail-fast: false` (correct for a test matrix) but add a required/optional split so the `latest` failures never block merges (already partially done via `required` flag + `continue-on-error`).

Verification for Track A: open a PR, confirm the Actions run shows the new shard jobs, and that total wall-clock drops. No test-logic change → no flakiness risk.

### Track B — intra-process parallelism inside `regression.py` (Large)

Goal: `python3 regression.py` runs multiple suites concurrently on one machine. Ordered so each step keeps the suite runnable.

**B0. Prerequisite — Selenium Grid.** Replace the single `selenium-standalone` with `selenium-hub` + `node-chrome` replicas (compose service with `deploy.replicas: N` or multiple named nodes). Each worker gets a session from the hub. Without this, N browser sessions can't run. (`ui.py:113-120` already targets a hub URL `http://localhost:4444`, so the client side barely changes.)

**B1. Per-worker driver+login fixture.** Move `ui.create_driver()` + `login.login()` (`regression.py:119-128`) out of the module scope into a **worker-scoped** context so each parallel unit owns a `driver` and its own logged-in session. Store it on a per-worker context, not `self.context.driver`. This is the analogue of a Playwright per-worker `storageState`.

**B2. Introduce a `worker_id` and a naming helper.** Add a helper `unique(name)` → `f"{name}_{worker_id}"` used by `create_new_altinity_datasource` (`actions.py:195`), `create_dashboard` (`actions.py:79`), and screenshot names (`actions.py:22-192`). Thread `worker_id` through the context. Provisioned (read-only) dashboard names stay literal.

**B3. Convert `main_suites` execution to a TestFlows parallel pool.** Replace the serial `for` loop (`regression.py:151-153`) with a TestFlows `Pool(N)`/`parallel` executor that schedules each `Feature` on a worker, each bound to its own driver from B1. Start with **N=2** and only the read-only suites (`sql_editor`, `functions`, `flamegraph_and_tracing`, `log_context`, `limited_access`) to prove the model, everything else still serial.

**B4. Isolate write/global-object suites.** Put `data_source_setup_connections`, `data_source_setup_defaults`, `unified_alerts`, `adhoc_macro`, `template_variables_editor`, `conditional_test`, `e2e` into the pool only after B2 name-namespacing is verified. Give `unified_alerts`/`legacy_alerts` a **dedicated serial group** because they create global Grafana alerting objects and (legacy) swap the Grafana instance (#6). Consider unique alert-folder names too.

**B5. Per-worker ClickHouse DB for writers.** For `data_source_setup_*` (the only INSERTers, `data_source_setup.py:222,236`), create `default_w{N}` (or unique table names) at worker start and point that worker's DS at it. All other suites keep reading the shared seeded `default`.

**B6. Serialize `sessions.json` writes.** Wrap `append_session()` (`ui.py:27-41`) in the cluster lock (`cluster.py:94` already exposes `threading.Lock`) or write per-worker files merged at the end.

**B7. Ramp N.** Increase pool size to match Selenium node count; measure flakiness (§6).

---

## 6. Verification plan (proving no flakiness)

- **Baseline first.** Record current serial single-machine time and current CI wall-clock (`gh run list --workflow=testflows.yml` shows ~15–16 min today) so speedup is measurable.
- **Repeat-run for stability.** After each Track-B step, run the newly-parallelized subset **N times** back-to-back (e.g. loop `regression.py --suite sql_editor,functions,log_context` 10×) and require 10/10 green. TestFlows has no `--repeat-each`; wrap in a shell loop. Any single failure = a shared-state leak not yet isolated.
- **Stress the name-collision fix.** Deliberately run two suites that both create datasources (e.g. `e2e` + `data_source_setup_connections`) concurrently and assert both pass and that no orphan datasources/dashboards remain (query the Grafana API for leftover `mixed_1`, `clickhouse`, etc. after the run — the `finally` deletes must be worker-scoped).
- **Cross-check reads under concurrent writes.** Run an alert suite (reads `default.test_alerts`) concurrently with `data_source_setup_*` (writes `default.test_alerts`) *before* B5, observe the expected flake, then confirm B5 (per-worker DB) removes it. This proves #5 is the cause.
- **CI parity.** For Track A, push a branch and confirm the matrix expands to the new shard jobs and that `fail-fast: false` still lets independent suites report individually.
- **Screenshot isolation.** After B2, grep the run's captured PNGs to confirm each worker wrote its own namespaced files (no two workers wrote `gh-api_panel.png`).

---

## 7. Risks / edge cases

| Risk | Detail | Mitigation |
|---|---|---|
| **Selenium node exhaustion** | Track B needs N browser nodes; a single `selenium-standalone` serves one session well but chokes on many. | Move to Selenium Grid (B0); size nodes = pool N; each node needs RAM/CPU headroom (`--disable-dev-shm-usage` already set, `ui.py:141`). |
| **ClickHouse container resources** | `init_schema.sql` seeds large tables (`test_timezone` 86 400 rows, `test_lttb`/`test_timestamp_formats` 86 400 rows each, `streaming_test` + a `REFRESH EVERY 2 SECOND` materialized view `:390-403`). Concurrent read load multiplies memory pressure; `low_memory.xml` is mounted (`docker-compose.yaml:25`). | Cap pool N to what the CH container can serve; the streaming MV keeps mutating `streaming_test` continuously — any suite asserting on `streaming_test` row counts is inherently time-sensitive and must not be parallelized with strict-count assertions. |
| **Grafana as the single shared instance** | Even with per-worker browser sessions, all workers hit one Grafana process; alert evaluation, provisioning reload, and datasource CRUD are global. | Keep alerting suites in a dedicated serial group (B4); rely on worker-unique names for CRUD isolation; don't parallelize provisioning-affecting operations. |
| **`legacy_alerts` instance swap** | `regression.py:155-175` mutates `self.context.endpoint` to a second Grafana mid-run. | Isolate to its own worker/serial group with its own context; never share context (#6). Already isolated in CI (separate matrix job). |
| **Screenshot races** | Shared PNG filenames (#7). These are transient captures, not golden snapshots, so there are **no snapshot-diff conflicts** in the Playwright sense — the risk is purely file-write races. | Namespace per worker (B2). |
| **Global alerting objects** | `unified_alerts` creates folders/rule groups by fixed name (`actions.py:setup_unified_alerts` defaults `test_alert_folder`/`test_alert_group`). Two workers collide. | Unique folder/group names per worker, or keep alerting serial. |
| **Grafana login rate/session limits** | Multiple concurrent `admin/admin` logins. | Grafana allows many admin sessions; low risk. Optionally reuse one auth token across workers if login proves flaky. |
| **CI cost vs. speed (Track A)** | Sharding multiplies job count → more runner-minutes even as wall-clock drops. | Pair A1 (shard) with A2 (drop `latest` from PRs) to keep total minutes bounded. |
| **Scope mismatch** | If the maintainer literally intended to *introduce Playwright* and delete TestFlows, this plan is orthogonal. | The issue body is empty — **confirm intent with `Slach`** before large investment. Given they authored the merged CI-matrix PRs (#866, #893), "faster CI on the existing TestFlows stack" (Track A) is the most probable intent. |

---

## 8. Effort breakdown

| Sub-task | Track | Estimate |
|---|---|---|
| A1 — shard heavy suites (`functions`/`macros`/`e2e`) + `--scenario` filter in `regression.py` | A | 0.5–1 day |
| A2 — gate `latest` Grafana leg to nightly | A | 1–2 h |
| A3/A4 — runner + fail-fast tuning | A | 1–2 h |
| B0 — Selenium Grid in compose | B | 0.5 day |
| B1 — per-worker driver+login fixture | B | 1 day |
| B2 — `worker_id` + name-namespacing across actions | B | 1 day |
| B3 — TestFlows parallel pool for read-only suites | B | 1 day |
| B4 — isolate write/global-object suites | B | 1–2 days |
| B5 — per-worker ClickHouse DB for writers | B | 0.5–1 day |
| B6/B7 — sessions.json lock + ramp N + stabilize | B | 1–2 days |
| **Track A total** | | **~1–1.5 days (Small)** |
| **Track B total** | | **~6–9 days (Large)** |

**Final sizing.** Track A: **Small** — a direct continuation of the already-merged matrix work, low risk, immediate CI benefit. Track B: **Large** — real concurrency inside TestFlows, gated on the shared-state isolation in §3/§4 and a Selenium Grid; high value only if speeding *local* runs matters.

---

## 9. Recommendation

1. **Confirm intent with the issue author (`Slach`)** — the body is empty; is the goal (a) faster CI on the existing TestFlows stack, (b) real in-process TestFlows concurrency, or (c) a migration to Playwright? This changes everything.
2. If (a): implement **Track A** (§5) — small, safe, ships this week.
3. If (b): implement **Track A first**, then **Track B** using the shared-state inventory (§3) and per-suite classification (§4) as the isolation blueprint, ramping the parallel pool from read-only suites outward.
4. If (c): this is a separate greenfield effort (add `@playwright/test`, port suites) — out of scope for the current infrastructure and much larger than either track; the shared-state inventory (§3/§4) still applies because a Playwright port would hit the exact same Grafana/ClickHouse collisions and would use `test.describe.configure({ mode })`, per-worker fixtures, and unique names to solve them.

---

## Appendix — evidence commands

- Playwright absence: `gh api "search/code?q=repo:Altinity/clickhouse-grafana+playwright"` → `total_count: 0`; no `playwright.config.ts` in `git ls-files` or on `master` (`gh api …/git/trees/master?recursive=1`).
- Issue is empty: `gh issue view 786 --json body,comments` → `"body":"", "comments":[]`.
- Related merged PRs: #866 "try to parallelize test jobs", #893 "run suites against fixed + latest Grafana in parallel"; closed #868 "Test parallel v2" (`gh pr list --search "parallel in:title"`).
- CI duration: `gh run list --workflow=testflows.yml` → recent successful runs ~15–16 min.
- Datasource-name surface: `grep -rn "datasource_name=" tests/testflows/tests/automated/` (28 distinct literals; top: `clickhouse`, `test_alerts_legacy`, `test_alerts_unified`, `mixed_1/2`, `dropdown_variable_values`, ~20 `data_source_setup_connections` names).
- Dashboard-name surface: `grep -rn "dashboard_name=" tests/testflows/tests/automated/`.
- ClickHouse writes by tests: `grep -rniE "insert into|create table" tests/testflows/tests` → only `data_source_setup.py:222,236` (`INSERT INTO default.test_alerts …`).
</content>
</invoke>
