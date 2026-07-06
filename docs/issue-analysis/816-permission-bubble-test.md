# Issue #816 — test for the "permission bubble" when the datasource user lacks rights to fetch autocomplete data

Deep-dive analysis + test-implementation plan against the codebase at `/Users/lunaticus/Documents/Work/clickhouse-grafana` (branch `feature/advanced-logs-field-settings`).

- Repo: Altinity ClickHouse datasource plugin for Grafana (TypeScript frontend + Go backend).
- Issue: <https://github.com/Altinity/clickhouse-grafana/issues/816>
- Title: *"need test for check permission bubble for not enough permissions to get auto-complete data"*
- Status at time of writing: **OPEN**, author `Slach` (Eugene Klimov). No comments.
- Full issue body (verbatim): *"Add test case which will open /dashboards/test_limited_permissions.json and check red message box about permssions missing"* (sic — "permssions").

---

## 0. TL;DR

**What the test must cover.** The datasource user `grafana_limited` (created by `docker/clickhouse/init_schema.sql:1-15`) has `SELECT` only on `default.*` and **no** access to the `system` database. When the ClickHouse query editor opens in **SQL mode** for a panel that uses the `clickhouse-limited` datasource, the frontend fires an autocomplete introspection query against `system.functions/system.tables/system.columns/…` (`src/views/QueryEditor/hooks/useAutocompletionData.ts:6-40`). That query fails with a ClickHouse `ACCESS_DENIED` (code 497 / "Not enough privileges"). The failure is caught, classified as a permission error (`src/utils/clickhouseErrorHandling.ts:40-68`), and surfaces as a **red Grafana `Badge`** reading **"Autocomplete unavailable - insufficient permissions to access system tables"** (`src/views/QueryEditor/components/QueryHeader/QueryHeader.tsx:79-87`). That red badge is the "red message box about permissions missing" from the issue. The test must open the provisioned dashboard `test_limited_permissions.json`, edit one of its panels, switch the editor to SQL mode, and assert that this red badge appears (and that the editor does not hang or throw an uncaught error).

**Key correction to the task framing.** This repo does **not** currently use Playwright for e2e. `playwright.config.ts` does **not** exist; `@grafana/plugin-e2e` is **not** installed; `tests/e2e/` contains only `tests/e2e/visual/ci/github-actions-integration.yml`. The `package.json` `e2e` script (`package.json:14-15`) shells out to `cypress` + `grafana-e2e`, but the **actual, maintained e2e suite is TestFlows + Selenium (Python)** under `tests/testflows/`. The CLAUDE.md description of a Playwright suite is aspirational / not yet realized. **The recommended implementation therefore adds a TestFlows scenario** to the existing, already-registered `limited_access` feature (`tests/testflows/tests/automated/limited_access.py`, registered in `tests/testflows/regression.py:145`). A Jest-based frontend variant is a viable lighter alternative (see §5).

