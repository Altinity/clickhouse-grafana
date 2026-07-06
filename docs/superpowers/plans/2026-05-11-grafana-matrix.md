# Grafana Version Matrix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run every testflows suite against the pinned Grafana version (required) and against `grafana:latest` (informational, non-blocking) in parallel in CI.

**Architecture:** Convert the `tests` job in `.github/workflows/testflows.yml` from a flat `include:` list of 18 suites to a 2D matrix of suites × Grafana versions (36 jobs). Latest-version failures don't block merge via per-step `continue-on-error`. Artefacts get a `-<label>` suffix to avoid collisions; coverage job downloads only the `-fixed` variants.

**Tech Stack:** GitHub Actions, YAML, testflows (Python), docker compose.

---

## File Structure

Only one file is modified:

- `/Users/lunaticus/Documents/Work/clickhouse-grafana/.github/workflows/testflows.yml` — the testflows CI workflow. Single responsibility: define how testflows suites run in CI. The change reshapes the existing `tests` job's matrix and adjusts a few coverage/artefact references; build and coverage jobs keep their current structure aside from the artefact download pattern.

No new files. No code outside CI.

---

## Task 1: Reshape the matrix and add the Grafana axis

This task does the whole CI rewiring in one focused edit. The change is ~30 lines of YAML; splitting further produces noise without reducing risk.

**Files:**
- Modify: `.github/workflows/testflows.yml:15-21` (remove top-level `GRAFANA_VERSION` env)
- Modify: `.github/workflows/testflows.yml:83-199` (the `tests` job — matrix, job name, env, continue-on-error, artefact names)
- Modify: `.github/workflows/testflows.yml:226-230` (coverage download pattern)

### Step 1.1: Read the current file to ground the edits

- [ ] Read `.github/workflows/testflows.yml` end-to-end. Confirm the line ranges below match before editing — if line numbers drifted, use the surrounding context to locate the right blocks.

### Step 1.2: Remove the workflow-level `GRAFANA_VERSION` env

- [ ] Edit the top-level `env:` block. Before:

```yaml
env:
  GRAFANA_VERSION: ${{ '12.4.0-20977568970' }}
  testflows_logs: |
    ./testflows_logs/*
  selenium_logs: |
    ./selenium_logs/*
```

After (the version moves to the matrix; per-step env will set it):

```yaml
env:
  testflows_logs: |
    ./testflows_logs/*
  selenium_logs: |
    ./selenium_logs/*
```

### Step 1.3: Replace the `tests` job matrix and add per-job name

- [ ] Replace the `strategy.matrix` block in the `tests` job. Before:

```yaml
    strategy:
      fail-fast: false
      matrix:
        include:
          - group: window-functions
            suite: "window_functions"
          - group: sql-editor
            suite: "sql_editor"
          - group: data-source-setup-connections
            suite: "data_source_setup_connections"
          - group: data-source-setup-defaults
            suite: "data_source_setup_defaults"
          - group: e2e
            suite: "e2e"
          - group: query-options
            suite: "query_options"
          - group: functions
            suite: "functions"
          - group: macros
            suite: "macros"
          - group: adhoc-macro
            suite: "adhoc_macro"
          - group: unified-alerts
            suite: "unified_alerts"
          - group: template-variables-editor
            suite: "template_variables_editor"
          - group: legacy-alerts
            suite: "legacy_alerts"
          - group: conditional-test
            suite: "conditional_test"
          - group: search-filter
            suite: "search_filter"
          - group: flamegraph-and-tracing
            suite: "flamegraph_and_tracing"
          - group: limited-access
            suite: "limited_access"
          - group: worldmap-and-table-format
            suite: "worldmap_and_table_format"
          - group: log-context
            suite: "log_context"
```

After:

```yaml
    strategy:
      fail-fast: false
      matrix:
        suite:
          - { group: window-functions,              name: window_functions }
          - { group: sql-editor,                    name: sql_editor }
          - { group: data-source-setup-connections, name: data_source_setup_connections }
          - { group: data-source-setup-defaults,    name: data_source_setup_defaults }
          - { group: e2e,                           name: e2e }
          - { group: query-options,                 name: query_options }
          - { group: functions,                     name: functions }
          - { group: macros,                        name: macros }
          - { group: adhoc-macro,                   name: adhoc_macro }
          - { group: unified-alerts,                name: unified_alerts }
          - { group: template-variables-editor,    name: template_variables_editor }
          - { group: legacy-alerts,                 name: legacy_alerts }
          - { group: conditional-test,              name: conditional_test }
          - { group: search-filter,                 name: search_filter }
          - { group: flamegraph-and-tracing,        name: flamegraph_and_tracing }
          - { group: limited-access,                name: limited_access }
          - { group: worldmap-and-table-format,     name: worldmap_and_table_format }
          - { group: log-context,                   name: log_context }
        grafana:
          - { version: "12.4.0-20977568970", label: fixed,  required: true }
          - { version: "latest",             label: latest, required: false }
```

