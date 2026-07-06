# Backend Pre-Parser Stabilization (Stage A of #733) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `pkg/` panic-free, characterization-tested, and deduplicated so the #733 parser swap has one integration point and a safety net.

**Architecture:** Add safe `EvalAST` accessors in `pkg/eval/ast_access.go`; pin current HTTP-handler behavior with fixture-based characterization tests; replace the three copy-pasted parse→inject→print blocks in `pkg/resource_handlers.go` with shared `buildQueryContext`/`applyAdhocFiltersToAST` in a new `pkg/query_context.go`; sweep ignored `json.Marshal` errors; add golangci-lint to CI.

**Tech Stack:** Go 1.26, `grafana-plugin-sdk-go` (`backend.CallResourceRequest`/`CallResourceResponseSender`), stdlib `testing` + `testify/require` (already used in `pkg/eval`), golangci-lint v2.

**Design doc:** `docs/superpowers/specs/2026-07-06-733-parser-rewrite-design.md` (§6 locks the interfaces this plan implements).

## Global Constraints

- Public API of `pkg/eval` MUST NOT change (signatures and behavior; design doc §2).
- Generated SQL byte-output MUST NOT change in this stage, with one exception: inputs that currently **panic** may start returning errors, and `PrintAST` of `$lttbMs` (currently a panic) may start printing correctly.
- The `$adhoc`-replacement divergence between `handleApplyAdhocFilters` (replaces even with 0 filters) and `handleProcessQueryBatch` (replaces only when filters present) MUST be preserved via the `replaceAdhocMacroAlways` flag — do NOT unify in this stage.
- Commit messages: no Co-Authored-By trailer (user preference).
- Every task ends with `go test ./pkg/... ` green.

---

### Task 1: Characterization harness + goldens for `handleCreateQuery` and `handleApplyAdhocFilters`

**Files:**
- Create: `pkg/resource_handlers_test.go`
- Create: `pkg/testdata/handlers/create_query_basic.req.json`
- Create: `pkg/testdata/handlers/apply_adhoc_basic.req.json`
- Create: `pkg/testdata/handlers/apply_adhoc_macro.req.json` (query containing `$adhoc`, 0 filters)

**Interfaces:**
- Consumes: existing `(*ClickHouseDatasource).handleCreateQuery`, `handleApplyAdhocFilters` (`pkg/resource_handlers.go:258, :316`).
- Produces: `captureSender` test type and `runHandlerGolden(t, name, handler, reqFile)` helper — Tasks 3, 6, 7 rely on these exact names.

- [ ] **Step 1: Write the harness and passing characterization tests**

These tests pin CURRENT behavior (they pass immediately by design — that is the point of characterization; the "fail" phase is the golden-update mechanism catching future drift).

```go
// pkg/resource_handlers_test.go
package main

import (
	"context"
	"encoding/json"
	"flag"
	"os"
	"path/filepath"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

var updateGolden = flag.Bool("update", false, "rewrite handler golden files")

type captureSender struct {
	resp *backend.CallResourceResponse
}

func (c *captureSender) Send(r *backend.CallResourceResponse) error {
	c.resp = r
	return nil
}

type handlerFunc func(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error

func runHandlerGolden(t *testing.T, name string, handler handlerFunc, reqFile string) {
	t.Helper()
	body, err := os.ReadFile(filepath.Join("testdata", "handlers", reqFile))
	require.NoError(t, err)

	sender := &captureSender{}
	err = handler(context.Background(), &backend.CallResourceRequest{Body: body}, sender)
	require.NoError(t, err)
	require.NotNil(t, sender.resp, "handler sent no response")

	got := map[string]interface{}{
		"status": sender.resp.Status,
		"body":   json.RawMessage(sender.resp.Body),
	}
	gotJSON, err := json.MarshalIndent(got, "", "  ")
	require.NoError(t, err)

	goldenPath := filepath.Join("testdata", "handlers", name+".golden.json")
	if *updateGolden {
		require.NoError(t, os.WriteFile(goldenPath, gotJSON, 0o644))
		return
	}
	want, err := os.ReadFile(goldenPath)
	require.NoError(t, err, "run with -update to create golden")
	require.JSONEq(t, string(want), string(gotJSON))
}

func TestHandlerCharacterization(t *testing.T) {
	ds := &ClickHouseDatasource{}
	cases := []struct {
		name    string
		handler handlerFunc
		reqFile string
	}{
		{"create_query_basic", ds.handleCreateQuery, "create_query_basic.req.json"},
		{"apply_adhoc_basic", ds.handleApplyAdhocFilters, "apply_adhoc_basic.req.json"},
		{"apply_adhoc_macro", ds.handleApplyAdhocFilters, "apply_adhoc_macro.req.json"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			runHandlerGolden(t, tc.name, tc.handler, tc.reqFile)
		})
	}
}
```

Fixtures:

```json
// pkg/testdata/handlers/create_query_basic.req.json
{
  "refId": "A",
  "query": "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t ORDER BY t",
  "dateTimeColDataType": "event_time",
  "dateColDataType": "event_date",
  "dateTimeType": "DATETIME",
  "database": "default",
  "table": "test_grafana",
  "interval": "30s",
  "intervalFactor": 1,
  "round": "0s",
  "timeRange": {"from": "2025-01-02T03:04:05Z", "to": "2025-01-02T04:05:06Z"}
}
```

