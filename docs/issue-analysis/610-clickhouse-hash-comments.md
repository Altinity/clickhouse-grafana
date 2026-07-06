# Issue #610 — ClickHouse `#` and `#!` comments not supported

> **ADDENDUM (2026-07-05, implemented in branch `fix/610-hash-comments`).** The fix from §4.2 was applied verbatim and works. One correction to §2: on current `master` the symptom is usually **not** a `parse AST error`. `Next()` (`pkg/eval/eval_query.go:1550-1579`) swallows the "cannot find next token" error — the inner closure returns `(false, err)`, but the outer loop checks `if !isNext { break }` *before* `if err != nil`, so scanning silently stops as if EOF. Combined with `regexp2.Multiline` (where `^` also matches after every `\n`), `FindStringMatch` finds a token on a *later* line, and `Next()` chops `len(Token)` chars off the *front* of the string — so `#` lines silently corrupt the query (e.g. leading `#test ` was eaten by a `SELECT` matched two lines down) and any trailing `#` comment on the last line silently truncates the rest. Root cause and fix are unchanged; the error-swallowing in `Next()` is a separate pre-existing bug left untouched.
>
> Second correction, to §3.1 row 9 / §6: `stringRe` protects backtick/double-quoted identifiers only in the **tokenizer** (`ToAST` keeps `` `col#name` `` intact — verified). `RemoveComments` is a raw global replace whose even-quote guard counts only single quotes, so with `skip_comments=true` (the default) it strips from a `#` (and, pre-existing, from a `--`) inside `` `...` ``/`"..."` identifiers to EOL — verified: `` SELECT `col--name` FROM t `` → `` SELECT `col `` even before this fix. Shared long-standing limitation, not a new class; making `RemoveComments` quote-aware for all three quote styles is a possible follow-up.

Deep-dive analysis against the codebase at `/Users/lunaticus/Documents/Work/clickhouse-grafana` (branch `datalinks-fixed`).

- Repo: Altinity ClickHouse datasource plugin for Grafana (TypeScript frontend + Go backend).
- Issue: <https://github.com/Altinity/clickhouse-grafana/issues/610>
- Status at time of writing: **OPEN**, author `antip00` (2024-08-12), one maintainer comment from `Slach`: *"this is not SQL comments"*.
- The issue body is only screenshots (not viewable here). The verbal claim: the plugin does not support ClickHouse `#` and `#!` single-line comments. ClickHouse accepts three comment forms: `--` to EOL, `/* ... */` block, **and** `#` / `#!` to EOL.

---

## 0. TL;DR

The Go backend SQL tokenizer/AST builder (`pkg/eval/eval_query.go`) only recognizes `--` line comments and `/* */` block comments. It runs on **every** query through `ApplyMacrosAndTimeRangeToQuery()`. When the tokenizer's leading-anchored regex (`tokenReComplied`) hits a `#`, no branch matches, `Next()` returns `cannot find next token in [...]`, and the whole query fails to parse (`parse AST error: ...`). The fix is a single new alternation branch in one regex constant (`commentRe`, `pkg/eval/eval_query.go:1950`), mirroring the existing string-literal-aware `--` branch, plus a one-line Monaco highlight rule in the frontend. I empirically verified the proposed regex with `regexp2 v1.12.0` (the exact library the project uses): it strips `#`/`#!` correctly, preserves `#` inside string literals, and handles CRLF and adjacency. **Recommended: implement. Effort: Small (~0.5–1 day including tests).**

---

## 1. Full comment-handling map (every place comments are tokenized / stripped / classified / highlighted)

### 1.1 Backend (Go) — the only functional comment logic

All comment logic lives in `pkg/eval/eval_query.go`. There is **no** comment handling in `pkg/parser.go`, `pkg/query.go`, `pkg/client.go`, or `pkg/datasource.go` — those operate on the already-parsed/expanded SQL.

