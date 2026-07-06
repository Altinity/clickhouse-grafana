# Phase 5 (follow-up epic) — Macro engine on the AST — Design Sketch

**Status:** SKETCH for discussion, 2026-07-06. Not a plan yet — the shape of the epic.
**Prereq:** #733 complete (v2 parser is the sole engine; `EvalAST`/`PrintAST`/golden corpus in place).
**Relation to #733:** #733 replaced the *parser*; Phase 5 replaces the *macro engine* that runs on top of it. Deliberately excluded from #733 because it changes *how* macros expand (behavior), whereas #733 was strict byte-parity.

---

## 0. Goal in one paragraph

The macro engine (`pkg/eval/eval_query.go`, ~40 functions, lines 413–1487) expands `$columns`/`$rate`/… by **string surgery** — it locates the macro in the raw query with `strings.Index`, extracts aliases with `strings.Split(" ")`, hunts clause boundaries with `findKeywordOutsideBrackets`, and builds output by string concatenation that is then **re-parsed**. The v2 parser already produces a real `EvalAST`, so this work is done twice and the string-hunting is the source of a recurring bug class (#869 comma-in-args, #49 paren-in-args, clause-order confusion). Phase 5 rewrites the macro expansion to operate on **structured inputs** and emit **AST subtrees**, deleting the string-surgery scaffolding.

---

## 1. The killer advantage: the gate already exists

Phase 0 froze, for all 202 corpus cases, the current macro-expansion output in `<name>.expanded.golden.sql` and `<name>.expanded_win.golden.sql` (window variant). **These goldens ARE the byte-parity oracle for the macro engine.** Rewriting a macro and re-running `TestGoldenCorpus` fails on exactly the cases whose expansion changed — the same mini-differential discipline that made #733 safe, with zero new test infrastructure.

So Phase 5 inherits #733's safety model for free:
- **Byte-parity by default:** new expansion must reproduce the frozen `expanded.golden.sql` exactly.
- **Intended fixes are explicit:** a macro bug fix (#869, #49) changes the expanded golden → promote it, tag it with the issue (exactly the `engine_diff` mechanism). The backlog case `bug_869_conditional_test` is already in the corpus, frozen with its buggy output — Phase 5 flips it to correct.

This is why Phase 5 is *lower risk than #733's Phase 2*, despite touching more code: the oracle is already built and proven.

---

## 2. Scope decision — pragmatic middle, not a parser rewrite

Two ambition levels; **recommend the middle**:

| Level | What | Verdict |
|---|---|---|
| Minimal | Keep macro args as the parser's normalized strings; add clean helpers `splitAlias(s)→{Expr,Alias}` and `splitTrailingClauses(fromTail)→{Source,GroupBy,Having,OrderBy}`; build output via an AST assembly helper instead of string concat. | **Recommended.** Contained to `eval_query.go`; doesn't touch the proven parser. Kills the string surgery and the bug class. |
| Full | Enrich the parser so macro nodes store structured args (`{Expr,Alias}`) and a structured FROM tail; macros become pure `node→node`. | Later refinement. Touches `parser_v2.go` (re-opens the byte-parity surface). Do only if the minimal version leaves meaningful string-parsing behind. |

The minimal level already deletes `_parseMacro`, `_fromIndex`, `findKeywordOutsideBrackets`, and the per-macro `strings.Split`/index-slicing — the bulk of the win — while keeping the parser untouched.

---

## 3. The two foundation pieces (build first, no behavior change)

**F1 — AST assembly builder** (`compat.go` or a new `macro_build.go`): small typed builders so a macro emits a subtree instead of concatenating SQL.
```go
newSelect(items ...selectItem) *selectBuilder
(*selectBuilder) withFrom(...) withGroupBy([]string) withHaving([]string) withOrderBy([]string) *selectBuilder
(*selectBuilder) toEvalAST() *EvalAST      // renders through the existing PrintAST path → normalization free
```
Unit-tested that a hand-built subtree prints to the exact SQL the string version produced (seed from real corpus expanded leaves).

**F2 — structured extraction helpers**: the *one* place string→structure happens, replacing N scattered `strings.Split`/`findKeywordOutsideBrackets` sites.
```go
splitAlias(arg string) (expr, alias string)                 // "sum(agg_value) as value" → ("sum(agg_value)", "value")
splitTrailingClauses(fromTail string) trailingClauses       // {Source, GroupBy, Having, OrderBy}, order-validated once
```
Unit-tested against the actual macro args / FROM tails appearing in the corpus. `splitAlias` is where #869 (comma-in-args) dies — it becomes bracket-aware in ONE place instead of every macro guessing.

---

## 4. Migration — one macro family at a time, each corpus-gated

The 40 functions cluster into independent families. Migrate one, run the corpus, confirm only that family's cases could change, commit. (Mirror of #733 Phase 2's incremental clause-by-clause approach.)

1. `$columns` / `$columnsMs` (the pilot — smallest, clearest; `_columns` at :514).
2. `$rate` / `$rateColumns` / `$rateColumnsAggregated`.
3. `$perSecond` / `$perSecondColumns` / `$perSecondColumnsAggregated`.
4. `$delta` / `$deltaColumns` / `$deltaColumnsAggregated`.
5. `$increase` / `$increaseColumns` / `$increaseColumnsAggregated`.
6. `$lttb` / `$lttbMs`.

Each family task: rewrite on F1/F2 → `go test ./pkg/eval -run TestGoldenCorpus` byte-identical on that family's cases → commit. Simple `$`-token macros (`$timeFilter`, `$from`, …) are pure regex replaces and stay as-is (§2 of the #733 design — they never needed the AST).

**Gate per family:** the frozen `expanded.golden.sql` for cases using that macro stay byte-identical (or, for a fix, flip explicitly with an issue tag).

---

## 5. Cleanup + intended fixes (last)

- Delete `_parseMacro`, `_fromIndex`, `findKeywordOutsideBrackets`, `betweenBraces`-for-macros, per-macro string helpers once no family uses them. (Grep-verify zero callers, like #733 Phase 4.)
- Land the bug fixes that string surgery made hard, each as a corpus `engine_diff`: **#869** (`$conditionalTest` comma-in-args), **#49** (paren in a macro arg), any clause-order edge cases. These become the *asserted* behavior.

---

## 6. Effort, risk, payoff

- **Effort:** ~1.5–2 weeks / ~10–12 tasks (2 foundation + 6 family + 2–3 cleanup/fixes). Comparable to #733 Phase 2 in size.
- **Risk:** **lower than Phase 2.** The byte-parity oracle (corpus expanded goldens) already exists and is proven; each family is independent and small; the parser is untouched (minimal scope). Main risk is the operator-spacing/normalization of the *assembled* output matching the string-concat output byte-for-byte — mitigated because F1 renders through the same `PrintAST`/`renderExpr` the corpus already validates.
- **Payoff:**
  - **Real code reduction** — the string-hunting scaffolding (`_parseMacro`/`_fromIndex`/`findKeywordOutsideBrackets` + per-macro split/slice) is a large fraction of the ~1075 macro lines; estimate **−300…−500 lines**.
  - **A recurring bug class dies by construction** — #869/#49 and clause-order confusion come from string surgery; structured inputs make them unrepresentable.
  - Macros become readable — "read the alias field / read the GROUP BY clause" instead of "split by space / hunt the keyword with a paren counter".

---

## 7. Open questions for the maintainer

1. Byte-parity strictness: must the *assembled* expanded SQL match the string-concat output byte-for-byte (whitespace included), or is semantically-equal acceptable? (Determines whether F1 must reproduce every space the concat produced. Recommend byte-for-byte via the corpus, same as #733.)
2. Minimal vs full scope (§2) — start minimal (no parser change) unless there's appetite to also structure macro args in the parser.
3. Which fixes to fold in (§5): #869 and #49 are the obvious wins; confirm the list and that flipping their frozen goldens to "correct" is desired now vs. tracked separately.

---

## 8. Not in scope

Simple `$`-token macros (pure replaces); time-filter / timezone / extrapolation math (unchanged — only the *structural* string surgery is replaced); the parser (`parser_v2.go`) under the minimal scope; any change to `PrintAST`/`EvalAST` public shape.