```json
// pkg/testdata/handlers/apply_adhoc_basic.req.json
{
  "query": "SELECT t, c FROM default.test_grafana WHERE event_time > toDateTime(0)",
  "adhocFilters": [{"key": "default.test_grafana.service_name", "operator": "=", "value": "mysql"}],
  "target": {"database": "default", "table": "test_grafana"}
}
```

```json
// pkg/testdata/handlers/apply_adhoc_macro.req.json
{
  "query": "SELECT t, c FROM default.test_grafana WHERE $adhoc",
  "adhocFilters": [],
  "target": {"database": "default", "table": "test_grafana"}
}
```

Note: `Target` struct — check its exact JSON tags at `pkg/resource_handlers.go` (search `type Target struct`) before finalizing fixtures; adjust field names if they differ from `database`/`table`.

- [ ] **Step 2: Generate goldens and verify they are deterministic**

Run: `go test ./pkg/ -run TestHandlerCharacterization -args -update && go test ./pkg/ -run TestHandlerCharacterization -count=2 -v`
Expected: first command writes 3 `.golden.json` files; second passes twice (PASS ×3 subtests, no diff between runs).

- [ ] **Step 3: Inspect goldens by eye**

Open the three generated `pkg/testdata/handlers/*.golden.json`; confirm `create_query_basic` contains expanded SQL (no `$timeSeries` left), `apply_adhoc_basic` contains `service_name = 'mysql'` in WHERE, `apply_adhoc_macro` has `$adhoc` replaced by `1`. If any looks wrong, that is still CURRENT behavior — keep it (characterization), but note it in the commit message.

- [ ] **Step 4: Commit**

```bash
git add pkg/resource_handlers_test.go pkg/testdata/handlers/
git commit -m "test(backend): characterization goldens for createQuery/applyAdhocFilters handlers"
```

---

### Task 2: Safe `EvalAST` accessors in `pkg/eval/ast_access.go`

**Files:**
- Create: `pkg/eval/ast_access.go`
- Create: `pkg/eval/ast_access_test.go`

