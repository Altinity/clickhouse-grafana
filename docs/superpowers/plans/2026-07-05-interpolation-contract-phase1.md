# Variable Interpolation Contract — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt PR #906 semantics (single scalar variable → raw, fixing #905) with minimal code change, protected by an executable behavior-contract test and an e2e repro dashboard so the 9-year quoting flip-flop cycle cannot silently recur.

**Architecture:** One-line guard change in `interpolateQueryExpr` extracted into a named, documented predicate; a table-driven Jest contract test mirroring the spec's behavior matrix 1:1; a provisioned Grafana dashboard + Playwright spec exercising real runtime variable shapes. No refactoring (Phase 2 is out of scope).

**Tech Stack:** TypeScript, Jest, Playwright (`@grafana/plugin-e2e`), Grafana provisioned dashboards (Docker Compose).

**Spec:** `docs/superpowers/specs/2026-07-04-variable-interpolation-contract-design.md`
**Analysis:** `docs/issue-analysis/905-pr906-single-value-interpolation.md`, `docs/issue-analysis/sql-quoting-saga-full-history.md`

## Global Constraints

- Base branch: **`master`** — NOT `feature/advanced-logs-field-settings`. Work in an isolated branch/worktree `fix/interpolation-contract-905`.
- **No version bump** in this PR — release process (`bump2version`) handles it. CHANGELOG entry goes under the unreleased `3.5.0` heading.
- Frontend only. Do not touch `pkg/` (Go backend).
- Phase 2 (module extraction into `src/datasource/variables/`) is explicitly **out of scope**.
- Every commit leaves `npm run test` green.
- Behavior changes ONLY in contract rows A2, A3, A4, A8, C2 (quoted → raw). Everything else must stay byte-identical.
- All commands in Tasks 2–6 run INSIDE the worktree `../clickhouse-grafana-905` — every task (and every fresh subagent) must `cd` there before doing anything.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- PR #906's code change enters the branch ONLY via `git cherry-pick 199b16ff` — oplehto's authorship stays native on his commit; never re-implement or amend it.

---

### Task 1: Isolated branch from master

**Files:** none (git only)

**Interfaces:**
- Produces: branch `fix/interpolation-contract-905` checked out on up-to-date `master`, used by all later tasks.

- [ ] **Step 1: Fetch master AND the PR #906 head, create the branch**

```bash
git fetch origin master
git fetch origin pull/906/head:pr-906
git worktree add ../clickhouse-grafana-905 -b fix/interpolation-contract-905 origin/master
cd ../clickhouse-grafana-905
npm ci
```

**Route note (stakeholder-sensitive):** PR #906 comes from a significant external contributor (oplehto — repeat contributor, PR #903 already merged). Our branch must ADOPT their commit, not compete with it:
- **Route A (preferred):** if maintainers merge PR #906 into master before/while we work — rebase onto updated master; the cherry-pick step in Task 3 becomes an empty no-op (skip it).
- **Route B (default here):** cherry-pick their commit `199b16ff` in Task 3 Step 2 — git preserves oplehto's authorship in history, and GitHub credits them as co-contributor of our PR.

Never close PR #906 as "superseded by a rewrite" — our PR *contains* their commit.

(If worktrees are unavailable, `git stash && git checkout -b fix/interpolation-contract-905 origin/master` is acceptable — but do not carry over `feature/advanced-logs-field-settings` changes.)

- [ ] **Step 2: Verify clean baseline**

Run: `npm run test -- src/datasource/helpers 2>&1 | tail -5`
Expected: all existing helper tests PASS (baseline is green before we start).

---

### Task 2: Write the contract test (RED)

**Files:**
- Create: `src/datasource/helpers/interpolation-contract.test.ts`

**Interfaces:**
- Consumes: `interpolateQueryExpr(value, variable, isRepeated?)` and `interpolateQueryExprWithContext(query, variables)` from `src/datasource/helpers/index.ts` (same imports as the first line of `index.test.ts`).
- Produces: the executable contract; Task 3 makes its Δ rows pass; Task 6 keeps it green forever.

- [ ] **Step 1: Create the test file with this exact content**

