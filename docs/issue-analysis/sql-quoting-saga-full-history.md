# The SQL Quoting Saga — full 9-year history, recurrence mechanism, systemic fix

Synthesis of a 19-agent multi-angle sweep (2026-07-05): all GitHub issues (open+closed) matched against quoting/escaping/interpolation of values into SQL, plus CHANGELOG/git archaeology. Companion docs: `905-pr906-single-value-interpolation.md` (deep dive on the current battleground), `docs/superpowers/specs/2026-07-04-variable-interpolation-contract-design.md` (the fix design).

---

## 0. TL;DR

**47 relevant issues across 9 years (2017–2026), three subsystems, at least 5 documented flip-flops — all downstream of one missing bit of information: whether `$var` at a given usage site is an identifier or a literal.** Grafana's variable model does not carry that bit, so each subsystem invented its own guess: template-vars guess from variable config (`multi`/`includeAll`), adhoc filters guess from value shape (a numeric-looking regex from 2019 still causing bugs in 2026), macros guess by re-parsing SQL text. Every guess is lossy; every adjustment to a guess moves a global boundary that silently breaks the other cohort of users, who file the issue that triggers the next flip. Fixes were validated by characterization tests written alongside the code, so regressions shipped green. The systemic fix is not a better guess: (1) one simple written default — single scalar → raw — which is the only self-stabilizing choice (quotes can be added in dashboard SQL; they can never be removed); (2) the full behavior table as an executable contract test; (3) an e2e dashboard against live Grafana; (4) one consolidated module where the messy inputs are normalized at the boundary and priorities are data, not if-ordering; (5) for adhoc — replace the value-shape guess with schema ground truth (`system.columns`), already in flight on `feature/advanced-logs-field-settings`.

---

## 1. Scale