**Interfaces:**
- Produces (consumed by Tasks 3, 7 and later by Phase-2 `compat.go`):
  - `func (e *EvalAST) SubAST(key string) (*EvalAST, bool)` — returns nested AST; tolerates values stored as `*EvalAST` **or** `EvalAST` (the #799 class); `(nil,false)` when absent/nil/other type.
  - `func (e *EvalAST) StringAt(i int) (string, bool)` — bounds-checked `Arr[i].(string)`.
  - `func InnermostFrom(ast *EvalAST) *EvalAST` — follows `from` links while `from.Arr == nil` (verbatim semantics of the loop at `resource_handlers.go:345/:587`); never panics; returns the deepest AST reached.

- [ ] **Step 1: Write the failing test**

```go
// pkg/eval/ast_access_test.go
package eval

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSubAST(t *testing.T) {
	inner := &EvalAST{Arr: []interface{}{"default.tbl"}}
	ast := &EvalAST{Obj: map[string]interface{}{
		"from":    inner,
		"byValue": EvalAST{Arr: []interface{}{"x"}}, // value, not pointer (#799 class)
		"nilKey":  nil,
		"wrong":   42,
	}}

	got, ok := ast.SubAST("from")
	require.True(t, ok)
	require.Same(t, inner, got)

	gotV, ok := ast.SubAST("byValue")
	require.True(t, ok)
	require.Equal(t, []interface{}{"x"}, gotV.Arr)

	for _, key := range []string{"nilKey", "wrong", "absent"} {
		_, ok := ast.SubAST(key)
		require.False(t, ok, key)
	}
	_, ok = (&EvalAST{}).SubAST("from") // nil Obj map
	require.False(t, ok)
}

func TestStringAt(t *testing.T) {
	ast := &EvalAST{Arr: []interface{}{"a", 7}}
	s, ok := ast.StringAt(0)
	require.True(t, ok)
	require.Equal(t, "a", s)
	_, ok = ast.StringAt(1) // not a string
	require.False(t, ok)
	_, ok = ast.StringAt(2) // out of bounds
	require.False(t, ok)
	_, ok = (&EvalAST{}).StringAt(0) // nil Arr
	require.False(t, ok)
}

func TestInnermostFrom(t *testing.T) {
	deepest := &EvalAST{
		Obj: map[string]interface{}{"from": &EvalAST{Arr: []interface{}{"db.tbl"}}},
	}
	mid := &EvalAST{Obj: map[string]interface{}{"from": deepest}}
	top := &EvalAST{Obj: map[string]interface{}{"from": mid}}
	// mid.from(=deepest).Arr==nil → descend; deepest.from.Arr!=nil → stop at deepest
	require.Same(t, deepest, InnermostFrom(top))

	noFrom := &EvalAST{Obj: map[string]interface{}{}}
	require.Same(t, noFrom, InnermostFrom(noFrom)) // no from → returns input, no panic

	malformed := &EvalAST{Obj: map[string]interface{}{"from": "just-a-string"}}
	require.Same(t, malformed, InnermostFrom(malformed)) // wrong type → stop, no panic
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./pkg/eval -run 'TestSubAST|TestStringAt|TestInnermostFrom' -v`
Expected: FAIL — `undefined: (*EvalAST).SubAST` (compile error).

- [ ] **Step 3: Write the implementation**

```go
// pkg/eval/ast_access.go
package eval

// SubAST returns the nested AST stored under key. It tolerates both historical
// storage forms (*EvalAST and EvalAST) and returns ok=false for absent, nil,
// or differently-typed values instead of panicking.
func (e *EvalAST) SubAST(key string) (*EvalAST, bool) {
	if e == nil || e.Obj == nil {
		return nil, false
	}
	switch v := e.Obj[key].(type) {
	case *EvalAST:
		if v == nil {
			return nil, false
		}
		return v, true
	case EvalAST:
		vv := v
		return &vv, true
	default:
		return nil, false
	}
}

// StringAt returns Arr[i] as a string with bounds and type checks.
func (e *EvalAST) StringAt(i int) (string, bool) {
	if e == nil || i < 0 || i >= len(e.Arr) {
		return "", false
	}
	s, ok := e.Arr[i].(string)
	return s, ok
}

// InnermostFrom descends `from` links while the linked AST has a nil Arr
// (i.e. `from` holds a subquery rather than a table list), mirroring the
// navigation loops previously inlined in resource handlers. It never panics.
func InnermostFrom(ast *EvalAST) *EvalAST {
	for ast.HasOwnProperty("from") {
		next, ok := ast.SubAST("from")
		if !ok || next.Arr != nil {
			break
		}
		ast = next
	}
	return ast
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `go test ./pkg/eval -run 'TestSubAST|TestStringAt|TestInnermostFrom' -v && go test ./pkg/eval`
Expected: PASS (new tests + entire existing eval suite).

- [ ] **Step 5: Commit**

```bash
git add pkg/eval/ast_access.go pkg/eval/ast_access_test.go
git commit -m "feat(eval): safe EvalAST accessors (SubAST, StringAt, InnermostFrom)"
```

---

### Task 3: Kill the panic vectors in `resource_handlers.go`

**Files:**
- Modify: `pkg/resource_handlers.go:343-372` (handleApplyAdhocFilters), `:583-612` (handleProcessQueryBatch), and the matching block in `handleCreateQueryWithAdhoc` (search for the third `Navigate to the deepest FROM clause` comment, ~`:990`)
- Modify: `pkg/resource_handlers_test.go`
- Create: `pkg/testdata/handlers/apply_adhoc_no_from.req.json`

**Interfaces:**
- Consumes: `SubAST`, `StringAt`, `InnermostFrom` from Task 2; `runHandlerGolden` from Task 1.

- [ ] **Step 1: Write the failing test (input that panics today)**

`SELECT 1` has no FROM: the navigation loop is skipped and `ast.Obj["from"].(*eval.EvalAST)` at `:362` type-asserts on `nil` → panic.

```json
// pkg/testdata/handlers/apply_adhoc_no_from.req.json
{
  "query": "SELECT 1",
  "adhocFilters": [{"key": "default.test_grafana.service_name", "operator": "=", "value": "mysql"}],
  "target": {"database": "default", "table": "test_grafana"}
}
```

Add to the `cases` slice in `TestHandlerCharacterization`:

```go
{"apply_adhoc_no_from", ds.handleApplyAdhocFilters, "apply_adhoc_no_from.req.json"},
```

- [ ] **Step 2: Run test to verify it fails with a panic**

Run: `go test ./pkg/ -run 'TestHandlerCharacterization/apply_adhoc_no_from' -v`
Expected: FAIL with `panic: interface conversion: interface {} is nil, not *eval.EvalAST` (this confirms the bug is real before fixing).

- [ ] **Step 3: Replace the unchecked navigation in all three handlers**

In each of the three handlers, replace the block

```go
// Navigate to the deepest FROM clause
for ast.HasOwnProperty("from") && ast.Obj["from"].(*eval.EvalAST).Arr == nil {
	nextAst, ok := ast.Obj["from"].(*eval.EvalAST)
	if !ok {
		break
	}
	ast = nextAst
}
```

with

```go
// Navigate to the deepest FROM clause
ast = eval.InnermostFrom(ast)
```

and replace the `parseTargets(ast.Obj["from"].(*eval.EvalAST).Arr[0].(string), …)` call site. **In `handleApplyAdhocFilters`** (the handler the characterization test exercises), the current code at `:362-372` is:

```go
targetDatabase, targetTable := parseTargets(ast.Obj["from"].(*eval.EvalAST).Arr[0].(string), target.Database, target.Table)
if targetDatabase == "" && targetTable == "" {
	return sendUniversalErrorResponse(sender, ErrorContext{
		ErrorType:     ErrorTypeFromClause,
		OriginalSQL:   query,
		HasAdhocMacro: hasAdhocMacro,
		AdhocFilters:  []interface{}{adhocFilters},
		OriginalError: fmt.Errorf("FROM expression can't be parsed - unable to determine target database and table"),
		Handler:       "handleApplyAdhocFilters",
	}, http.StatusInternalServerError)
}
```

Replace it with (adds a safe extraction guard that returns the SAME error style before `parseTargets` can panic):

```go
fromAst, okFrom := ast.SubAST("from")
fromExpr, okExpr := fromAst.StringAt(0)
if !okFrom || !okExpr {
	return sendUniversalErrorResponse(sender, ErrorContext{
		ErrorType:     ErrorTypeFromClause,
		OriginalSQL:   query,
		HasAdhocMacro: hasAdhocMacro,
		AdhocFilters:  []interface{}{adhocFilters},
		OriginalError: fmt.Errorf("query has no FROM table expression"),
		Handler:       "handleApplyAdhocFilters",
	}, http.StatusInternalServerError)
}
targetDatabase, targetTable := parseTargets(fromExpr, target.Database, target.Table)
if targetDatabase == "" && targetTable == "" {
	return sendUniversalErrorResponse(sender, ErrorContext{
		ErrorType:     ErrorTypeFromClause,
		OriginalSQL:   query,
		HasAdhocMacro: hasAdhocMacro,
		AdhocFilters:  []interface{}{adhocFilters},
		OriginalError: fmt.Errorf("FROM expression can't be parsed - unable to determine target database and table"),
		Handler:       "handleApplyAdhocFilters",
	}, http.StatusInternalServerError)
}
```

For **`handleProcessQueryBatch`** (`:604`) and **`handleCreateQueryWithAdhoc`** (the analogous `parseTargets` line ~`:990`): apply the same `SubAST`+`StringAt` guard immediately before their `parseTargets` call, returning that handler's OWN existing error response for the no-FROM case — i.e. `handleProcessQueryBatch` returns `requests.SendJSON(sender, http.StatusInternalServerError, ProcessQueryBatchResponse{Error: "query has no FROM table expression"})`, and `handleCreateQueryWithAdhoc` returns its existing `sendUniversalErrorResponse(...)` block with `OriginalError: fmt.Errorf("query has no FROM table expression")`. (These three blocks are consolidated away entirely in Task 7 — here you only need them panic-free and characterization-green.)

- [ ] **Step 4: Regenerate the new golden, verify old goldens unchanged**

Run: `go test ./pkg/ -run 'TestHandlerCharacterization/apply_adhoc_no_from' -args -update && go test ./pkg/ -run TestHandlerCharacterization -v`
Expected: `apply_adhoc_no_from.golden.json` now contains a 4xx/5xx JSON error (not a panic); the three Task-1 goldens pass UNCHANGED (byte-identical behavior for valid inputs).

- [ ] **Step 5: Commit**

```bash
git add pkg/resource_handlers.go pkg/resource_handlers_test.go pkg/testdata/handlers/
git commit -m "fix(backend): replace unchecked EvalAST assertions with safe accessors (panic class of #799/#859)"
```

---

### Task 4: Guard `parser.go` reflect calls and fix the `$lttbMs` PrintAST panic

**Files:**
- Modify: `pkg/parser.go:218-244` (the `default:` branches using `reflect.ValueOf(value).Float()` / `.String()`)
- Modify: `pkg/eval/eval_query.go:2330-2333`
- Test: `pkg/parser_test.go` (create), `pkg/eval/eval_query_test.go` (append)

**Interfaces:** self-contained; no new exports.

- [ ] **Step 1: Write the failing tests**

```go
// pkg/parser_test.go
package main

import "testing"

// ParseValue's default branches call reflect.ValueOf(value).Float()/.String(),
// which panic when the underlying kind is not numeric/string (e.g. a bool
// arriving from an unexpected ClickHouse JSON payload).
func TestParseValueUnexpectedKindDoesNotPanic(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("ParseValue panicked: %v", r)
		}
	}()
	// Float64 column carrying a bool value
	_ = ParseValue("col", "Float64", nil, true, false)
	// String column carrying a map value
	_ = ParseValue("col", "String", nil, map[string]interface{}{"a": 1}, false)
}
```

Note: check `ParseValue`'s exact signature at `pkg/parser.go` (search `func ParseValue`) and adjust the two call expressions to it; the assertion (no panic, any return) stays the same.

```go
// append to pkg/eval/eval_query_test.go
func TestPrintASTLttbMs(t *testing.T) {
	scanner := NewScanner("$lttbMs(event_time, 100) FROM default.test_grafana")
	ast, err := scanner.ToAST()
	require.NoError(t, err)
	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("PrintAST panicked on $lttbMs: %v", r)
		}
	}()
	printed := PrintAST(ast, " ")
	require.Contains(t, printed, "$lttbMs(")
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `go test ./pkg/ -run TestParseValueUnexpectedKindDoesNotPanic -v; go test ./pkg/eval -run TestPrintASTLttbMs -v`
Expected: both FAIL with panics (reflect kind panic; nil-assertion panic on `Obj["$lttb"]`).