```typescript
import { interpolateQueryExpr, interpolateQueryExprWithContext } from './index';

/**
 * EXECUTABLE BEHAVIOR CONTRACT for template-variable interpolation.
 *
 * Each row mirrors, 1:1 by ID, the table in
 * docs/superpowers/specs/2026-07-04-variable-interpolation-contract-design.md.
 * Change a row ONLY together with the spec table — a diff here is a
 * deliberate, reviewed behavior change, never a side effect.
 *
 * History of why this exists: docs/issue-analysis/sql-quoting-saga-full-history.md
 * (9 years, 47 issues, 5 flip-flops — this table is the flip-flop breaker).
 */

type Row = {
  id: string;
  why: string;
  query: string;
  variable: any;
  value: any;
  expected: string;
};

const ROWS: Row[] = [
  // ---- Group A: single scalar, plain position (the historical battleground) ----
  { id: 'A1', why: 'baseline: multi=false/includeAll=false raw (all eras)',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: false, includeAll: false },
    value: 'abc', expected: 'abc' },
  { id: 'A2', why: '#905: constant/textbox (undefined/undefined) raw',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'abc', expected: 'abc' },
  { id: 'A3', why: 'tri-state: null/null behaves like false/undefined',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: null, includeAll: null },
    value: 'abc', expected: 'abc' },
  { id: 'A4', why: 'mixed combo from real dashboard JSON (multi:null, includeAll:false)',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: null, includeAll: false },
    value: 'abc', expected: 'abc' },
  { id: 'A5', why: 'includeAll=true is NOT single-scalar: quoted',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: false, includeAll: true },
    value: 'abc', expected: "'abc'" },
  { id: 'A6', why: 'multi=true scalar: quoted',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: true, includeAll: false },
    value: 'abc', expected: "'abc'" },
  { id: 'A7', why: 'numeric strings raw in all eras',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: '123', expected: '123' },
  { id: 'A8', why: 'documented footgun: raw passthrough does NOT escape quotes (pre-3.4.0 parity; Phase 2 may harden inside string literals)',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: "O'Brien", expected: "O'Brien" },

  // ---- Group B: IN/tuple armor — #847 must never regress ----
  { id: 'B1', why: '#847: single value inside IN () stays quoted',
    query: 'SELECT * FROM t WHERE x IN ($v)',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'abc', expected: "'abc'" },
  { id: 'B2', why: 'array inside IN () → comma-joined quoted values',
    query: 'SELECT * FROM t WHERE x IN ($v)',
    variable: { name: 'v', multi: true, includeAll: false },
    value: ['a', 'b'], expected: "'a','b'" },
  { id: 'B3', why: 'NOT IN variant stays quoted',
    query: 'SELECT * FROM t WHERE x NOT IN ($v)',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'abc', expected: "'abc'" },
  { id: 'B4', why: 'tuple() counts as IN context',
    query: 'SELECT tuple($v) FROM t',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'abc', expected: "'abc'" },
  { id: 'B5', why: '#847: IN context outranks concatenation detection',
    query: 'SELECT * FROM db.$v WHERE x IN ($v)',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'abc', expected: "'abc'" },

  // ---- Group D: concatenation / string-literal armor — #797, #827 ----
  { id: 'D1', why: '#797: $db.$table concatenation stays raw',
    query: 'SELECT * FROM $db.$table',
    variable: { name: 'db', multi: undefined, includeAll: undefined },
    value: 'mydb', expected: 'mydb' },
  { id: 'D2', why: "#827: variable inside '...' string literal stays raw",
    query: "SELECT * FROM t WHERE x = 'prefix$v'",
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'abc', expected: 'abc' },
  { id: 'D3', why: '#797: $v.8090.svc numeric-suffix concatenation stays raw',
    query: 'SELECT * FROM $v.8090.svc',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'host', expected: 'host' },

  // ---- Group E: arrays outside IN — #829 ----
  { id: 'E1', why: '#829: array in array-function context → ClickHouse array literal',
    query: 'SELECT arrayIntersect($v, col) FROM t',
    variable: { name: 'v', multi: true, includeAll: false },
    value: ['a', 'b'], expected: "['a', 'b']" },
  { id: 'E2', why: 'multi+includeAll array in IN → comma format',
    query: 'SELECT * FROM t WHERE x IN ($v)',
    variable: { name: 'v', multi: true, includeAll: true },
    value: ['a', 'b'], expected: "'a','b'" },

  // ---- Group F: known quirks, pinned as-is to detect drift ----
  { id: 'F1', why: 'clickhouseEscape returnAsIs quirk: numeric string is quoted when options contain non-numeric values',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: true, includeAll: false, options: [{ value: 'abc' }, { value: '123' }] },
    value: '123', expected: "'123'" },
];

describe('Interpolation behavior contract (edit ONLY together with the spec table)', () => {
  it.each(ROWS)('[$id] $why', ({ query, variable, value, expected }) => {
    const variables = [{ name: variable.name, current: { value } }];
    const fn = interpolateQueryExprWithContext(query, variables);
    expect(fn(value, variable)).toBe(expected);
  });

  it('[A-EQ] tri-state equivalence: false ≡ undefined ≡ null → identical raw output (structurally blocks a strict === false guard)', () => {
    const results = [false, undefined, null].map((m) =>
      interpolateQueryExpr('abc', { name: 'v', multi: m, includeAll: m })
    );
    expect(results).toEqual(['abc', 'abc', 'abc']);
  });

  it('[C1] #712: repeated-panel value (differs from current) stays quoted', () => {
    const fn = interpolateQueryExprWithContext('SELECT * FROM t WHERE x = $v', [
      { name: 'v', current: { value: 'postgres' } },
    ]);
    expect(fn('mysql', { name: 'v', multi: undefined, includeAll: undefined })).toBe("'mysql'");
  });

  it('[C2] non-repeated (value equals current) follows the raw guard (#905)', () => {
    const fn = interpolateQueryExprWithContext('SELECT * FROM t WHERE x = $v', [
      { name: 'v', current: { value: 'mysql' } },
    ]);
    expect(fn('mysql', { name: 'v', multi: undefined, includeAll: undefined })).toBe('mysql');
  });

  it('[C3] $__all expands before the repeated check: full array is not "repeated" (#712 corner)', () => {
    const variable = { name: 'v', multi: true, includeAll: true, options: [{ value: 'a' }, { value: 'b' }] };
    const fn = interpolateQueryExprWithContext('SELECT * FROM t WHERE x IN ($v)', [
      { name: 'v', current: { value: ['$__all'] } },
    ]);
    expect(fn(['a', 'b'], variable)).toBe("'a','b'");
  });

  it('[F2] quirk pinned: empty current {} makes isRepeated=true → quoted (fix belongs to Phase 2 normalization, not here)', () => {
    const fn = interpolateQueryExprWithContext('SELECT * FROM t WHERE x = $v', [
      { name: 'v', current: {} },
    ]);
    expect(fn('abc', { name: 'v', multi: undefined, includeAll: undefined })).toBe("'abc'");
  });
});
```