| Location | Symbol | Role |
|---|---|---|
| `pkg/eval/eval_query.go:1950` | `const commentRe` | **Master comment regex.** Two alternatives: `--` line comment (string-literal-aware) and `/* */` block comment. |
| `pkg/eval/eval_query.go:2051` | `var commentOnlyRe` | `^(?:commentRe)$` with `regexp2.Multiline` — used by `isComment`. |
| `pkg/eval/eval_query.go:2071-2074` | `var tokenRe` | The big alternation that the tokenizer matches one token at a time. `commentRe` is one alternative. |
| `pkg/eval/eval_query.go:2076` | `var tokenReComplied` | `^(?:tokenRe)` compiled with `IgnoreCase + Multiline`. Assigned to `s.re` in `ToAST`. |
| `pkg/eval/eval_query.go:2110-2113` | `func isComment` | `commentOnlyRe.MatchString(token)` — classifies a whole token as a comment. |
| `pkg/eval/eval_query.go:1777-1779` | `ToAST` comment branch | When a token isComment, it is appended to the current `argument` (preserved into AST, not dropped). |
| `pkg/eval/eval_query.go:1934-1936` | `func RemoveComments` | `regexp2.MustCompile(commentRe,0).Replace(query,"",0,-1)` — strips comments when `skip_comments` is on. |

### 1.2 The master regex, character-by-character (`pkg/eval/eval_query.go:1950`)