- [ ] Add an explicit `name:` to the `tests` job so PR checks show a readable label. Insert right after the `tests:` line:

```yaml
  tests:
    name: tests (${{ matrix.suite.group }}, ${{ matrix.grafana.label }})
    needs: [prepare-frontend-build, prepare-backend-build]
```

(Keep all other job-level fields below `name:`: `runs-on`, `permissions`, `timeout-minutes`, `env: SKIP_BUILDERS`, `strategy`.)

### Step 1.4: Wire matrix values into the test-run step

- [ ] Replace the `Run Altinity Grafana Plugin tests` step. Before:

```yaml
      - name: Run Altinity Grafana Plugin tests (${{ matrix.group }})
        run: cd ./tests/testflows/ &&
          python3
          -u ./regression.py --before=0.1 --after=0.1
          --suite ${{ matrix.suite }}
          --log raw.log
          -o short
```

After:

```yaml
      - name: Run Altinity Grafana Plugin tests (${{ matrix.suite.group }} on Grafana ${{ matrix.grafana.label }})
        continue-on-error: ${{ !matrix.grafana.required }}
        env:
          GRAFANA_VERSION: ${{ matrix.grafana.version }}
        run: cd ./tests/testflows/ &&
          python3
          -u ./regression.py --before=0.1 --after=0.1
          --suite ${{ matrix.suite.name }}
          --log raw.log
          -o short
```

### Step 1.5: Suffix artefact names with the Grafana label

- [ ] Replace the three `upload-artifact` blocks at the end of the `tests` job. Before:

```yaml
      - name: Upload raw coverage data
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: raw-coverage-${{ matrix.group }}
          path: |
            go_coverage/raw/
            tests/testflows/coverage/raw/
          if-no-files-found: ignore

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: testflows-logs-${{ matrix.group }}
          path: ${{ env.testflows_logs}}

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: selenium-logs-${{ matrix.group }}
          path: ${{ env.selenium_logs}}
```

After:

```yaml
      - name: Upload raw coverage data
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: raw-coverage-${{ matrix.suite.group }}-${{ matrix.grafana.label }}
          path: |
            go_coverage/raw/
            tests/testflows/coverage/raw/
          if-no-files-found: ignore

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: testflows-logs-${{ matrix.suite.group }}-${{ matrix.grafana.label }}
          path: ${{ env.testflows_logs}}

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: selenium-logs-${{ matrix.suite.group }}-${{ matrix.grafana.label }}
          path: ${{ env.selenium_logs}}
```

### Step 1.6: Restrict the coverage job to fixed-run artefacts

- [ ] Edit the download step in the `coverage` job. Before:

```yaml
      - name: Download all raw coverage artifacts
        uses: actions/download-artifact@v7
        with:
          pattern: raw-coverage-*
          path: raw-coverage
```

After:

```yaml
      - name: Download fixed-run raw coverage artifacts
        uses: actions/download-artifact@v7
        with:
          pattern: raw-coverage-*-fixed
          path: raw-coverage
```

### Step 1.7: Validate YAML syntax locally

- [ ] Run a syntax check. Prefer `actionlint` if installed; fall back to `yamllint` or `python -c "import yaml; yaml.safe_load(open('.github/workflows/testflows.yml'))"`.

```bash
# Try actionlint first (catches GitHub-Actions-specific issues like bad matrix refs)
which actionlint && actionlint .github/workflows/testflows.yml || \
  python3 -c "import yaml; yaml.safe_load(open('.github/workflows/testflows.yml')); print('YAML OK')"
```

Expected: no errors. If `actionlint` reports an undefined matrix reference, you forgot to rename `matrix.group` → `matrix.suite.group` or `matrix.suite` → `matrix.suite.name` somewhere. Grep for stragglers:

```bash
grep -nE 'matrix\.(group|suite)([^.]|$)' .github/workflows/testflows.yml
```

Expected: empty output. Every reference should be `matrix.suite.group`, `matrix.suite.name`, `matrix.grafana.version`, `matrix.grafana.label`, or `matrix.grafana.required`.