- [ ] **Step 2: Run the contract test and verify EXACTLY these failures (RED)**

Run: `npx jest src/datasource/helpers/interpolation-contract.test.ts 2>&1 | tail -30`

Expected: **6 failures, everything else passes**:
- `[A2]`, `[A3]`, `[A4]`, `[A8]`, `[C2]` — received `'abc'` / `'O\'Brien'` (quoted), expected raw
- `[A-EQ]` — received `['abc', "'abc'", "'abc'"]`, expected `['abc', 'abc', 'abc']`

If any OTHER row fails, STOP: the contract table mismatches current reality — re-verify that row against `src/datasource/helpers/index.ts` before touching implementation, and fix the row (with a note) rather than the code.

Do NOT commit yet — the commit lands together with the implementation in Task 3 so every commit stays green.

---

### Task 3: Adopt PR #906 (cherry-pick, GREEN) + extract the named predicate

**Files:**
- Modify: `src/datasource/helpers/index.ts` (via cherry-pick, then predicate refactor above `interpolateQueryExpr`)
- Modify: `src/datasource/helpers/index.test.ts` (via cherry-pick — the ~11 legacy assertion flips arrive WITH oplehto's commit; do not hand-edit them)
- Test: `src/datasource/helpers/interpolation-contract.test.ts` (from Task 2)

**Interfaces:**
- Consumes: contract test from Task 2; commit `199b16ff` from branch `pr-906` (fetched in Task 1).
- Produces: `isSingleScalarVariable(variable: any): boolean` (module-private helper in `index.ts`); `interpolateQueryExpr`'s signature is unchanged.

- [ ] **Step 1: Cherry-pick PR #906's commit (preserves oplehto's authorship)**

```bash
git cherry-pick 199b16ff
```

Expected: clean pick touching `src/datasource/helpers/index.ts` + `index.test.ts`. (Route A: if master already contains PR #906, this reports "empty commit" — skip with `git cherry-pick --skip` and continue.) Do NOT amend or reword this commit — it stays authored by oplehto.

If the pick CONFLICTS (master has drifted — e.g. #903/`4d64bdf1` also touches these files): resolve by keeping `199b16ff`'s hunks verbatim for (a) the falsy guard + its comment, (b) the JSDoc table/example updates, (c) every test-assertion flip — and keeping master's hunks for everything else (`conditionalTest` region). Then `git cherry-pick --continue` without editing the message. Verify with `git show --stat HEAD` that author is `Olli-Pekka Lehto`.

- [ ] **Step 2: Verify the contract goes GREEN off the cherry-pick alone**

Run: `npx jest src/datasource/helpers/interpolation-contract.test.ts 2>&1 | tail -5`
Expected: PASS, 0 failures — the 6 Task-2 reds (A2, A3, A4, A8, C2, A-EQ) are fixed by their commit, everything else unchanged. If anything still fails, STOP and reconcile before refactoring.

- [ ] **Step 3: Extract the predicate with the contract comment (pure refactor under green tests)**

In `src/datasource/helpers/index.ts`, directly above the `interpolateQueryExpr` JSDoc block, insert:

```typescript
/**
 * Single-scalar guard: a variable whose `multi` and `includeAll` are BOTH falsy
 * is a plain single-value variable — its value passes through RAW
 * (pre-3.4.0 semantics, restored per #905 / PR #906).
 *
 * Falsy (NOT strict `=== false`) is deliberate: Grafana populates
 * multi/includeAll as `false` for query/custom/datasource variables, leaves
 * them `undefined` for constant/textbox/interval, and old dashboard JSON
 * serializes `null` — all of these mean "not a multi-select". The strict
 * check made constant/textbox behave differently from query variables,
 * which was the 3.4.x regression (#905).
 *
 * Quoting still happens where it was explicitly requested:
 *  - IN()/tuple() scalars  -> Priority 3 of interpolateQueryExprWithContext (#847)
 *  - repeated panels       -> isRepeated flag (#712)
 *  - multi-value arrays    -> escape path below
 *
 * Behavior table (edit ONLY together with interpolation-contract.test.ts):
 * docs/superpowers/specs/2026-07-04-variable-interpolation-contract-design.md
 */
const isSingleScalarVariable = (variable: any): boolean => !variable.multi && !variable.includeAll;
```

- [ ] **Step 4: Swap the inline condition for the predicate (minimal diff on their code)**

After the cherry-pick, `interpolateQueryExpr` contains PR #906's falsy check with its explanatory comment. Change ONLY the condition line — keep their comment block intact:

```typescript
  if (!variable.multi && !variable.includeAll && !Array.isArray(value)) {
```

→

```typescript
  if (isSingleScalarVariable(variable) && !Array.isArray(value)) {
```

Do NOT re-edit the JSDoc behavior table or the examples — PR #906's commit already updated them (table row `falsy|falsy → raw`, example `→ "mysql"`). Verify only:

Run: `grep -n 'falsy' src/datasource/helpers/index.ts | head -3`
Expected: at least one hit in the JSDoc table (confirms the cherry-pick brought the doc updates).

- [ ] **Step 5: Verify the legacy assertion flips arrived with the cherry-pick**

Run: `grep -c 'pre-3.4.0 semantics' src/datasource/helpers/index.test.ts`
Expected: ≥ 6 (PR #906 renamed the flipped tests and marked comments with this string). Do not hand-edit `index.test.ts` — all flips are oplehto's work, inside his commit.

- [ ] **Step 6: Run contract + full frontend suite — verify GREEN**

Run: `npx jest src/datasource/helpers/interpolation-contract.test.ts 2>&1 | tail -5`
Expected: PASS, 0 failures (all rows + A-EQ + C1/C2/C3 + F2).

Run: `npm run test 2>&1 | tail -10`
Expected: PASS. If any test outside `helpers/` fails on quoting expectations, it pins the removed behavior — flip it with the same `(pre-3.4.0 semantics)` rename convention and note it in the commit body.

- [ ] **Step 7: Commit (predicate refactor + contract test; the cherry-pick is already its own commit authored by oplehto)**

```bash
git add src/datasource/helpers/index.ts src/datasource/helpers/interpolation-contract.test.ts
git commit -m "test(interpolation): executable behavior contract + named single-scalar predicate

Armor on top of PR #906 (adopted via cherry-pick, authorship preserved):
- table-driven contract test mirroring the spec matrix 1:1, with a
  tri-state equivalence trap (false ≡ undefined ≡ null) that structurally
  blocks re-introducing the strict === false guard
- #712/#847/#797/#827/#829 behaviors pinned as armor rows
- falsy check extracted into documented isSingleScalarVariable predicate

Closes #905

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: e2e repro dashboard + Playwright spec

**Files:**
- Create: `docker/grafana/dashboards/single_value_variables_issue_905.json`
- Create: `tests/e2e/features/issue-905-single-value-variables.spec.ts`

**Interfaces:**
- Consumes: provisioned ClickHouse datasource uid `P7E099F39B84EA795` (same as `conditionalTest_quotes_issue_847.json`); dashboard uid `issue905-single-value` consumed by the spec.
- Produces: a permanent runtime regression net for real Grafana variable shapes (`null`/`undefined` multi).

- [ ] **Step 1: Create the dashboard JSON**

```json
{
  "annotations": { "list": [] },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 0,
  "id": null,
  "links": [],
  "panels": [
    {
      "datasource": { "type": "vertamedia-clickhouse-datasource", "uid": "P7E099F39B84EA795" },
      "description": "reproduce https://github.com/Altinity/clickhouse-grafana/issues/905 — constant variable as identifier must interpolate RAW",
      "gridPos": { "h": 6, "w": 12, "x": 0, "y": 0 },
      "id": 1,
      "targets": [
        {
          "datasource": { "type": "vertamedia-clickhouse-datasource", "uid": "P7E099F39B84EA795" },
          "editorMode": "sql",
          "extrapolate": false,
          "format": "table",
          "intervalFactor": 1,
          "query": "SELECT count() AS c FROM $const_table",
          "rawQuery": true,
          "refId": "A",
          "round": "0s",
          "skip_comments": true
        }
      ],
      "title": "constant as identifier (FROM const_table)",
      "type": "table"
    },
    {
      "datasource": { "type": "vertamedia-clickhouse-datasource", "uid": "P7E099F39B84EA795" },
      "description": "textbox in a value position with author-provided quotes (the documented pattern)",
      "gridPos": { "h": 6, "w": 12, "x": 12, "y": 0 },
      "id": 2,
      "targets": [
        {
          "datasource": { "type": "vertamedia-clickhouse-datasource", "uid": "P7E099F39B84EA795" },
          "editorMode": "sql",
          "extrapolate": false,
          "format": "table",
          "intervalFactor": 1,
          "query": "SELECT count() AS c FROM system.query_log WHERE query_kind = '$text_kind'",
          "rawQuery": true,
          "refId": "A",
          "round": "0s",
          "skip_comments": true
        }
      ],
      "title": "textbox in quoted value position (text_kind)",
      "type": "table"
    },
    {
      "datasource": { "type": "vertamedia-clickhouse-datasource", "uid": "P7E099F39B84EA795" },
      "description": "single-select query variable, author quotes (raw in every era — row A1)",
      "gridPos": { "h": 6, "w": 12, "x": 0, "y": 6 },
      "id": 3,
      "targets": [
        {
          "datasource": { "type": "vertamedia-clickhouse-datasource", "uid": "P7E099F39B84EA795" },
          "editorMode": "sql",
          "extrapolate": false,
          "format": "table",
          "intervalFactor": 1,
          "query": "SELECT count() AS c FROM system.tables WHERE database = '$db_var'",
          "rawQuery": true,
          "refId": "A",
          "round": "0s",
          "skip_comments": true
        }
      ],
      "title": "query var, manual quotes (db_var)",
      "type": "table"
    },
    {
      "datasource": { "type": "vertamedia-clickhouse-datasource", "uid": "P7E099F39B84EA795" },
      "description": "IN armor (#847): single value inside IN() must be auto-quoted by Priority 3",
      "gridPos": { "h": 6, "w": 12, "x": 12, "y": 6 },
      "id": 4,
      "targets": [
        {
          "datasource": { "type": "vertamedia-clickhouse-datasource", "uid": "P7E099F39B84EA795" },
          "editorMode": "sql",
          "extrapolate": false,
          "format": "table",
          "intervalFactor": 1,
          "query": "SELECT count() AS c FROM system.tables WHERE database IN ($db_var)",
          "rawQuery": true,
          "refId": "A",
          "round": "0s",
          "skip_comments": true
        }
      ],
      "title": "IN armor (db_var, issue 847)",
      "type": "table"
    }
  ],
  "preload": false,
  "refresh": "",
  "schemaVersion": 42,
  "tags": ["issue-905", "interpolation-contract"],
  "templating": {
    "list": [
      {
        "current": { "text": "system.query_log", "value": "system.query_log" },
        "hide": 2,
        "name": "const_table",
        "query": "system.query_log",
        "type": "constant"
      },
      {
        "current": { "text": "Select", "value": "Select" },
        "name": "text_kind",
        "query": "Select",
        "type": "textbox"
      },
      {
        "current": { "text": "system", "value": "system" },
        "datasource": { "type": "vertamedia-clickhouse-datasource", "uid": "P7E099F39B84EA795" },
        "includeAll": false,
        "multi": false,
        "name": "db_var",
        "query": "SELECT name FROM system.databases",
        "refresh": 1,
        "sort": 1,
        "type": "query"
      }
    ]
  },
  "time": { "from": "now-6h", "to": "now" },
  "timezone": "",
  "title": "single value variables issue 905",
  "uid": "issue905-single-value",
  "version": 1
}
```

- [ ] **Step 2: Create the Playwright spec**

```typescript
import { test, expect } from '@grafana/plugin-e2e';

test.describe('issue #905: single-value variable raw passthrough', () => {
  test('all four repro panels render without query errors', async ({ gotoDashboardPage, page }) => {
    await gotoDashboardPage({ uid: 'issue905-single-value' });

    // All 4 panels must be present.
    // NOTE: panel titles deliberately contain NO $variables — Grafana interpolates
    // variables in titles, which would break literal text matching here.
    await expect(page.getByText('constant as identifier (FROM const_table)')).toBeVisible();
    await expect(page.getByText('textbox in quoted value position (text_kind)')).toBeVisible();
    await expect(page.getByText('query var, manual quotes (db_var)')).toBeVisible();
    await expect(page.getByText('IN armor (db_var, issue 847)')).toBeVisible();

    // No panel may show a query error (quoted identifier => ClickHouse error => panel error state)
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="data-testid Panel status error"]')).toHaveCount(0);
  });
});
```

- [ ] **Step 3: Run the e2e spec**

Run: `npx playwright test tests/e2e/features/issue-905-single-value-variables.spec.ts --project=chromium 2>&1 | tail -10`
Expected: `1 passed`. (Playwright config auto-starts services; if it doesn't, run `docker compose up --no-deps -d grafana clickhouse` first and retry. If Grafana was ALREADY running when the dashboard JSON was created, run `docker compose restart grafana` so file provisioning picks it up. If a selector fails, compare against the working patterns in `tests/e2e/datasource/config.spec.ts` and adjust the selector — not the assertions' meaning.)

- [ ] **Step 4: Commit**

```bash
git add docker/grafana/dashboards/single_value_variables_issue_905.json tests/e2e/features/issue-905-single-value-variables.spec.ts
git commit -m "test(e2e): repro dashboard for #905 — single-value variables in identifier and value positions

Exercises the REAL templateSrv runtime shapes (undefined/null multi) that
unit mocks cannot: constant as FROM identifier, textbox/query vars in
author-quoted value positions, IN() auto-quoting armor (#847).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: CHANGELOG entry (with the #809 cohort migration note)

**Files:**
- Modify: `CHANGELOG.md` (top of the file, under the unreleased `3.5.0` heading; create `# 3.5.0 (unreleased)` at the top if it does not exist)

**Interfaces:** none.

- [ ] **Step 1: Add this exact entry**

```markdown
* BREAKING fix: restore pre-3.4.0 raw passthrough for single-value template variables (adopts PR #906), fix https://github.com/Altinity/clickhouse-grafana/issues/905
  * variables whose `multi`/`includeAll` are `false`, `undefined` or `null` (constant, textbox, interval, and old dashboards' query/custom variables) now interpolate RAW in plain positions: `FROM $var` works again
  * MIGRATION: quote value positions in dashboard SQL — `WHERE x = $var` → `WHERE x = '$var'`. If you removed manual quotes following the workaround in issue #809, restore them
  * unchanged: single values inside `IN ()`/`tuple()` are still auto-quoted (#847), repeated panels still quoted (#712), multi-value arrays unchanged
  * behavior is now pinned by `src/datasource/helpers/interpolation-contract.test.ts` — see docs/superpowers/specs/2026-07-04-variable-interpolation-contract-design.md
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): BREAKING entry for #905 raw passthrough with #809 cohort migration note

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Final verification + spec status

**Files:**
- Modify: `docs/superpowers/specs/2026-07-04-variable-interpolation-contract-design.md` (Status line only)

**Interfaces:** none.

- [ ] **Step 1: Full frontend verification**

Run: `npm run test 2>&1 | tail -5` — Expected: PASS.
Run: `npm run lint 2>&1 | tail -5` — Expected: no errors.
Run: `npx jest src/datasource/helpers/interpolation-contract.test.ts 2>&1 | tail -3` — Expected: PASS (final confirmation).

- [ ] **Step 2: Flip the spec status**

In the spec header, change `**Status:** Draft — awaiting review` → `**Status:** Phase 1 implemented (this plan); Phase 2 pending`.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-07-04-variable-interpolation-contract-design.md
git commit -m "docs(spec): mark interpolation contract Phase 1 as implemented

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 4: PR guidance (do not push without user approval)**

When the user approves pushing, the PR must:
- Target `master`, title: `fix(interpolation): adopt PR #906 + executable behavior contract (#905)`
- Body: `Closes #905`, state explicitly that this branch **contains PR #906's commit unchanged (cherry-picked, authorship preserved — oplehto appears as co-contributor)** and adds the protection layer on top; include the BREAKING note with the `WHERE x = '$var'` migration and the explicit #809-cohort warning, plus links to the spec + saga analysis docs.
- Leave a comment on PR #906 thanking the author and linking our PR as "adopts your fix as-is + adds a behavior-contract test suite so it can't regress" — merging our PR auto-includes their commit; maintainers can then close #906 as merged-via, NOT as rejected/superseded.
- Stakeholder note: oplehto is a repeat contributor from a significant company (#903 already merged) — the communication tone matters as much as the code.

---

## Explicitly out of scope (Phase 2 — separate plan when approved)

- Module extraction `src/datasource/variables/` (single entry point, `normalize.ts`, rules-as-data)
- Escaped-raw inside single-quoted literals (would change contract row D2/A8)
- Position-detector warnings
- F2 quirk fix (empty `current {}` → spurious isRepeated)
- `$conditionalTest` behavior table