```go
const commentRe = `--(([^\'\n]*[\']){2})*[^\'\n]*(?=\n|$)|` + `/\*(?:[^*]|\*[^/])*\*/`
```

Alternative A — the `--` line comment (string-literal-aware):

```
--                 literal "--"
(                  group, repeated * times:
  ([^'\n]*[']){2}    two runs of "non-quote-non-newline chars then a single quote"
)*                 → consumes an EVEN number of quotes (balanced ' ' pairs)
[^'\n]*            then any non-quote-non-newline run (the tail, with no unpaired quote)
(?=\n|$)           lookahead: must end at newline or end-of-string (does NOT consume \n)
```

The `{2}` even-quote-pairing is the trick that makes `--` aware of single-quoted strings: a `--` is only treated as a comment if the rest of the line contains an *even* number of `'`. This prevents a literal `--` that lives inside `'...--...'` from being eaten — see AST case 20 (`pkg/eval/eval_query_test.go:1559-1581`) and the `RemoveComments` assertion (`:1882-1891`). Note: it only balances **single** quotes; it does not account for backtick/double-quoted identifiers, but in practice `--`/`#` inside a backtick identifier is exotic and not currently handled for `--` either.

Alternative B — the `/* */` block comment:

```
/\*                 literal "/*"
(?:[^*]|\*[^/])*    any char that is not "*", OR a "*" not followed by "/"
\*/                 literal "*/"
```

**What it MISSES:** there is no `#` or `#!` alternative at all. ClickHouse `#`/`#!` line comments are simply not recognized anywhere.

### 1.3 Frontend (TypeScript) — Monaco syntax highlighting only

`src/views/QueryEditor/components/QueryTextEditor/editor/initiateEditor.ts:99-115` registers a Monarch tokenizer:

```ts
[new RegExp(`--.*$`), TokenType.COMMENT],           // line 105 — only "--"
[new RegExp("```.*```"), TokenType.COMMENT_BLOCK],   // line 106 — triple-backtick, NOT /* */
[new RegExp("'.*?'"), TokenType.STRING],             // line 109
```

Findings:
- Only `--` is highlighted as a comment. There is **no** `#`/`#!` rule, and (separately) no `/* */` rule either (the block rule matches triple backticks, which is not even ClickHouse syntax).
- This is **cosmetic only** — Monaco highlighting does not affect query execution. It is purely for editor coloring. A missing rule here means `#` text is not greyed-out; it does **not** cause the failure in the issue.
- There is no `monaco.languages.setLanguageConfiguration` call, so there is no comment-toggle (Ctrl+/) behavior to update.

### 1.4 Confirmation: no other comment stripping anywhere

`grep` across `src/datasource/sql-query/`, `src/datasource/`, and `pkg/` found **no** other comment-stripping or `#`-handling code. The only `#` work needed is the backend `commentRe` and the cosmetic Monaco rule.

---

## 2. Full call path: from a panel query to the parse error

For a normal panel query (frontend datasource path):

1. `src/datasource/datasource.ts:833` sends `skip_comments` (and the raw SQL) to the backend resource/query handler.
2. Backend entry (live query): `pkg/datasource.go:65` → `evalQuery.ApplyMacrosAndTimeRangeToQuery()`.
   (Resource/preview paths: `pkg/resource_handlers.go:281, 557, 953` also call the same method, and several call `scanner.ToAST()` directly at `:293, :330, :472, :568, :658, :719, :975`.)
3. `ApplyMacrosAndTimeRangeToQuery` (`pkg/eval/eval_query.go:166`) → `q.replace(q.Query)` (`:174`).
4. `replace` builds a scanner and calls `scanner.ToAST()` (`pkg/eval/eval_query.go:217-221`):
   ```go
   scanner := NewScanner(query)
   ast, err := scanner.ToAST()
   if err != nil {
       return "", fmt.Errorf("parse AST error: %v ", err)   // ← user sees this
   }
   ```
5. `ToAST` (`:1637`) sets `s.re = tokenReComplied` (`:1644`) and loops calling `s.Next()` (`:1649`).
6. `Next()` (`:1550-1579`) does `s.re.FindStringMatch(s._s)`. The regex is **leading-anchored** (`^(?:tokenRe)`). When the remaining string starts with `#`, **no** alternative in `tokenRe` matches, so `FindStringMatch` returns `nil`:
   ```go
   r, err := s.re.FindStringMatch(s._s)
   if err != nil || r == nil {
       return false, fmt.Errorf("cannot find next token in [%v]", s._s)   // pkg/eval/eval_query.go:1556-1559
   }
   ```
7. Error bubbles up: `ToAST` → `replace` wraps it as `parse AST error: cannot find next token in [# ...]` → returned to Grafana as the query error.

**Important nuance:** the failure happens *regardless of `skip_comments`*. `skip_comments` only controls the later `RemoveComments` call (`:229-234`), but `ToAST()` (which tokenizes the whole query, including any `#`) runs **before** that and **always** runs. So even a user who wants to keep comments cannot run a query that merely *contains* `#`. This makes the bug strictly a parse/tokenize bug, not a stripping bug.

I empirically reproduced this with `regexp2 v1.12.0`: the leading-anchored token regex returns `<nil>` for input `"# comment\nrest"` under the old regex, and a proper `"# comment"` match under the new regex (see §4.4).

---

## 3. ClickHouse comment semantics (authoritative)

ClickHouse supports three comment styles (per the SQL-reference "Syntax" docs and the lexer in `src/Parsers/Lexer.cpp`):

1. `--` … to end of line.
2. `/* … */` block (non-nesting in standard CH lexer).
3. `#` … to end of line, **and** `#!` … to end of line.

Details on `#` / `#!`:
- Both `#` and `#!` comment to the **end of the line** (newline terminates them; they do not consume the newline).
- `#!` is **not** semantically different from `#` for the parser — it exists so that a `.sql` script can start with a `#!/usr/bin/clickhouse-local` shebang and still parse. Anywhere in the query, `#!` behaves exactly like `#` followed by `!…` text on that line. There is no "first-line-only" restriction inside the SQL grammar; the shebang convenience is just that the lexer treats `#!` as the start of a line comment too.
- `#` does **not** require leading whitespace. `a#b` comments `#b`. (Verified empirically in §4.4 — `a#b\nX` → `a\nX`.) This matches ClickHouse.

Where `#` MUST NOT be treated as a comment:
- Inside single-quoted **string literals**: `WHERE col = '# not a comment'`.
- Inside backtick or double-quoted **identifiers**: `` SELECT `col#name` `` / `SELECT "col#name"`.
- Inside a `/* ... # ... */` block comment (it is already part of the block).

### 3.1 Tricky-input table

| # | Input | `#` is a comment? | Expected after RemoveComments |
|---|---|---|---|
| 1 | `# hash comment\nSELECT 1` | yes (whole first line) | `\nSELECT 1` |
| 2 | `#! shebang\nSELECT 1` | yes | `\nSELECT 1` |
| 3 | `SELECT 1 # trailing` | yes (trailing) | `SELECT 1 ` |
| 4 | `SELECT col # c1\nFROM t # c2\n` | yes (both) | `SELECT col \nFROM t \n` |
| 5 | `WHERE col='# not a comment'` | **no** (inside string) | unchanged |
| 6 | `WHERE col='# x' # real` | only the trailing `# real` | `WHERE col='# x' ` |
| 7 | `WHERE a='x' AND b='# nope' AND c=1 # yes` | only trailing `# yes` | `... c=1 ` |
| 8 | `SELECT 1 -- dash\n# hash\n` | both `--` and `#` | `SELECT 1 \n\n` |
| 9 | `` SELECT `col#name` FROM t `` | **no** (backtick identifier) | unchanged (see risk §6) |
| 10 | `a#b\nX` (no space before `#`) | yes (CH does not need space) | `a\nX` |
| 11 | `SELECT 1 # c\r\nFROM t` (CRLF) | yes | `SELECT 1 \nFROM t` |

Rows 1–8, 10, 11 are all confirmed correct with the proposed regex (§4.4). Row 9 (backtick-identifier with `#`) is a pre-existing limitation shared with `--` and is out of scope (see §6).

---

## 4. The fix

### 4.1 `skip_comments` / RemoveComments plumbing (and how the fix interacts)

- `skip_comments` is a per-query boolean. Frontend default is `true` (`src/views/QueryEditor/helpers/initializeQueryDefaults.ts:14,125`; `src/views/QueryEditor/hooks/useQueryState.ts:35`). It is plumbed to the backend (`src/datasource/datasource.ts:833`) and read in Go (`pkg/eval/eval_query.go:42`, mapped at `:2432`; also in `pkg/resource_handlers.go:45,104,157`).
- When `true`, `replace()` calls `scanner.RemoveComments(query)` (`pkg/eval/eval_query.go:229-234`) which strips comments **after** macro expansion.
- **Crucial interaction:** `ToAST()` runs unconditionally *before* `RemoveComments`. So the `#` parse failure occurs irrespective of the flag. Therefore the fix MUST be in `commentRe` itself (which feeds both the tokenizer `tokenRe` and `RemoveComments`), not merely a pre-strip. Because `commentRe` is shared, **one** edit fixes both tokenization and stripping at once.
- After the fix: when `skip_comments=true`, `#`/`#!` comments are removed before the SQL reaches ClickHouse (defensive — ClickHouse would accept them anyway). When `skip_comments=false`, the `#` lines are tokenized as `isComment` tokens and preserved in the AST (same behavior as `--` today), and ClickHouse executes them fine.

### 4.2 Exact new regex (string-literal-aware, mirrors the `--` branch)

Add a `#!?` branch identical in structure to the `--` branch. The `!?` makes the optional shebang `!` part of the comment-open so `#!` is recognized; the rest of the line logic is reused verbatim.

New `commentRe` (replace `pkg/eval/eval_query.go:1950`):

```go
const commentRe = `--(([^\'\n]*[\']){2})*[^\'\n]*(?=\n|$)|` +
	`#!?(([^\'\n]*[\']){2})*[^\'\n]*(?=\n|$)|` +
	`/\*(?:[^*]|\*[^/])*\*/`
```

The new middle alternative, char-by-char:

```
#!?                literal "#", optionally followed by "!"  → matches both # and #!
(([^'\n]*[']){2})* even number of single quotes on the line (string-literal-aware)
[^'\n]*            tail with no unpaired quote
(?=\n|$)           ends at newline or EOF (newline not consumed)
```

This is byte-for-byte the same tail as the `--` branch, so behavior (string-pairing, multiline-only via `(?=\n|$)`, CRLF) is identical and consistent.

### 4.3 Ordering in `tokenRe` (proving quoted `#` is safe)

`tokenRe` (`pkg/eval/eval_query.go:2071-2074`):

```go
statementRe, macroFuncRe, joinsRe, inRe, wsRe, commentRe, idRe, stringRe, powerIntRe, floatRe, intRe, ...
```

`commentRe` comes **before** `stringRe`. One might worry the comment rule eats a string. It does not, and ordering does not need to change:

- The tokenizer is **leading-anchored** (`^(?:...)`). At each step it only matches what is at the *front* of the remaining string.
- The comment alternatives only begin with `--`, `#`, or `/*`. A string literal begins with `'`, `` ` ``, or `"`. So when the cursor sits on a `'`, the comment branch cannot match at all (it requires `#`/`--`/`/*` as the first chars); `stringRe` matches the whole `'...'`. The `#` inside that string is consumed as part of the string token and never seen by the comment rule.
- Conversely, when the cursor sits on a `#`, that `#` is genuinely outside any string (the preceding string token was already consumed), so treating it as a comment is correct.
- The `(([^'\n]*[']){2})*` even-quote logic is a secondary safety net for the *same-line* `--`/`#`-after-text case (e.g. `WHERE col='# x' # real`): the `# real` only matches as a comment because the preceding `'# x'` contributes an even (2) quote count.

Empirically confirmed (§4.4): leading-anchored match of `'# not comment' rest` returns the **string** `'# not comment'` (not a comment) under both old and new regex; `# comment\nrest` returns `# comment` only under the new regex.

`commentOnlyRe` (`:2051`) and `isComment` (`:2110`) automatically pick up the new branch since they are built from the same `commentRe`. The `isComment` branch in `ToAST` (`:1777-1779`) then preserves `#` comments in the AST exactly like `--`.

### 4.4 Empirical verification (regexp2 v1.12.0, the project's exact library)

I ran the proposed regex through `github.com/dlclark/regexp2 v1.12.0` (matching `go.mod:7`). Results:

RemoveComments (replace-all):
```
"# a hash comment\nSELECT 1"                  OLD: unchanged           NEW: "\nSELECT 1"
"#! shebang style\nSELECT 1"                  OLD: unchanged           NEW: "\nSELECT 1"
"SELECT 1 # trailing comment"                 OLD: unchanged           NEW: "SELECT 1 "
"SELECT col # c1\nFROM t # c2\n"              OLD: unchanged           NEW: "SELECT col \nFROM t \n"
"WHERE col='# not a comment'"                 OLD: unchanged           NEW: unchanged   ✅ negative
"WHERE col='# not a comment' # real comment"  OLD: unchanged           NEW: "...comment' "
"WHERE a='x' AND b='# nope' AND c=1 # yes"    OLD: unchanged           NEW: "...c=1 "    ✅ even-quote
"SELECT 1 -- dash\n# hash\n"                  OLD: "SELECT 1 \n# hash\n" NEW: "SELECT 1 \n\n"
```

Leading-anchored tokenizer match (what `Next()` does):
```
"# comment\nrest"        OLD: <nil> (→ parse error)   NEW: "# comment"
"#! comment\nrest"       OLD: <nil> (→ parse error)   NEW: "#! comment"
"'# not comment' rest"   OLD: "'# not comment'"        NEW: "'# not comment'"   ✅ string wins
"'string' # after"       OLD: "'string'"              NEW: "'string'"
```

`isComment` (`^(?:commentRe)$`, Multiline):
```
isComment("# whole token comment") = true
isComment("#! shebang token")      = true
isComment("-- dash token")         = true
isComment("/* block */")           = true
isComment("SELECT 1")              = false
isComment("col='# x'")             = false   ✅ negative
```

CRLF & adjacency:
```
"SELECT 1 # comment\r\nFROM t"  → "SELECT 1 \nFROM t"   (\r consumed, \n kept)
"a#b\nX"                        → "a\nX"
"SELECT col#c\nX"               → "SELECT col\nX"
```

All positive cases strip, the negative string-literal case is preserved, CRLF is clean, and the old behavior (the cause of the issue) is reproduced as `<nil>` → parse error.

### 4.5 Frontend Monaco rule (cosmetic)

Add after `initiateEditor.ts:105` (the `--` rule):

```ts
[new RegExp(`#!?.*$`), TokenType.COMMENT],
```

Optionally also fix the (separate, pre-existing) missing block-comment highlight — out of scope for #610 but worth noting. No `setLanguageConfiguration` change is required; this is purely coloring.

---

## 5. Alternative approaches (with tradeoffs) and recommendation

**A. Add a `#!?` branch to `commentRe` (RECOMMENDED).**
- Pros: one-line change to a single shared constant; automatically fixes tokenizer (`tokenRe`), `isComment`, `commentOnlyRe`, and `RemoveComments`; reuses the proven string-literal-aware structure; symmetric with `--`; preserves comments in AST when `skip_comments=false`. Empirically verified.
- Cons: shares the `--` branch's pre-existing limitation re backtick/double-quoted identifiers (acceptable; same as today).

**B. Pre-strip pass: a separate regex applied to the raw query before `ToAST`.**
- Pros: conceptually isolates `#` handling.
- Cons: would always strip `#` comments even when `skip_comments=false` (loses the "preserve comments" behavior `--` enjoys); duplicates string-literal-awareness logic; an extra full-string pass; inconsistent with how `--`/`/* */` are handled. Rejected.

**C. Dedicated lexer/token type for `#` separate from `commentRe`.**
- Pros: none meaningful here.
- Cons: more code, must be wired into `tokenRe` order, `isComment`, AST branch, and `RemoveComments` separately; higher risk of inconsistency. Rejected.

**Recommendation: Approach A.** It is minimal, consistent, and verified.

---

## 6. Edge cases & risks (concrete)

| Case | Behavior with fix | Notes / Risk |
|---|---|---|
| `#` inside single-quoted string | preserved | ✅ verified (rows 5,6,7) |
| `#` inside backtick/double-quoted identifier ``(`col#x`)`` | **would be wrongly treated as comment if `#` is the start of a leading token after the identifier closes**; but inside the quoted token it is safe because `stringRe` (which includes backtick & double-quote) consumes the whole identifier first. So `` `col#x` `` is safe. | Low risk — `stringRe` (`:1955`) covers `'…'`, `` `…` ``, and `"…"`, so identifiers are consumed as tokens before any `#` is examined. The even-quote pairing only counts single quotes though, so a *same-line* mix of single-quote string + backtick-identifier + trailing `#` could in theory miscount — same pre-existing caveat as `--`. Extremely rare. |
| `#` in macro args, e.g. `$rate(... # x ...)` | The subquery between braces is re-parsed via `toAST` → `#` handled identically. | ✅ consistent |
| Multi-line: several `#` lines | each line stripped to its newline; `isComment` is Multiline so a whole multi-`#` block is classified as comment | ✅ verified |
| `#` at column 0 vs mid-line | both work; no leading-whitespace requirement | ✅ verified (`a#b`, `col#c`) — matches ClickHouse |
| CRLF (`\r\n`) | `\r` consumed into comment, `\n` retained | ✅ verified |
| `#!` shebang first line | treated as comment | ✅ verified |
| `#` adjacent to `--` (`-- a # b` / `# a -- b`) | first-matched comment opener wins to EOL; the rest of the same line is inside that comment | ✅ consistent with `--` semantics |
| Empty `#` at EOF (`SELECT 1 #`) | `[^'\n]*` matches empty, `(?=$)` succeeds | trailing `#` stripped |
| Performance | one extra alternation; negligible | regexp2 backtracking on pathological quote-heavy lines is the same class as the existing `--` branch | 
| Regression risk to `--` / `/* */` | none — branches are independent alternations; existing tests (AST cases 18, 20; `RemoveComments` assertion) unaffected | re-run full suite to confirm |

---

## 7. Complete test plan

### 7.1 Backend — `pkg/eval/eval_query_test.go`

Extend the AST test table (after AST case 20, `:1559-1581`) and the `RemoveComments` assertion block (`:1880-1891`). Follow the exact `newASTTestCase(name, query, expectedAST)` pattern.

Positive AST cases (mirror AST case 18 / 20):
1. **`#` line comment at top** — `"# top comment\nSELECT * FROM $table\nWHERE x=1"`; expect `root` Arr contains `"# top comment\n"`, select=`*`, etc. (parity with AST case 20's `--test one line comment1\n`).
2. **`#!` shebang at top** — `"#! /usr/bin/clickhouse-local\nSELECT * FROM $table"`; expect `root` Arr contains `"#! /usr/bin/clickhouse-local\n"`.
3. **Inline `#` after WHERE clause** — `"SELECT * FROM $table\nWHERE x=1 # inline comment\nAND y=2 # second"`; expect where Arr like `"x = 1# inline comment\n"`, `"AND y = 2# second\n"` (parity with AST case 20 inline `--`).
4. **Mixed `--`, `/* */`, `#`, `#!`** — extend AST case 18 style with a `# comment` and `#! comment` line in the leading comment block; expect them preserved in `root`.

Critical NEGATIVE cases (must-have):
5. **`#` inside string literal** — `"SELECT * FROM $table\nWHERE title='# not a comment'"`; expect where Arr = `"title = '# not a comment'"` (the `#` must remain). This is the analogue of AST case 20's `'-- test not comment1'`.
6. **String with `#` + real trailing `#` comment** — `"WHERE col='# nope' # real"`; expect the string preserved and `# real` treated as comment.

`RemoveComments` assertions (extend the block at `:1880-1891`):
7. Add a test case whose query contains `#`/`#!` and assert `scanner.RemoveComments(query)` strips them while preserving `'# not a comment'` strings. Concretely assert, e.g.:
   - in: `"#h\nSELECT *\nFROM $table\nWHERE title='# not comment' # c1\nAND user_info='x # y' # c2"`
   - out: `"\nSELECT *\nFROM $table\nWHERE title='# not comment' \nAND user_info='x # y' "`

`isComment` unit checks (optional, direct): assert `isComment("# x")`, `isComment("#! x")` are true and `isComment("col='# x'")` is false.

End-to-end parse regression: a test asserting `EvalQuery{Query:"SELECT 1 # c\nFROM $table", ...}.ApplyMacrosAndTimeRangeToQuery()` returns **no error** (today it returns `parse AST error: cannot find next token in [# c...]`). This directly encodes the issue.

### 7.2 Frontend

- The Monaco rule is cosmetic; there is no existing Jest test for `initiateEditor.ts` tokenization (it depends on the Monaco runtime). If desired, add a lightweight regex unit test asserting `/#!?.*$/` matches `# x` and `#! x`. Low priority.
- Optional Playwright E2E (`tests/e2e/features/`): enter a query with a `#` comment in the SQL editor and assert it runs (panel returns data, no error). Useful but heavier; the Go tests cover the core fix.

### 7.3 Commands

```bash
# backend
go test ./pkg/eval/...        # or: mage test (per project)
# frontend
npm run test
npm run lint
```

---

## 8. Effort breakdown

| Sub-task | Estimate |
|---|---|
| Edit `commentRe` (`pkg/eval/eval_query.go:1950`) | 0.1 h |
| Backend tests: 6–8 new AST cases + RemoveComments + parse-no-error | 2–3 h |
| Frontend Monaco rule (`initiateEditor.ts`) | 0.2 h |
| (Optional) frontend/E2E test | 1 h |
| Run suites, lint, fix fallout, manual smoke in Grafana | 1–1.5 h |
| **Total** | **~0.5–1 day** |

**Final sizing: SMALL (S).** Single-constant core change, well-trodden test pattern, empirically de-risked.

---

## 9. Interpreting Slach's "this is not SQL comments" — implement or close?

Slach's comment ("this is not SQL comments") most plausibly reflects the position that `#`/`#!` are not part of *standard* ANSI SQL comments (which are `--` and `/* */`). That is technically true for the SQL standard — but it is **not** true for ClickHouse, whose lexer (`src/Parsers/Lexer.cpp`) explicitly treats `#` and `#!` as line comments. Since this plugin's entire job is to talk to ClickHouse, "ClickHouse accepts it, the plugin rejects it" is a genuine compatibility gap: a query a user can run in `clickhouse-client` fails in Grafana with an opaque `parse AST error: cannot find next token`.

The strongest argument to implement: the failure is a hard parse error on **valid ClickHouse SQL**, independent of `skip_comments`, with a confusing error message. Even users who never write `#` comments themselves can hit it by pasting a query that has one.

**Recommendation: IMPLEMENT.** Confirm with maintainers:
1. Whether they want `#`/`#!` recognized as comments (parity with ClickHouse) — strong yes argument above.
2. Whether `skip_comments=true` should *strip* `#` comments (yes, for consistency with `--`/`/* */`) — the proposed shared-`commentRe` fix gives this for free.
3. Whether they prefer the cosmetic Monaco highlight too (recommended, trivial).

If maintainers decline (treat as wontfix), at minimum improve the error message in `Next()` (`:1556-1559`) to hint that `#` comments are unsupported — but implementing is cheaper and better.

---

## 10. Step-by-step execution checklist

1. **Branch** off `master` (or current working branch) e.g. `fix/610-hash-comments`.
2. **Edit** `pkg/eval/eval_query.go:1950` — replace `commentRe` with the three-alternative version in §4.2 (`--`, `#!?`, `/* */`). No other Go code changes needed; `tokenRe`, `commentOnlyRe`, `isComment`, `RemoveComments` all consume the same constant.
3. **Add backend tests** in `pkg/eval/eval_query_test.go`: the AST cases (positive `#`/`#!`, negative string-literal), extend the `RemoveComments` assertion block (`:1880-1891`), and an `ApplyMacrosAndTimeRangeToQuery` no-error regression (§7.1).
4. **Run** `go test ./pkg/eval/...` (or `mage test`); ensure all existing + new pass.
5. **Edit** `src/views/QueryEditor/components/QueryTextEditor/editor/initiateEditor.ts` — add `[new RegExp(\`#!?.*$\`), TokenType.COMMENT]` after line 105.
6. **Run** `npm run test` and `npm run lint`.
7. **Manual smoke**: `docker compose up --no-deps -d grafana clickhouse`, open a panel, run `SELECT 1 # hi\nFROM numbers(3)` and `WHERE x='# not a comment'`; confirm both behave (former runs, latter keeps the string). Toggle `skip_comments` and verify stripping vs preservation.
8. **Commit** referencing #610; PR description should note: ClickHouse-specific `#`/`#!` line comments, string-literal-aware, parity with `--`, plus Monaco highlight; empirically verified with regexp2.
9. **(Optional)** add a Playwright E2E and/or fix the unrelated `/* */` Monaco highlight, noting it is out of scope for #610.

---

### Key file:line references
- `pkg/eval/eval_query.go:1950` — `commentRe` (the fix site)
- `pkg/eval/eval_query.go:2071-2076` — `tokenRe` / `tokenReComplied`
- `pkg/eval/eval_query.go:2051`, `:2110-2113` — `commentOnlyRe` / `isComment`
- `pkg/eval/eval_query.go:1934-1936` — `RemoveComments`
- `pkg/eval/eval_query.go:1556-1559` — `Next()` error origin
- `pkg/eval/eval_query.go:166-234`, `:1637-1793` — `ApplyMacrosAndTimeRangeToQuery` / `replace` / `ToAST` (call path)
- `pkg/eval/eval_query.go:1777-1779` — AST comment-preservation branch
- `pkg/datasource.go:65`, `pkg/resource_handlers.go:281,557,953` — backend entry points
- `pkg/eval/eval_query_test.go:1447-1581`, `:1880-1891` — existing comment test cases (AST 18, 20) and `RemoveComments` assertion
- `src/views/QueryEditor/components/QueryTextEditor/editor/initiateEditor.ts:105` — Monaco `--` rule (add `#` rule here)
- `src/datasource/datasource.ts:833`, `src/views/QueryEditor/helpers/initializeQueryDefaults.ts:14,125` — `skip_comments` plumbing/defaults