- [ ] **Step 3: Fix both**

In `pkg/parser.go`, wrap the two reflect fallbacks:

```go
// default float branch (~:222)
rv := reflect.ValueOf(value)
if rv.Kind() != reflect.Float32 && rv.Kind() != reflect.Float64 &&
	!rv.CanInt() && !rv.CanUint() {
	return nil // unexpected kind: treat as null instead of panicking
}
fv := rv.Convert(reflect.TypeOf(float64(0))).Float()
```

```go
// default string branch (~:240)
rv := reflect.ValueOf(value)
if rv.Kind() != reflect.String {
	return fmt.Sprintf("%v", value)
}
str := rv.String()
```

(Adapt variable names to the surrounding code; keep the existing post-processing of `fv`/`str` untouched.)

In `pkg/eval/eval_query.go:2330-2333`, fix the copy-paste key:

```go
if AST.HasOwnProperty("$lttbMs") {
	result += tab + "$lttbMs("
	result += printItems(AST.Obj["$lttbMs"].(*EvalAST), tab, ",") + ")"
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `go test ./pkg/... `
Expected: PASS, including the full existing `eval` suite (the `$lttbMs` fix can't affect other cases: the old branch always panicked when reached).

- [ ] **Step 5: Commit**

```bash
git add pkg/parser.go pkg/parser_test.go pkg/eval/eval_query.go pkg/eval/eval_query_test.go
git commit -m "fix(backend): guard reflect fallbacks in ParseValue; fix \$lttbMs PrintAST key panic"
```

---

### Task 5: Stop swallowing `json.Marshal` errors (14 sites)

**Files:**
- Modify: `pkg/requests/request_response.go`
- Modify: `pkg/resource_handlers.go:422, 432, 452, 487, 536, 546, 560, 571, 607, 700, 722, 906, 1071` (all `body, _ := json.Marshal(...)` sites; re-locate by grep, line numbers will drift)
- Test: `pkg/requests/request_response_test.go` (create)

**Interfaces:**
- Produces: `func SendJSON(sender backend.CallResourceResponseSender, status int, payload interface{}) error` in `pkg/requests` — Tasks 6–7 and all future handlers use it.

- [ ] **Step 1: Write the failing test**

```go
// pkg/requests/request_response_test.go
package requests