### Step 1.8: Sanity-check the diff

- [ ] Run `git diff .github/workflows/testflows.yml` and confirm:
  - Top-level `GRAFANA_VERSION` env line removed.
  - `strategy.matrix` has two axes: `suite` (18 entries) and `grafana` (2 entries).
  - `tests:` job has a `name:` key with the matrix-expression display name.
  - The run step has `continue-on-error: ${{ !matrix.grafana.required }}` and a step-level `env: GRAFANA_VERSION:`.
  - Three artefact names end with `-${{ matrix.grafana.label }}`.
  - The coverage download pattern is `raw-coverage-*-fixed`.

### Step 1.9: Commit

- [ ] Stage and commit:

```bash
git add .github/workflows/testflows.yml
git commit -m "$(cat <<'EOF'
ci(testflows): run suites against fixed + latest Grafana in parallel

Reshape the testflows tests job into a 2D matrix of suites × Grafana
versions. Fixed (12.4.0-20977568970) stays required; latest is
informational via per-step continue-on-error. Artefacts gain a -fixed
or -latest suffix; the coverage job downloads only -fixed artefacts so
Coveralls keeps reporting the same data as before.
EOF
)"
```

---

## Task 2: Verify on CI

This task confirms the change behaves the way the spec promised. Done remotely — there's no local way to exercise the full GitHub Actions matrix.

**Files:** none modified; observation only.

### Step 2.1: Push the branch

- [ ] Push to the remote and open (or update) a PR:

```bash
git push -u origin HEAD
```

If a PR is already open on this branch, the push triggers a new workflow run. Otherwise create one — the user typically uses `gh pr create`.

### Step 2.2: Wait for the workflow to start and inspect the matrix

- [ ] Watch the run:

```bash
gh run watch --exit-status
```

Or open the run in the browser (`gh run view --web`).

Verify:
  - `prepare-frontend-build` and `prepare-backend-build` jobs run once each.
  - The `tests` matrix expands to **36 jobs** (18 suites × 2 Grafana versions).
  - Job names follow the pattern `tests (sql-editor, fixed)`, `tests (sql-editor, latest)`, etc.

### Step 2.3: Confirm fixed-vs-latest behaviour on a real outcome

- [ ] Look at any `… , latest` job after it finishes:
  - If all tests pass → job is green (same as fixed).
  - If a test fails → the **step** is marked failed (red ✗ inside the log) but the **job** is green. The overall workflow stays green if all `, fixed` jobs succeed.

- [ ] Look at any `… , fixed` job:
  - On test failure, the step fails and the job fails. The whole workflow goes red.

### Step 2.4: Confirm coverage still reports

- [ ] Once `coverage` finishes, open its log and verify:
  - The download step reports finding 18 artefacts matching `raw-coverage-*-fixed`.
  - "Frontend coverage generated successfully" appears.
  - The `Report coverage to Coveralls` step succeeds.

### Step 2.5: Confirm artefact names don't collide

- [ ] In the run's artefacts list, confirm pairs like:
  - `raw-coverage-sql-editor-fixed` and `raw-coverage-sql-editor-latest`
  - `testflows-logs-sql-editor-fixed` and `testflows-logs-sql-editor-latest`
  - `selenium-logs-sql-editor-fixed` and `selenium-logs-sql-editor-latest`

  Both labels for each group exist; nothing was overwritten.

### Step 2.6: Branch-protection note (manual, one-time)

- [ ] Branch protection on `master`/`main` needs the required-checks list updated so only `tests (…, fixed)` jobs gate merge. This is a GitHub UI change, not a repo change — flag it to the user once the workflow names are confirmed in step 2.2. The user does this from **Settings → Branches → Branch protection rules**.

---

## Self-review notes

- **Spec coverage:**
  - "Matrix shape" → Task 1.3.
  - "Required vs. informational" → Task 1.4 (`continue-on-error` on the run step).
  - "Artefact naming" → Task 1.5.
  - "Coverage job" → Task 1.6.
  - "Build jobs unchanged" → not touched, confirmed by step 1.8.
  - "PR signal / branch protection" → Task 2.6.
- **Placeholders:** none — every code block shows the exact before/after content.
- **Type consistency:** matrix references are uniform across all tasks (`matrix.suite.group`, `matrix.suite.name`, `matrix.grafana.version`, `matrix.grafana.label`, `matrix.grafana.required`). The grep in step 1.7 catches any stragglers.
