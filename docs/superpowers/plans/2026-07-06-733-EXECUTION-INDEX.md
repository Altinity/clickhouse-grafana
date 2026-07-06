# #733 Parser Rewrite — Execution Index (hand this to the executor)

This is the entry point for an agent executing the #733 work. Read this file first,
then execute the plan files in order. **You are executing, not designing.** Every
decision is already made in the plan files. If reality diverges from a plan step's
"Expected" output, STOP and report — do not invent a fix.

## How to execute each plan

1. Open the current plan file (see sequence below).
2. Use the **superpowers:executing-plans** skill.
3. Work top to bottom. Each task is TDD: write the failing test → run it, see it fail
   → implement → run it, see it pass → commit. Do the steps literally and in order.
4. After each task, run the task's final test command and confirm it matches "Expected".
5. At each plan's **Completion criteria**, run every listed check. All must pass before
   the next plan. Do not skip ahead.
6. When a plan ends with a **STOP** section, stop there and report. Do not begin the
   next stage's work — its plan does not exist yet and must be authored with full
   context first.

## The sequence

| Order | Plan file | What it does | Touches prod code? | Gate |
|---|---|---|---|---|
| 1 | `2026-07-06-backend-pre-parser-stabilization.md` | Stage A: safe AST accessors, panic fixes, marshal sweep, dedup 3 handlers, golangci-lint | **Yes** | goldens byte-identical after refactor; lint green |
| 2 | `2026-07-06-733-phase0-golden-corpus.md` | Phase 0: golden corpus + oracle; freezes current behavior | **No** (tests/data only) | `TestGoldenCorpus` green ×2; ≥40 cases |
| 3 | *(author after Phase 0 gate)* | Phase 1: state-machine lexer, differential token test | No (test-gated, opt-in) | token streams match legacy on corpus + fuzz |
| 4 | *(author after Phase 1 gate)* | Phase 2: recursive-descent parser + compat, engine flag | Yes (behind flag, default legacy) | **byte-identical** corpus on both engines |
| 5 | *(author after Phase 2 gate)* | Phase 3: flip default to v2; burn-in | Yes (default change) | full suite + testflows green, 1 release |
| 6 | *(author after Phase 3 gate)* | Phase 4: delete legacy + land intended fixes | Yes | corpus green; issues closed w/ regression cases |

Plans 3–6 are deliberately NOT written yet. Each depends on the previous stage's
outputs (e.g. Phase 1's differential test needs Phase 0's corpus; Phase 2's byte-parity
targets need Phase 1's token model). Writing them now would be guesswork. After a gate
passes, request the next plan.

## Design reference

The full design (frozen contract, architecture, normalization semantics, quirk table,
risks) is in `docs/superpowers/specs/2026-07-06-733-parser-rewrite-design.md`. Read it
once before starting so the plans make sense; consult its §2 (frozen contract) whenever
a step mentions "preserve behavior."

## Hard rules that apply to every plan

- **Never hand-edit a `.golden.*` file.** Regenerate via the `-update` flag and justify
  the diff. A changed golden = a behavior change and must be intentional.
- **The public API of `pkg/eval` does not change** through Phase 3 (signatures and
  behavior). Design doc §2.1 lists the frozen surface.
- **Commit after every task** with the message given in the plan. No Co-Authored-By
  trailer (repo owner preference).
- **A panic is never acceptable output.** If a step surfaces a panic on some input,
  that is a finding to report, not a thing to swallow.
- Run `go test ./pkg/...` at the end of every task; it must be green before committing.

## Escalate to a human / higher-effort model when

- A plan's STOP section is reached (next plan must be authored).
- The three maintainer questions in design doc §7.5 need answers (they block Phase 2):
  1. Is `PrintAST` byte-format a hard contract, or is equivalent-SQL acceptable?
  2. Is a test-only dependency on AfterShip acceptable?
  3. Confirm the `$adhoc`-with-zero-filters divergence disposition.
- Any step's actual output contradicts its "Expected" and the cause is not obvious.
- A dashboard query in Phase 0 causes a **panic** (not a normal error) — quarantine it
  in `corpus_broken/` and report; do not try to fix the parser (that is Phase 4).

## What "done" looks like for the whole epic

The legacy `regexp2` tokenizer and flat `ToAST` loop are deleted, `pkg/eval` runs on the
v2 lexer+parser, the golden corpus proves no unintended behavior change occurred, the
`regexp2` dependency is gone, and the structurally-impossible-before bugs (#565, #277,
#38, #871, #319, #610, #121, #799, table-function whitelist) are fixed with regression
cases. Macro-engine-on-AST ("Phase 5") is a separate epic, designed later.