import (
	"math"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

type memSender struct{ resp *backend.CallResourceResponse }

func (m *memSender) Send(r *backend.CallResourceResponse) error { m.resp = r; return nil }

func TestSendJSONMarshalFailure(t *testing.T) {
	s := &memSender{}
	// math.NaN cannot be marshaled → must yield a 500 with an error body, not empty 200
	err := SendJSON(s, 200, map[string]interface{}{"v": math.NaN()})
	require.NoError(t, err)
	require.Equal(t, 500, s.resp.Status)
	require.Contains(t, string(s.resp.Body), "marshal")
}

func TestSendJSONOK(t *testing.T) {
	s := &memSender{}
	require.NoError(t, SendJSON(s, 200, map[string]string{"ok": "yes"}))
	require.Equal(t, 200, s.resp.Status)
	require.JSONEq(t, `{"ok":"yes"}`, string(s.resp.Body))
	require.Equal(t, []string{"application/json"}, s.resp.Headers["Content-Type"])
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./pkg/requests -v`
Expected: FAIL — `undefined: SendJSON`.

- [ ] **Step 3: Implement `SendJSON` and route `SendSuccessResponse` through it**

```go
// add to pkg/requests/request_response.go
import "github.com/grafana/grafana-plugin-sdk-go/backend/log"

// SendJSON marshals payload and sends it with the given status. On marshal
// failure it logs and sends a 500 error body instead of silently sending
// nothing.
func SendJSON(sender backend.CallResourceResponseSender, status int, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		log.DefaultLogger.Error("response marshal failed", "error", err)
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusInternalServerError,
			Body:   []byte(fmt.Sprintf(`{"error": "response marshal failed: %v"}`, err)),
		})
	}
	return sender.Send(&backend.CallResourceResponse{
		Status:  status,
		Headers: map[string][]string{"Content-Type": {"application/json"}},
		Body:    body,
	})
}

// SendSuccessResponse marshals response and sends it with proper headers
func SendSuccessResponse[T any](sender backend.CallResourceResponseSender, response T) error {
	return SendJSON(sender, http.StatusOK, response)
}
```

Then in `pkg/resource_handlers.go` replace every

```go
body, _ := json.Marshal(response)
return sender.Send(&backend.CallResourceResponse{Status: <S>, Body: body})
```

with

```go
return requests.SendJSON(sender, <S>, response)
```

Find all sites: `grep -n 'json.Marshal' pkg/resource_handlers.go` — after this task the only remaining `json.Marshal` calls in the file must be for *request-side* payloads, not responses.

- [ ] **Step 4: Run tests to verify everything passes**

Run: `go test ./pkg/... && grep -c ', _ := json.Marshal' pkg/resource_handlers.go`
Expected: tests PASS (incl. Task-1/3 goldens — bodies are byte-identical for valid payloads); grep prints `0`.

- [ ] **Step 5: Commit**

```bash
git add pkg/requests/ pkg/resource_handlers.go
git commit -m "fix(backend): surface JSON marshal failures instead of sending empty bodies"
```

---

### Task 6: Extract shared `buildQueryContext` (query build triplication)

**Files:**
- Create: `pkg/query_context.go`
- Create: `pkg/query_context_test.go`
- Modify: `pkg/resource_handlers.go` — `handleCreateQuery` (`:258`), `handleProcessQueryBatch` (Step-1 section, ~`:522-576`), `handleCreateQueryWithAdhoc` (~`:918-976`)

**Interfaces:**
- Consumes: `eval.NewEvalQuery`, `eval.NewScanner`, `timeutils.ParseTimeRange`, existing `ErrorContext`/`ErrorType*` values.
- Produces (Task 7 depends on these exact names):

```go
type queryContext struct {
	SQL           string
	AST           *eval.EvalAST
	From, To      time.Time
	HasAdhocMacro bool
}
// buildQueryContext parses the time range, expands macros and parses the AST.
// On failure returns (nil, *ErrorContext) ready for sendUniversalErrorResponse.
func buildQueryContext(request interface{}, rawQuery string, timeRange timeutils.TimeRangeStruct, handler string) (*queryContext, *ErrorContext)
```

- [ ] **Step 1: Write the failing test**

```go
// pkg/query_context_test.go
package main

import (
	"testing"

	"github.com/altinity/clickhouse-grafana/pkg/timeutils"
	"github.com/stretchr/testify/require"
)

func validCreateQueryRequest() *CreateQueryRequest {
	r := &CreateQueryRequest{
		Query:               "SELECT $timeSeries as t, count() FROM $table WHERE $timeFilter GROUP BY t",
		Database:            "default",
		Table:               "test_grafana",
		DateTimeType:        "DATETIME",
		DateTimeColDataType: "event_time",
		Interval:            "30s",
		IntervalFactor:      1,
	}
	r.TimeRange.From = "2025-01-02T03:04:05Z"
	r.TimeRange.To = "2025-01-02T04:05:06Z"
	return r
}