| Metric | Value |
|---|---|
| Relevant issues found | **47** (multi-angle sweep, deduplicated) |
| Time span | **2017 (#27) → 2026 (#905)** |
| Subsystems | template-vars (~24), adhoc filters (~10), macros `$conditionalTest`/`$unescape` (~13) |
| Documented flip-flops (fix reverted or fix-caused-bug) | **≥ 5** (§3) |
| Longest-lived unfixed heuristic | adhoc numeric-string guess: **1.9.4 (2019) → still open (#678, #794)** |

## 2. Chronology by era

| Era | Versions | What happened | Issues |
|---|---|---|---|
| **Origin** | 1.2.5–1.4.1 (2017–2018) | First contact with the missing bit: interpolate *value* not label (#27); "variables are always quoted, can't use as column names" (#37) → solved with a **macro workaround** `$unescape` (1.4.1), which immediately grew its own bugs (#49, #90 — parentheses) | 27, 37, 49, 90 |
| **Machinery multiplies** | 1.4.0–1.9.x (2018–2019) | Adhoc filters (1.4.0) and `$conditionalTest` (1.9.0, #122) ship — two more places that guess quoting. 1.9.2 "Ad Hoc Filters fix" wraps whole expressions in quotes → breaks complex filters (#151). 1.9.4 introduces the **numeric-looking-string heuristic** for adhoc values — the guess still biting in 2026 | 122, 125, 128, 139, 141, 151 |
| **First flip-flop cycle** | 2.0.x–2.1.0 (2020) | 2.0.2 changes multi-value format `'a','b'` → `['a','b']`, breaking `IN ($var)` (#252) → **explicit revert** to 2.0.1 behavior (commit `94048508`). Crash fixes on array values (#169, #232), `$unescape` limits (#245), `$conditionalTest` mangling quoted comparisons (#266) | 99, 162, 169, 232, 245, 252, 266, 296 |
| **Simmering** | 2.4–3.3.1 (2021–2024) | Textbox quotes unescaped (#125 closed 2022 via `:sqlstring` docs), comment-stripping quote-unaware (#374), identifier backticks (#440), `$conditionalTest` empty-select (#485), adhoc varchar-numeric (#502 — the canonical quote-by-column-type bug), `IN (...)` vs `IN [...]` (#506), `$conditionalTest` errors (#524) | 125, 374, 440, 485, 502, 506, 524 |
| **The 3.4.0 big bang** | 3.4.0-dev → 3.4.5 (2025) | Go/WASM parser port + Scenes refactor + the quoting pivot. Inside one dev cycle, three positions in three weeks: `d974911b` (Jan 27: quote ALL single values), partial revert, `7163ae34` (Feb 19: quote only `undefined`) — **flip-flop before release, no contract to arbitrate**. Release spawns a cluster marked "affected 3.4.0+": #779 AND-glue, #780 label-vs-value, #792, #797 nested quotes, #799 AST panic, #803 step field, #804/#805 `$adhoc` unreplaced, **#809 double-quoting (closed with advice: "remove your manual quotes, rely on auto-quoting")**, #810, #815 macro-clobbers-variable | 712, 733, 762, 779, 780, 792, 797, 799, 803, 804, 805, 809, 810, 815 |
| **Context-aware whack-a-mole** | 3.4.5–3.4.11 (2025–2026) | Strict `=== false` guard + `isRepeated` (`a2bc047f`); #829 quoting corner cases → fix's regex misses `IN [$var]` → **#838 double brackets** (fix-caused-bug); #847 `$conditionalTest` quotes (Priority 3); #832 UInt64 precision → quote-64-bit fix → **#859/#860 alerting panics** (fix-caused-bug); #869 else-branch; PR #903 comma parsing | 827, 829, 832, 836, 838, 847, 859, 860, 869 |
| **The revert** | PR 906 (2026-06) | #905: constants quoted as identifiers → PR 906 restores pre-3.4.0 falsy guard. **The #809 cohort — users who followed the official "drop your quotes" advice — will now break a second time** | 905, 906 |

## 3. The five documented flip-flops

1. **2.0.2 (2020)**: multi-value format flip → #252 → reverted (`94048508`, "return behavior to 2.0.1").
2. **1.9.2 (2019)**: adhoc quoting fix → broke complex filters (#151) → re-fixed.
3. **3.4.0-dev (2025)**: `d974911b` quote-all → partial revert → `7163ae34` quote-undefined — three positions in three weeks, pre-release.
4. **3.4.x → PR 906 (2025–2026)**: quote-undefined shipped → #809, #905 → full revert to pre-3.4.0 raw.
5. **3.4.7 → 3.4.9**: #829 context-aware fix → its regex misses `IN [$var]` → #838 → regex extended. (Plus #832 → #859/#860 → narrowed to logs-only in unreleased 3.5.0.)

## 4. Why the bugs recur — the mechanism

**Cause 0 (the root): the missing bit.** Identifier-or-literal is a property of the *usage site*; Grafana's variable model doesn't encode it. Every quoting decision is therefore a guess.

**Cause 1: three subsystems, three different lossy guesses.**
- template-vars: guess from *variable config* (`multi`/`includeAll` — which arrive as `false | undefined | null` depending on variable type, Grafana version, and dashboard age);
- adhoc: guess from *value shape* (`^\d+(\.\d+)?$` regex, 2019) — `'200'` in a `Map(String,String)` becomes an unquoted number (#794, #502);
- macros: guess by *re-parsing SQL text* (comma counting in `$conditionalTest` — PR #903).

**Cause 2: global boundary + workaround cohorts.** Every guess adjustment flips behavior for all dashboards at once. Winners are silent; losers file the next issue. Worse: official workarounds create cohorts bound to the current behavior (#809: "remove your quotes" → that cohort breaks on the PR 906 revert). The losers of a quote-default have **no exit at all** (SQL cannot strip quotes), which is why quote-defaults always get reverted and raw-defaults survive — the asymmetry argument.

**Cause 3: characterization tests.** The 387-line interpolation suite was created in the same commit as the implementation (`ee4e7c22`); it pinned incidental behavior (e.g. "should quote in WHERE clauses" — never requested by any issue) and let #905 ship green for 15 months.

**Cause 4: workaround machinery becomes its own bug factory.** `$unescape` (2018) and `$conditionalTest` (2019) were built to compensate for wrong quoting defaults; together they account for ~13 issues.

**Cause 5: no written contract.** Priorities live as if-ordering across two functions; each fix is a local patch with no map of the whole surface, so nobody can see which cell of the matrix a change flips.

## 5. The systemic fix — and replay validation

Design detail lives in the spec; summary: **(1)** default = single scalar → raw (only self-stabilizing choice); **(2)** the full behavior matrix as a table-driven contract test — any behavior change is a visible table diff in review; **(3)** e2e dashboard against live Grafana (real runtime variable shapes); **(4)** Phase 2: one module — normalize `false|null|undefined` → boolean at the boundary, priorities as a data-ordered rule list with issue refs; **(5)** adhoc: replace the value-shape guess with schema truth (`system.columns` introspection — in flight on `feature/advanced-logs-field-settings`); **(6)** macros: same contract-table medicine when next touched (out of scope now).

**Replay: would each historical bug class have been prevented or caught?**

| Historical bug | Under the designed system |
|---|---|
| #905 / #809 (default flip, quoted identifiers) | Contract row A2 pins raw; asymmetry rule makes the default terminal — no more flips to re-litigate |
| #252 (multi-value format flip, 2020) | Rows B2/E1-E2 pin both formats per context; a format change = visible table diff |
| #838 (`IN [$var]` double brackets) | Row B (bracket variants) + rules-as-data: a regex change is a named-rule diff, reviewable |
| #712 / #847 (requested quoting lost) | Armor rows B/C fail CI if a "simplification" drops them |
| #125 / O'Brien (unescaped quotes) | Documented row A8 + Phase-2 escaped-raw inside string literals |
| #794 / #502 / #678 (adhoc numeric guess) | Guess replaced by column-type ground truth; regression = failed `pkg/adhoc` type-matrix test |
| #766 (QA dashboard inconsistencies) | e2e dashboard is exactly this QA loop, automated |
| 3.4.0 cluster (#803/#804/#815, pipeline order) | Out of quoting scope, same lesson applies: pipeline-order contract tests (future work) |
| $conditionalTest lineage (#485→#869→#903) | Not covered yet — flagged as the next contract candidate |

**What we deliberately do NOT do:** no new heuristics (position-detector may only *warn*, never decide); no new macro workarounds; no type-based branching without runtime characterization; never behavior change and refactor in one diff.

## 6. Immediate actions

1. Land PR 906 semantics + contract test + e2e dashboard + CHANGELOG (spec Phase 1). Version **3.5.0**.
2. Migration note must explicitly address the **#809 cohort**: "if you removed manual quotes per the #809 workaround, restore them (`WHERE x = '$var'`)".
3. Phase 2 module consolidation under green contract.
4. Adhoc type-aware work continues on its branch — same principle, already aligned.
5. When `$conditionalTest` is next touched: write its behavior table first.