**Current-behavior status.** The permission bubble **already works** in the product code (the graceful-fallback + red-badge path was added alongside the issue #813 work — commit `80effbd7` era). So this issue is a **test-only** task: no product code needs to change. There is one nuance to de-risk (§4.2): the badge is cached in IndexedDB for 10 minutes per datasource uid, which can make the test flaky across runs; the test should not depend on cache state.

**Recommendation: IMPLEMENT as a TestFlows scenario** in `limited_access.py`. **Effort: SMALL (~0.5 day)** — the dashboard, the restricted user, the datasource, and all the TestFlows navigation/panel/SQL-editor step helpers already exist; the new scenario is ~40 lines plus one tiny selector helper.

---

## 1. Map of all relevant code (file:line)

### 1.1 Fixtures & provisioning that ALREADY exist (no new infra needed)

| Location | Symbol / content | Role |
|---|---|---|
| `docker/clickhouse/init_schema.sql:1-15` | `CREATE USER grafana_limited IDENTIFIED BY 'grafana_limited_password'; GRANT USAGE ON *.*; GRANT SELECT ON default.*` | The restricted CH user. **No** grant on `system.*` → autocomplete introspection is denied. |
| `docker/grafana/provisioning/datasources/clickhouse-limited.yaml:1-18` | datasource `name: clickhouse-limited`, `uid: clickhouse-limited`, `basicAuthUser: grafana_limited`, `basicAuthPassword: grafana_limited_password` | The provisioned Grafana datasource that uses the restricted user. |
| `docker/grafana/dashboards/test_limited_permissions.json` | dashboard `uid: test-limited-permissions`, title `Test Limited Permissions (Issue #813)`, 8 panels, all `datasource.uid = clickhouse-limited` | The exact dashboard the issue names. Panels: "Basic Query - No System Table Access Required" (id 1, `timeseries`), "Table Query - Works Without System Tables" (id 2), "Grouped Time Series - No System Access Needed" (id 3), "Logs Panel - Works Without System Tables" (id 4), "Total Records" (id 5, stat), "Services Distribution" (id 6, piechart), "Top Countries" (id 7, bargauge), "Alert Query Test" (id 8). |
| `docker-compose.yaml:12-40` | clickhouse service; mounts `init_schema.sql` → `/docker-entrypoint-initdb.d/`, `users.xml` → `/etc/clickhouse-server/users.d/`; env `CLICKHOUSE_ALWAYS_RUN_INITDB_SCRIPTS=true` | Creates the restricted user on container init. |
| `docker-compose.yaml:54-81` | grafana service; mounts `./docker/grafana/provisioning/` and `./docker/grafana/dashboards/` | Auto-provisions the datasource and dashboard. |

### 1.2 Frontend: autocomplete fetch → permission classification → red badge

| Location | Symbol | Role |
|---|---|---|
| `src/views/QueryEditor/QueryEditor.tsx:21` | `const { data: autocompleteData, hasPermissionError } = useAutocompleteData(datasource);` | Fires the autocomplete fetch **on editor mount** (both Builder and SQL mode; the hook is unconditional). |
| `src/views/QueryEditor/QueryEditor.tsx:66` | `hasAutocompleteError={hasPermissionError}` | Threads the permission-error flag into the header. |
| `src/views/QueryEditor/hooks/useAutocompletionData.ts:6-40` | `AUTOCOMPLETION_QUERY` | The big `SELECT … FROM system.functions UNION ALL … system.tables UNION ALL … system.columns …` — this is what the restricted user is denied. |
| `src/views/QueryEditor/hooks/useAutocompletionData.ts:68` | `datasource.metricFindQuery(AUTOCOMPLETION_QUERY)` | The actual network call. |
| `src/views/QueryEditor/hooks/useAutocompletionData.ts:89-104` | `catch` → `isPermissionError(error)` → `setHasPermissionError(true)` | The graceful-fallback branch that raises the flag. |
| `src/views/QueryEditor/hooks/useAutocompletionData.ts:48-58, 84-97` | IndexedDB keys `altinity_autocomplete_<uid>` and `altinity_autocomplete_permission_error_<uid>` (10-min TTL) | **Caching** — see risk §4.2. |
| `src/views/QueryEditor/components/QueryHeader/QueryHeader.tsx:79-87` | `{hasAutocompleteError && editorMode === EditorMode.SQL && (<Badge text="Autocomplete unavailable - insufficient permissions to access system tables" color="red" icon="exclamation-triangle" />)}` | **THE RED BUBBLE.** Rendered only when `hasAutocompleteError` is true **and** the editor is in SQL mode. |
| `src/utils/clickhouseErrorHandling.ts:7-18` | `PERMISSION_ERROR_CODES` (497 ACCESS_DENIED, 291 DATABASE_ACCESS_DENIED, 516, …) | Codes recognized as permission errors. |
| `src/utils/clickhouseErrorHandling.ts:20-33` | `PERMISSION_ERROR_PATTERNS` (`ACCESS_DENIED`, `Not enough privileges`, …) | Message substrings recognized as permission errors. |
| `src/utils/clickhouseErrorHandling.ts:40-68` | `isPermissionError(error)` | Classifier used by every autocomplete/introspection catch block. |

### 1.3 Other introspection paths that ALSO hit the same wall (context, not the primary target)

These are additional autocomplete/introspection callers that also degrade gracefully under the restricted user. The issue specifically names the SQL-mode badge, so these are secondary, but a reviewer may want the test to acknowledge them.

| Location | Symbol | Behavior under permission denial |
|---|---|---|
| `src/views/QueryEditor/hooks/useSystemDatabases.ts:5-41` | `GET_DATABASES_QUERY` (probes which `system.*` tables exist) → `metricFindQuery` | Catches, logs, returns `[]`, caches empty. No visible bubble. |
| `src/views/QueryEditor/components/QueryBuilder/hooks/useConnectionData.ts:21-168` | `buildExploreQuery('DATABASES'|'TABLES'|'COLUMNS'|…)` querying `system.databases/tables/columns` → `metricFindQuery` (`:138`) | Catches (`:140-162`), maps to `PermissionErrorContext`, returns `[]` → **Builder-mode dropdowns are empty** (no red bubble; the bubble is SQL-mode only). |
| `src/datasource/adhoc.ts:14, 31-52, 93-174` | `GetTagKeys`/`GetTagValues` querying `system.columns` | Catches `isPermissionError`, logs, returns `[]` → adhoc filters silently disabled. |
| `pkg/adhoc_columns.go:71-127` | `fetchColumnTypes` → `SELECT name,type FROM system.columns …` | Backend graceful fallback: returns `nil` on error, caches, does not fail the query. |

### 1.4 Existing e2e infrastructure (TestFlows / Selenium — the real suite)

| Location | Symbol | Role |
|---|---|---|
| `tests/testflows/tests/automated/limited_access.py` | `@TestFeature feature()` + 8 scenarios | **The file the new scenario belongs in.** Currently tests that panels *render* under #813 (positive path). Does **not** yet test the permission bubble. |
| `tests/testflows/regression.py:145` | `("limited_access", "testflows.tests.automated.limited_access")` | The feature is **already registered** in the module runner. A new scenario in the file is auto-picked up by `loads(current_module(), Scenario)` (`limited_access.py:385`). |
| `tests/testflows/steps/dashboards/view.py:130-143` | `open_dashboard(dashboard_name)` | Opens dashboards list, searches, clicks. |
| `tests/testflows/steps/dashboards/view.py:61-64` | `open_dashboard_view(dashboard_name)` | Clicks a dashboard by visible name. |
| `tests/testflows/tests/automated/limited_access.py:13-31` | `DASHBOARD_URL = "d/test-limited-permissions/…"` + `open_limited_permissions_dashboard()` | **Reuse this** — opens the target dashboard by URL and waits for the "Basic Query …" panel. |
| `tests/testflows/steps/dashboard/view.py:341-349` | `open_panel(panel_name)` → `open_dropdown_menu_for_panel` + `edit_panel` | Opens a panel in edit mode. |
| `tests/testflows/steps/dashboard/view.py:460-467` | `check_panel_exists(panel_name)` | Existence check used by the current scenarios. |
| `tests/testflows/steps/panel/view.py:117-124` | `go_to_sql_editor(query_name='A')` → `wait_sql_editor_toggle` + `click_sql_editor_toggle` | **Switches the editor to SQL mode** — this is what makes the SQL-only badge render. |
| `tests/testflows/steps/panel/view.py:482-495` | `click_back_to_dashboard_button`, `click_discard_button` | Cleanup used in `Finally` blocks. |
| `tests/testflows/steps/panel/view.py:288-299` | `check_panel_error_exists()` → waits for `[data-testid='data-testid Panel status error']` | Existing helper for **panel** errors (not the badge — different element; see §4.3). |
| `tests/testflows/steps/ui.py:203-215` | `wait_for_element_to_be_visible(select_type, element, timeout)` | Generic Selenium visibility wait — used to assert the badge. |
| `tests/testflows/steps/delay.py`, `steps/actions.py` | `delay()`, actions helpers | Standard scaffolding used throughout. |
| `tests/testflows/regression.py:150-156` | `self.context.grafana_version` set to `None` (latest) or `"10.4.3"` (legacy) | Version gating if selectors differ across Grafana versions. |

**No `data-testid` exists on the badge or QueryHeader** (grep of `src/views/QueryEditor/components/QueryHeader/` found none). The badge must be located by its **text** (see §4.3 for the exact selector).

---

## 2. Current behavior analysis (trace of what happens today under `grafana_limited`)

1. User opens `test_limited_permissions.json` and clicks Edit on, e.g., panel "Basic Query - No System Table Access Required" (id 1).
2. `QueryEditor` mounts (`src/views/QueryEditor/QueryEditor.tsx:16`). The panel's saved `editorMode` is not set in the dashboard JSON for panel 1, so it defaults to **Builder** (`QueryEditor.tsx:31` → `EditorMode.Builder`). **Important:** in Builder mode the badge does **not** render (`QueryHeader.tsx:79` requires `editorMode === EditorMode.SQL`). The test must explicitly switch to SQL mode.
3. On mount, `useAutocompleteData(datasource)` runs (`QueryEditor.tsx:21`). It first checks IndexedDB for a cached result or a cached permission-error flag (`useAutocompletionData.ts:48-66`). On a clean run there is no cache, so it calls `datasource.metricFindQuery(AUTOCOMPLETION_QUERY)` (`:68`).
4. The query `SELECT … FROM system.functions UNION ALL … system.tables … system.columns …` is proxied to ClickHouse as user `grafana_limited`. ClickHouse rejects it: the user has `GRANT SELECT ON default.*` only, so reading `system.functions` etc. returns **`Code: 497. DB::Exception: … Not enough privileges … ACCESS_DENIED`** (HTTP error surfaced by the plugin's Go client).
5. The rejected promise is caught (`useAutocompletionData.ts:89`). `isPermissionError(error)` returns `true` because the error message contains `ACCESS_DENIED` / `Not enough privileges` / `Code: 497` (`clickhouseErrorHandling.ts:52-67`). The hook sets `hasPermissionError = true`, sets `data = {}`, and caches the permission-error flag in IndexedDB for 10 minutes (`:94-97`).
6. `hasPermissionError` flows to `QueryHeader` as `hasAutocompleteError` (`QueryEditor.tsx:66`).
7. When the editor is in **SQL mode**, `QueryHeader` renders the red `Badge` with text "Autocomplete unavailable - insufficient permissions to access system tables" (`QueryHeader.tsx:79-87`). **This is the bubble.**
8. Query execution itself is unaffected: the panel's data query (`SELECT $timeSeries … FROM default.test_grafana …`) targets `default`, which the user **can** read, so the panel still shows data. The current `limited_access.py` scenarios assert exactly that (positive path). The bubble is orthogonal — it is about *autocomplete metadata*, not the panel's own query.

**Is current behavior buggy / does it need a pre-fix?** No. The badge path is implemented and correct. This is a pure test-authoring task. The only behavioral subtlety to design around is the **10-minute IndexedDB cache** of the permission-error flag (§4.2) — it is a *helping* factor (the badge re-appears from cache even faster on a second open within the browser session) but it makes the assertion order-dependent if a prior test cleared or populated the cache. The test should treat the badge's presence as the assertion and not assume a specific network round-trip occurs.

**Contrast with issue #813.** #813 = "plugin must *work* (panels render) with limited permissions" → tested by the 8 existing scenarios in `limited_access.py`. #816 = "plugin must *tell the user* (red bubble) that autocomplete is unavailable due to missing permissions" → **not yet tested**. #816 is the natural sibling scenario in the same feature file.

---

## 3. What the test must assert (acceptance criteria)

1. Open the provisioned dashboard `test_limited_permissions.json` (by URL `d/test-limited-permissions/…` — reuse `open_limited_permissions_dashboard()` at `limited_access.py:16-31`).
2. Edit any panel that uses the `clickhouse-limited` datasource (recommended: "Basic Query - No System Table Access Required", id 1 — it is the panel already waited-on by the helper).
3. Switch the query editor to **SQL mode** (`panel.go_to_sql_editor(query_name='A')`) — the badge is SQL-mode only.
4. Assert the **red permission badge is visible**, matching the exact text "Autocomplete unavailable - insufficient permissions to access system tables".
5. (Negative guard) Assert the editor did not crash: e.g. the SQL editor input (`[class='view-lines monaco-mouse-cursor-text']`) is present and no uncaught error overlay is shown. The panel's own visualization may still render data (that is fine and expected).
6. Cleanup: back-to-dashboard + discard changes (`Finally` block, mirroring the existing scenarios).

Optional stronger assertion: also confirm that in **Builder mode** the database/table dropdowns are empty (the `useConnectionData` fallback), demonstrating the two faces of the same permission denial. Lower priority; the issue only names the SQL-mode "red message box".

---

## 4. Step-by-step implementation plan (TestFlows — recommended)

Everything below is **test-only**. No product code, no new docker/provisioning files (the restricted user, datasource, and dashboard already exist).

### 4.1 The new scenario (add to `tests/testflows/tests/automated/limited_access.py`)

Add a scenario alongside the existing ones. It is auto-registered by `loads(current_module(), Scenario)` at `limited_access.py:385` — no change to `regression.py` needed.

Skeleton (follows the exact conventions of the existing scenarios in this file):

```python
from selenium.webdriver.common.by import By as SelectBy
import steps.ui as ui
import steps.panel.view as panel
import steps.dashboard.view as dashboard

# The visible text rendered by the red Grafana Badge in
# src/views/QueryEditor/components/QueryHeader/QueryHeader.tsx:79-87
PERMISSION_BADGE_TEXT = "Autocomplete unavailable - insufficient permissions to access system tables"

# XPath: any element whose text contains the badge message. Grafana's <Badge>
# renders the text inside a <span>; contains() tolerates surrounding markup.
PERMISSION_BADGE_XPATH = (
    f"//*[contains(normalize-space(.), '{PERMISSION_BADGE_TEXT}')]"
)


@TestScenario
def autocomplete_permission_bubble_is_shown(self):
    """Issue #816: with a datasource user lacking system-table access,
    the SQL editor must show a red 'Autocomplete unavailable ...' badge."""

    with Given("I open the limited permissions dashboard"):
        open_limited_permissions_dashboard()

    with And("I open the basic query panel in edit mode"):
        with delay():
            dashboard.open_panel(
                panel_name="Basic Query - No System Table Access Required"
            )

    try:
        with When("I switch the query editor to SQL mode"):
            with delay():
                panel.go_to_sql_editor(query_name="A")

        with Then("I see the red 'autocomplete unavailable' permission badge"):
            for attempt in retries(delay=3, timeout=30):
                with attempt:
                    with delay():
                        ui.wait_for_element_to_be_visible(
                            select_type=SelectBy.XPATH,
                            element=PERMISSION_BADGE_XPATH,
                            timeout=10,
                        )

        with And("I confirm the SQL editor itself did not crash"):
            with delay():
                ui.wait_for_element_to_be_present(
                    select_type=SelectBy.CSS_SELECTOR,
                    element="[class='view-lines monaco-mouse-cursor-text']",
                )

    finally:
        with Finally("I discard changes for panel"):
            with delay(after=0.5):
                panel.click_back_to_dashboard_button()

        with And("I discard changes for dashboard"):
            with delay(after=0.5):
                dashboard.discard_changes_for_dashboard()
```

Notes on the skeleton:
- `retries`, `delay`, `Given/When/Then/And/Finally`, `error()` come from the same imports the file already uses (`limited_access.py:1-11`).
- `open_limited_permissions_dashboard()` is defined at `limited_access.py:16-31` — reuse it verbatim.
- `panel.go_to_sql_editor(query_name="A")` is `tests/testflows/steps/panel/view.py:117-124`.
- `dashboard.open_panel`, `panel.click_back_to_dashboard_button`, `dashboard.discard_changes_for_dashboard` are all used by the existing scenarios in this file — copy their usage exactly.
- `ui.wait_for_element_to_be_visible` supports a `timeout` kwarg (`tests/testflows/steps/ui.py:203-215`).

### 4.2 De-risking the IndexedDB cache (10-min TTL)

`useAutocompletionData.ts` caches the permission-error flag under `altinity_autocomplete_permission_error_<uid>` for 10 minutes (`:49, :97`) and cleans up expired entries on mount (`:110`). Implications for the test:
- **Helps:** on a second open within 10 minutes the badge appears from cache without a network round-trip — so the assertion is robust to network timing.
- **Risk:** the badge could in principle be primed by a *previous* test in the same browser session, masking a regression where the live fetch path is broken. To keep the test honest and independent, prefer a **fresh browser session** (TestFlows opens a fresh Selenium session per feature run in this suite) or, if a hook is available, clear IndexedDB for the datasource before the scenario. In practice the existing suite does not manipulate IndexedDB, so the simplest robust choice is: **assert only on the badge's visibility** and rely on the fact that the very first open in a clean session must go through the live (denied) fetch. Do not assert on the *absence* of a network call.

### 4.3 Selector rationale (why text, not data-testid)

- The badge has **no `data-testid`** and **no `aria-label`** (`QueryHeader.tsx:79-87`; grep confirmed none in the QueryHeader dir). Adding one is a product change and out of scope for a test-only issue (though see §6 "open questions" — a one-line `data-testid` on the badge would make the test far more robust and is worth proposing to the maintainer).
- Grafana's `@grafana/ui` `<Badge>` renders the `text` prop inside a `<span>`. Matching by `contains(normalize-space(.), '<text>')` on `//*` is resilient to the exact tag/wrapper. Anchor on the **full** message string to avoid matching the panel description "With limited permissions, database/table/column dropdowns will be empty or limited" that lives in the dashboard JSON (panel id 3, `test_limited_permissions.json:201`) — the badge text is distinct from that description, so a full-string match is unambiguous.
- **Do not** reuse `check_panel_error_exists()` (`panel/view.py:288-299`): that matches `[data-testid='data-testid Panel status error']`, which is Grafana's *panel query* error indicator — a **different** element from the autocomplete badge. The panel's own query succeeds here (it reads `default.*`), so that indicator will **not** be present. Asserting on it would fail.

### 4.4 Running it

```bash
# bring up the stack (creates grafana_limited + provisions clickhouse-limited + dashboard)
docker compose up --no-deps -d grafana clickhouse
# for the selenium-based suite the compose 'test' profile brings up selenium-standalone
docker compose --profile test up -d selenium-standalone
# run just the limited_access feature (consult tests/testflows/README.md / regression.py for the exact invocation)
cd tests/testflows && python regression.py   # (feature is registered at regression.py:145)
```

Verify the badge manually first: `docker compose up --no-deps -d grafana clickhouse`, open `http://localhost:3000/d/test-limited-permissions/`, edit "Basic Query …", click the SQL editor toggle, and confirm the red badge text appears.

---

## 5. Alternative approach: Jest/RTL frontend unit test (lighter, complementary)

Because the whole path is client-side, the bubble can also be proven with a fast Jest + React Testing Library test with **no docker and no ClickHouse**, by mocking `datasource.metricFindQuery` to reject with an `ACCESS_DENIED` error and asserting the badge renders. This is cheaper and more deterministic than the e2e test, but it does not exercise the real ClickHouse permission wall or the dashboard the issue names.

Sketch (new file, e.g. `src/spec/query-header-permission-badge.spec.tsx` — note the repo currently has **no** Jest test for `QueryHeader`/`useAutocompletionData`; specs live in `src/spec/`):

```tsx
// Mount QueryEditor (or QueryHeader with hasAutocompleteError=true) in SQL mode.
// 1) Unit-level: render <QueryHeader ... editorMode={EditorMode.SQL} hasAutocompleteError={true} />
//    expect(screen.getByText(/Autocomplete unavailable - insufficient permissions/)).toBeInTheDocument();
// 2) Hook-level: mock datasource.metricFindQuery to reject with { message: 'Code: 497 ... ACCESS_DENIED' },
//    mock IndexedDBManager, render QueryEditor, switch to SQL mode, assert the badge text appears.
```

Caveats: `useAutocompletionData` touches `IndexedDBManager` (`src/utils/indexedDBManager.ts`), which must be mocked in jsdom; `@grafana/ui` `Badge` needs the standard Grafana test setup already used by other specs. The issue explicitly asks for the *dashboard-driven* test, so the **TestFlows scenario in §4 is the primary deliverable**; the Jest test is a recommended, low-cost addition for CI signal without docker.

**Recommendation:** implement §4 (TestFlows) to satisfy the issue literally; optionally add the §5 unit test (the `QueryHeader` render assertion — variant 1 — is trivial and fast) as extra regression coverage for the badge text and the SQL-mode gating.

---

## 6. Risks / edge cases / open questions

| Item | Detail / mitigation |
|---|---|
| **Badge is SQL-mode only** | `QueryHeader.tsx:79` gates on `editorMode === EditorMode.SQL`. The test **must** switch to SQL mode; opening a panel that defaults to Builder mode and asserting immediately would fail. Covered by `go_to_sql_editor` in the skeleton. |
| **No stable selector on the badge** | No `data-testid`/`aria-label` (§4.3). Test relies on text match, which is brittle to copy edits. **Open question for maintainer:** add `data-testid="clickhouse-autocomplete-permission-badge"` to the `<Badge>` (one line, `QueryHeader.tsx:81`) to make the selector robust. Recommended but a product change → confirm before including. |
| **10-min IndexedDB cache** | §4.2. Use a fresh session; assert on badge visibility, not on network calls. |
| **Panel default editorMode** | Panel 1 has no `editorMode` in JSON → defaults to Builder. Some panels (id 6 "Services Distribution", id 7 "Top Countries") have `"editorMode": "sql"` saved (`test_limited_permissions.json:481, 577`). Using one of those would open directly in SQL mode and could skip the toggle — but they are piechart/bargauge and their edit UI is the same query editor, so either works. The skeleton uses panel 1 + explicit toggle for clarity and to exercise the mode switch. |
| **ClickHouse version / error text** | `isPermissionError` matches on codes (497, 291, …) and substrings (`ACCESS_DENIED`, `Not enough privileges`). Confirmed against the code list in `clickhouseErrorHandling.ts:7-33`. If a future CH version changes the message, the classifier (not the test) would need updating — out of scope. |
| **Grafana version selectors** | The suite supports latest and legacy (10.4.3) via `context.grafana_version` (`regression.py:150-156`). The badge is plugin-rendered (not Grafana-chrome), so its text is version-independent; the surrounding navigation helpers already handle version differences. |
| **`@grafana/ui` Badge DOM** | The XPath `contains(normalize-space(.), text)` matches ancestors too; anchoring on the full unique message avoids false positives against the panel *description* text present in the dashboard JSON (§4.3). |
| **Is this really the "red message box"?** | The issue says "red message box about permssions missing". The only red, permission-specific UI element in the query editor is this `Badge` (`color="red"`, `icon="exclamation-triangle"`). No `AppEvents.alertError` toast is emitted for autocomplete denial (the catch blocks only `console.info`/`console.error` and return empty). So the badge is unambiguously the intended target. If the maintainer meant a Grafana toast, none is currently produced — that would then be a product gap, not a test gap (worth a clarifying comment on the issue). |
| **Playwright expectation in CLAUDE.md** | CLAUDE.md documents a Playwright suite that does not exist in the tree (`playwright.config.ts` absent, `@grafana/plugin-e2e` not installed, `tests/e2e/` empty of specs). If the team is mid-migration to Playwright, the same scenario maps cleanly onto `@grafana/plugin-e2e`'s `gotoDashboardPage({ uid: 'test-limited-permissions' })` → open panel edit → switch to SQL → `expect(page.getByText('Autocomplete unavailable - insufficient permissions to access system tables')).toBeVisible()`. **Open question:** confirm target framework with the maintainer before writing; this analysis defaults to TestFlows because that is the suite that actually runs today. |

---

## 7. Effort breakdown

| Sub-task | Estimate |
|---|---|
| New TestFlows scenario in `limited_access.py` (§4.1) | 1–1.5 h |
| (Optional) one-line `data-testid` on the badge + confirm with maintainer | 0.2 h |
| Manual smoke in Grafana (bring up stack, verify badge) | 0.5 h |
| Run `limited_access` feature, stabilize selector/timing | 1–1.5 h |
| (Optional) Jest badge render test (§5, variant 1) | 0.5 h |
| **Total** | **~0.5 day** |

**Final sizing: SMALL (S).** All fixtures exist; the product behavior is already implemented; the work is one new scenario plus a text selector.

---

## 8. Step-by-step execution checklist

1. **Branch** off `master` (or current working branch), e.g. `test/816-permission-bubble`.
2. **(Optional, confirm first)** add `data-testid="clickhouse-autocomplete-permission-badge"` to the `<Badge>` at `src/views/QueryEditor/components/QueryHeader/QueryHeader.tsx:81` and use it as the primary selector; keep the text match as a fallback.
3. **Add** the scenario `autocomplete_permission_bubble_is_shown` to `tests/testflows/tests/automated/limited_access.py` (§4.1). No change to `regression.py` (feature already registered at `:145`).
4. **Bring up** the stack: `docker compose up --no-deps -d grafana clickhouse` and (for the suite) `docker compose --profile test up -d selenium-standalone`.
5. **Manual smoke:** open `http://localhost:3000/d/test-limited-permissions/`, edit "Basic Query …", toggle SQL editor, confirm the red badge text.
6. **Run** the `limited_access` feature via `tests/testflows/regression.py` (see `tests/testflows/README.md` for exact invocation/env).
7. **Stabilize** timing (bump `retries`/`timeout` if the badge lags behind the denied fetch) and confirm the `Finally` cleanup returns to the dashboard cleanly.
8. **(Optional)** add the Jest render test (§5) for fast CI signal without docker.
9. **Commit** referencing #816; PR description: new TestFlows scenario asserting the SQL-editor red "Autocomplete unavailable — insufficient permissions" badge for the `clickhouse-limited` datasource on `test_limited_permissions.json`; notes that product behavior already exists (test-only), and — if applied — the added `data-testid`.

---

### Key file:line references
- `src/views/QueryEditor/components/QueryHeader/QueryHeader.tsx:79-87` — **the red badge** (assertion target).
- `src/views/QueryEditor/hooks/useAutocompletionData.ts:6-40, 68, 89-104` — autocomplete fetch + permission-error handling + cache.
- `src/views/QueryEditor/QueryEditor.tsx:21, 66` — hook wiring → `hasAutocompleteError`.
- `src/utils/clickhouseErrorHandling.ts:7-68` — permission-error classifier (codes + patterns).
- `docker/clickhouse/init_schema.sql:1-15` — `grafana_limited` restricted user (no `system.*`).
- `docker/grafana/provisioning/datasources/clickhouse-limited.yaml:1-18` — `clickhouse-limited` datasource.
- `docker/grafana/dashboards/test_limited_permissions.json` — target dashboard (uid `test-limited-permissions`), panels named above.
- `tests/testflows/tests/automated/limited_access.py:13-31, 385` — dashboard-open helper + auto-registration of scenarios.
- `tests/testflows/regression.py:145` — `limited_access` feature registration.
- `tests/testflows/steps/panel/view.py:117-124, 482-495` — `go_to_sql_editor`, back/discard.
- `tests/testflows/steps/dashboard/view.py:341-349, 460-467` — `open_panel`, `check_panel_exists`.
- `tests/testflows/steps/ui.py:203-215` — `wait_for_element_to_be_visible`.
- `package.json:14-15` — the (non-functional today) `e2e` script; `tests/e2e/` has no Playwright specs.