func TestBuildQueryContextSuccess(t *testing.T) {
	req := validCreateQueryRequest()
	qc, errCtx := buildQueryContext(req, req.Query, timeutils.TimeRangeStruct(req.TimeRange), "test")
	require.Nil(t, errCtx)
	require.NotContains(t, qc.SQL, "$timeSeries") // macros expanded
	require.True(t, qc.AST.HasOwnProperty("select"))
	require.False(t, qc.HasAdhocMacro)
}

func TestBuildQueryContextBadTimeRange(t *testing.T) {
	req := validCreateQueryRequest()
	req.TimeRange.From = "not-a-time"
	_, errCtx := buildQueryContext(req, req.Query, timeutils.TimeRangeStruct(req.TimeRange), "test")
	require.NotNil(t, errCtx)
	require.Equal(t, ErrorTypeTimeRange, errCtx.ErrorType)
}

func TestBuildQueryContextUnparsableSQL(t *testing.T) {
	req := validCreateQueryRequest()
	req.Query = "SELECT 'unterminated FROM t"
	_, errCtx := buildQueryContext(req, req.Query, timeutils.TimeRangeStruct(req.TimeRange), "test")
	require.NotNil(t, errCtx)
	require.Equal(t, ErrorTypeQueryParsing, errCtx.ErrorType)
}
```

Note: `timeutils.TimeRangeStruct(req.TimeRange)` conversion works because the anonymous struct matches; it is the same pattern already used at `resource_handlers.go:265`. If `ErrorTypeMacroExpansion` fires before `ErrorTypeQueryParsing` for the unterminated-string case, pin whichever the implementation actually produces — both are acceptable error paths.

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./pkg/ -run TestBuildQueryContext -v`
Expected: FAIL — `undefined: buildQueryContext`.

- [ ] **Step 3: Implement by relocating (not rewriting) the logic from `handleCreateQuery`**

```go
// pkg/query_context.go
package main

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/altinity/clickhouse-grafana/pkg/eval"
	"github.com/altinity/clickhouse-grafana/pkg/timeutils"
)

type queryContext struct {
	SQL           string
	AST           *eval.EvalAST
	From, To      time.Time
	HasAdhocMacro bool
}

// buildQueryContext is the single query-preparation path shared by
// handleCreateQuery, handleProcessQueryBatch and handleCreateQueryWithAdhoc.
func buildQueryContext(request interface{}, rawQuery string, timeRange timeutils.TimeRangeStruct, handler string) (*queryContext, *ErrorContext) {
	hasAdhocMacro := strings.Contains(rawQuery, "$adhoc")

	from, to, err := timeutils.ParseTimeRange(timeRange)
	if err != nil {
		return nil, &ErrorContext{
			ErrorType:     ErrorTypeTimeRange,
			OriginalSQL:   rawQuery,
			HasAdhocMacro: hasAdhocMacro,
			OriginalError: fmt.Errorf("Invalid time range: %v", err),
			Handler:       handler,
			Status:        http.StatusBadRequest,
		}
	}

	evalQ := eval.NewEvalQuery(request, from, to)
	sql, err := evalQ.ApplyMacrosAndTimeRangeToQuery()
	if err != nil {
		return nil, &ErrorContext{
			ErrorType:     ErrorTypeMacroExpansion,
			OriginalSQL:   rawQuery,
			HasAdhocMacro: hasAdhocMacro,
			OriginalError: fmt.Errorf("Failed to apply macros: %v", err),
			Handler:       handler,
			Status:        http.StatusInternalServerError,
		}
	}

	scanner := eval.NewScanner(sql)
	ast, err := scanner.ToAST()
	if err != nil {
		return nil, &ErrorContext{
			ErrorType:     ErrorTypeQueryParsing,
			OriginalSQL:   rawQuery,
			ProcessedSQL:  sql,
			HasAdhocMacro: hasAdhocMacro,
			OriginalError: err,
			Handler:       handler,
			Status:        http.StatusInternalServerError,
		}
	}

	return &queryContext{SQL: sql, AST: ast, From: from, To: to, HasAdhocMacro: hasAdhocMacro}, nil
}
```

**Required first: add a `Status` field to `ErrorContext`.** It does not have one today (verified: `type ErrorContext struct` at `pkg/resource_handlers.go:775` has fields `ErrorType, OriginalSQL, ProcessedSQL, HasAdhocMacro, AdhocFilters, OriginalError, Handler` — no `Status`). The existing signature is `func sendUniversalErrorResponse(sender backend.CallResourceResponseSender, ctx ErrorContext, httpStatus int) error` (`:904`), so the HTTP status is currently passed as a separate literal at each call site. To let `buildQueryContext` carry the intended status back, add one field — this is purely additive and touches no existing call site:

```go
// in pkg/resource_handlers.go, inside type ErrorContext struct — append:
	Status        int
```

The `buildQueryContext` code above already sets `Status: http.StatusBadRequest` / `http.StatusInternalServerError` on each returned `*ErrorContext`. Since the field is new and only read where we introduce it, no other code is affected.

Then rewrite the preparation section of `handleCreateQuery` (`:258`) to:

```go
qc, errCtx := buildQueryContext(request, request.Query, timeutils.TimeRangeStruct(request.TimeRange), "handleCreateQuery")
if errCtx != nil {
	return sendUniversalErrorResponse(sender, *errCtx, errCtx.Status)
}
// downstream code that used `sql`/`ast` now uses qc.SQL / qc.AST
```

Do the same in `handleCreateQueryWithAdhoc` (pass `"handleCreateQueryWithAdhoc"` as the handler name). For `handleProcessQueryBatch`, which shapes errors per-item rather than via `sendUniversalErrorResponse`, use:

```go
qc, errCtx := buildQueryContext(request, request.Query, timeutils.TimeRangeStruct(request.TimeRange), "handleProcessQueryBatch")
if errCtx != nil {
	return requests.SendJSON(sender, errCtx.Status, ProcessQueryBatchResponse{Error: errCtx.OriginalError.Error()})
}
```

(`requests.SendJSON` comes from Task 5. This preserves the batch handler's `ProcessQueryBatchResponse{Error: …}` response shape while reusing the shared build path.)

- [ ] **Step 4: Run the full package suite — goldens must be byte-identical**

Run: `go test ./pkg/...`
Expected: PASS, including `TestHandlerCharacterization` with UNCHANGED goldens (this is the whole point: pure relocation, zero behavior change).

- [ ] **Step 5: Commit**

```bash
git add pkg/query_context.go pkg/query_context_test.go pkg/resource_handlers.go
git commit -m "refactor(backend): extract buildQueryContext shared by 3 handlers"
```

---

### Task 7: Extract shared `applyAdhocFiltersToAST`

**Files:**
- Modify: `pkg/query_context.go` (add function), `pkg/query_context_test.go` (add tests)
- Modify: `pkg/resource_handlers.go` — `handleApplyAdhocFilters` (`:343-402`), `handleProcessQueryBatch` (`:583-640`), `handleCreateQueryWithAdhoc` (matching block ~`:990-1044`)

**Interfaces:**
- Consumes: `queryContext` (Task 6), `eval.InnermostFrom`/`SubAST`/`StringAt` (Task 2), `adhoc.ProcessAdhocFilters`, existing `parseTargets`.
- Produces:

```go
// applyAdhocFiltersToAST injects adhoc conditions into qc.AST's innermost
// WHERE (or substitutes the $adhoc macro) and returns the resulting SQL.
// replaceAdhocMacroAlways preserves the historical divergence:
//   true  = handleApplyAdhocFilters behavior ($adhoc replaced even with 0 filters)
//   false = handleProcessQueryBatch/handleCreateQueryWithAdhoc behavior
func applyAdhocFiltersToAST(qc *queryContext, filters []adhoc.AdhocFilter, target Target, replaceAdhocMacroAlways bool) (string, *ErrorContext)
```

- [ ] **Step 1: Write the failing tests**

```go
// append to pkg/query_context_test.go
import "github.com/altinity/clickhouse-grafana/pkg/adhoc"

func adhocQC(t *testing.T, sql string) *queryContext {
	t.Helper()
	scanner := eval.NewScanner(sql)
	ast, err := scanner.ToAST()
	require.NoError(t, err)
	return &queryContext{SQL: sql, AST: ast, HasAdhocMacro: strings.Contains(sql, "$adhoc")}
}

func TestApplyAdhocFiltersInjectsIntoWhere(t *testing.T) {
	qc := adhocQC(t, "SELECT t, c FROM default.test_grafana WHERE x > 1")
	sql, errCtx := applyAdhocFiltersToAST(qc,
		[]adhoc.AdhocFilter{{Key: "default.test_grafana.service_name", Operator: "=", Value: "mysql"}},
		Target{Database: "default", Table: "test_grafana"}, true)
	require.Nil(t, errCtx)
	require.Contains(t, sql, "AND (service_name = 'mysql')")
}

func TestApplyAdhocMacroDivergencePreserved(t *testing.T) {
	// always-replace path (handleApplyAdhocFilters)
	qc := adhocQC(t, "SELECT t FROM default.test_grafana WHERE $adhoc")
	sql, errCtx := applyAdhocFiltersToAST(qc, nil, Target{Database: "default", Table: "test_grafana"}, true)
	require.Nil(t, errCtx)
	require.NotContains(t, sql, "$adhoc")
	require.Contains(t, sql, "1")

	// batch path: with 0 filters, $adhoc is historically left in place
	qc2 := adhocQC(t, "SELECT t FROM default.test_grafana WHERE $adhoc")
	sql2, errCtx := applyAdhocFiltersToAST(qc2, nil, Target{Database: "default", Table: "test_grafana"}, false)
	require.Nil(t, errCtx)
	require.Contains(t, sql2, "$adhoc")
}

func TestApplyAdhocFiltersNoFrom(t *testing.T) {
	qc := adhocQC(t, "SELECT 1")
	_, errCtx := applyAdhocFiltersToAST(qc,
		[]adhoc.AdhocFilter{{Key: "a.b.c", Operator: "=", Value: "v"}},
		Target{Database: "a", Table: "b"}, true)
	require.NotNil(t, errCtx) // graceful error, no panic (Task 3 semantics)
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `go test ./pkg/ -run TestApplyAdhoc -v`
Expected: FAIL — `undefined: applyAdhocFiltersToAST`.

- [ ] **Step 3: Implement by consolidating the three blocks**

```go
// append to pkg/query_context.go
import "github.com/altinity/clickhouse-grafana/pkg/adhoc"

func applyAdhocFiltersToAST(qc *queryContext, filters []adhoc.AdhocFilter, target Target, replaceAdhocMacroAlways bool) (string, *ErrorContext) {
	query := qc.SQL
	topQueryAst := qc.AST
	adhocConditions := make([]string, 0)

	if len(filters) > 0 {
		ast := eval.InnermostFrom(topQueryAst)

		if !ast.HasOwnProperty("where") {
			ast.Obj["where"] = &eval.EvalAST{Obj: make(map[string]interface{}), Arr: make([]interface{}, 0)}
		}

		fromAst, okFrom := ast.SubAST("from")
		fromExpr, okExpr := fromAst.StringAt(0)
		if !okFrom || !okExpr {
			return "", &ErrorContext{
				ErrorType:     ErrorTypeFromClause,
				OriginalSQL:   qc.SQL,
				HasAdhocMacro: qc.HasAdhocMacro,
				OriginalError: fmt.Errorf("query has no FROM table expression"),
				Handler:       "applyAdhocFiltersToAST",
				Status:        http.StatusInternalServerError,
			}
		}
		targetDatabase, targetTable := parseTargets(fromExpr, target.Database, target.Table)
		if targetDatabase == "" && targetTable == "" {
			return "", &ErrorContext{
				ErrorType:     ErrorTypeFromClause,
				OriginalSQL:   qc.SQL,
				HasAdhocMacro: qc.HasAdhocMacro,
				OriginalError: fmt.Errorf("FROM expression can't be parsed - unable to determine target database and table"),
				Handler:       "applyAdhocFiltersToAST",
				Status:        http.StatusInternalServerError,
			}
		}

		adhocConditions = adhoc.ProcessAdhocFilters(filters, targetDatabase, targetTable)

		if !strings.Contains(query, "$adhoc") {
			whereAst, _ := ast.SubAST("where")
			if len(adhocConditions) > 0 {
				combinedCondition := strings.Join(adhocConditions, " AND ")
				if len(whereAst.Arr) > 0 {
					whereAst.Arr = append(whereAst.Arr, "AND", fmt.Sprintf("(%s)", combinedCondition))
				} else {
					whereAst.Arr = append(whereAst.Arr, combinedCondition)
				}
			}
			query = eval.PrintAST(topQueryAst, " ")
		}
	}

	// Historical divergence, preserved deliberately (see design doc §2.4):
	// the standalone adhoc handler replaces $adhoc even with zero filters;
	// the batch/createWithAdhoc paths only replace it when filters exist.
	if strings.Contains(query, "$adhoc") && (replaceAdhocMacroAlways || len(filters) > 0) {
		renderedCondition := "1"
		if len(adhocConditions) > 0 {
			renderedCondition = fmt.Sprintf("(%s)", strings.Join(adhocConditions, " AND "))
		}
		query = strings.ReplaceAll(query, "$adhoc", renderedCondition)
	}

	return query, nil
}
```

Then replace the three inline blocks with calls (`replaceAdhocMacroAlways`: `true` in `handleApplyAdhocFilters`, `false` in the other two), keeping each handler's error-response style by rendering the returned `*ErrorContext` the way that handler already does.

- [ ] **Step 4: Run everything — goldens byte-identical again**

Run: `go test ./pkg/...`
Expected: PASS; `TestHandlerCharacterization` goldens (incl. `apply_adhoc_macro` — the divergence case) UNCHANGED.

- [ ] **Step 5: Commit**

```bash
git add pkg/query_context.go pkg/query_context_test.go pkg/resource_handlers.go
git commit -m "refactor(backend): extract applyAdhocFiltersToAST shared by 3 handlers"
```

---

### Task 8: golangci-lint in CI

**Files:**
- Create: `.golangci.yml`
- Modify: `.github/workflows/ci.yml` (add step after the existing backend build step)

**Interfaces:** none (CI-only).

- [ ] **Step 1: Add config**

```yaml
# .golangci.yml
version: "2"
linters:
  default: none
  enable:
    - govet
    - errcheck
    - staticcheck
    - ineffassign
linters-settings:
  errcheck:
    exclude-functions:
      - (github.com/grafana/grafana-plugin-sdk-go/backend.CallResourceResponseSender).Send
issues:
  max-issues-per-linter: 0
  max-same-issues: 0
```

- [ ] **Step 2: Run locally and triage**

Run: `golangci-lint run ./pkg/...` (install: `brew install golangci-lint` if absent)
Expected: a finite finding list. Fix every finding in files this plan already touched; for pre-existing findings in untouched files (`streaming.go`, `datasource.go` etc.) either fix trivially (unchecked `err` assignments) or annotate `//nolint:<linter> // pre-existing, tracked in repo-audit-2026-07` — zero unexplained suppressions.

- [ ] **Step 3: Wire into CI**

Add to `.github/workflows/ci.yml` after the Go build step (keep the workflow's existing indentation style):

```yaml
      - name: Lint backend
        uses: golangci/golangci-lint-action@v7
        with:
          version: latest
          args: ./pkg/...
```

- [ ] **Step 4: Verify green locally, then in CI**

Run: `golangci-lint run ./pkg/... && go test ./pkg/...`
Expected: no findings, tests PASS. Push branch; confirm the new CI job passes.

- [ ] **Step 5: Commit**

```bash
git add .golangci.yml .github/workflows/ci.yml
git commit -m "ci: add golangci-lint (govet, errcheck, staticcheck) for backend"
```

---

## Completion criteria (Stage A gate → unlocks Phase 0 of #733)

1. `go test ./pkg/...` green; characterization goldens for valid inputs byte-identical to pre-refactor.
2. No `.(...)`-style unchecked type assertions on `EvalAST` left in `pkg/resource_handlers.go` (`grep -n '\.(\*eval\.EvalAST)' pkg/resource_handlers.go` → only inside `ast_access.go`-routed code or zero).
3. `grep -c ', _ := json.Marshal' pkg/` → 0.
4. golangci-lint green in CI.
5. `npm run test` unaffected (no frontend changes).
