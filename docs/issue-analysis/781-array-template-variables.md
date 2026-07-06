# Issue #781 — Array template variables should show proper error messages instead of a stacktrace

**Repo:** Altinity/clickhouse-grafana
**Branch analyzed:** `datalinks-fixed`
**Issue state:** OPEN (created 2025-04-28 by antip00, CONTRIBUTOR)
**Analysis date:** 2026-06-21
**Scope:** READ-ONLY deep-dive. No source modified. This document is the deliverable.

---

## 1. Issue summary (verbatim facts)

Issue body (full):

> Repro URL:
> `http://localhost:3000/d/DnOcQSGGz/clickhouse-dashboard?orgId=1&from=now-6h&to=now&timezone=browser&var-array_var=$__all&var-remote_host=localhost:9000&var-cluster_name=default&var-repeated_service=postgresql&var-repeated_service=mysql&var-adhoc=default.test_grafana.service_name%7C%3D~%7C%25sql%25`
>
> "Click to array_var variable"
>
> ```
> TypeError: ae.props.children.at(...).props is undefined
>     x@http://localhost:3000/public/build/7836.7e2f7180984229d69bc9.js:1:177117
>     Bt@.../4315.04038860e30ccfb6f1fb.js:86:76160
>     div
>     ...
> ```
> (plus screenshot, and a follow-up screenshot from a maintainer that cannot be read)

Key facts decoded from the URL:
- There is a dashboard template variable named **`array_var`**, currently selected as **`$__all`** (the "All" option).
- Other variables exist: `remote_host`, `cluster_name`, `repeated_service` (multi-value: `postgresql` + `mysql`), and an **adhoc** filter `adhoc` = `default.test_grafana.service_name |=~| %sql%`.
- The crash happens in **Grafana's minified bundle** (`7836.*.js`, `4315.*.js`), i.e. inside Grafana's React rendering of the variable option list — NOT inside the plugin's own code.
- The crash frame `ae.props.children.at(...).props is undefined` is a React element-children access. This is Grafana iterating over rendered option children and hitting an element whose `.props` is `undefined` — strongly consistent with an **option whose value/label is not a primitive string** (e.g. a real JS array), so Grafana's option/`VariableValueSelect` rendering produces a malformed child.

The issue title literally asks for a **"proper error message instead of stacktrace"**, i.e. the demand is UX (don't crash the whole dashboard); it does not mandate any particular remedy.

The labels are empty; there is exactly one comment (the unreadable maintainer screenshot). No PR is linked.

---

## 2. The variable pipeline, end to end

### 2.1 VariableSupport wiring

`CHDataSource` registers **Custom** variable support in its constructor:

`src/datasource/datasource.ts:102-109`
```ts
this.variables = {
  getType(): VariableSupportType {
    return VariableSupportType.Custom;
  },
  // @ts-ignore
  editor: QueryEditorVariable,
  query: this.queryVariables.bind(this),
}
```

With `VariableSupportType.Custom`, Grafana:
- renders `editor` (`QueryEditorVariable`) in the variable settings page, and
- calls `query` (`queryVariables`) to **execute** the variable query and turn the resulting `DataFrame` into selectable options.

### 2.2 The editor component

`QueryEditorVariable` — `src/views/QueryEditor/QueryEditor.tsx:105-…`

It normalizes the incoming `query` (string or `CHQuery`) into a `CHQuery` with `datasourceMode: DatasourceMode.Variable` (`QueryEditor.tsx:108-113`), runs `useFormattedData` for preview, and renders the builder/SQL editor. It surfaces a preview error via an `<Alert>` (`QueryEditor.tsx:162`). **Important:** that `<Alert>` is only for the *editor preview*; it does NOT govern what happens when the variable is actually evaluated on the dashboard. The crash in #781 happens during dashboard evaluation/option-picking, downstream of `queryVariables`, not in this editor.

`DatasourceMode` enum: `src/types/types.ts:28-32` (`Variable | Datasource | Annotation`).

### 2.3 Execution path — `queryVariables`

`src/datasource/datasource.ts:539-643`. Walkthrough:

1. `targets` filtered to non-hidden with a non-empty query (or raw string targets) — line 542.
2. Each target is turned into a SQL statement via `createQuery` → `replace` (template/macro expansion, adhoc handling, backend AST round-trips) — lines 543-545.
3. Each statement is executed via `seriesQuery(stmt, requestId)` — line 552.
   - `seriesQuery` (line 739-742) appends `FORMAT JSON` and calls `_request`.
   - `_request` (line 207-234) resolves with `response.data` — i.e. **the ClickHouse JSON body**: `{ meta: [...], data: [...], rows: N, ... }`.
4. For each response, builds a `SqlSeries` (lines 567-575) with `series = response.data` (the row array) and `meta = response.meta` (column descriptors `{name, type}`).
5. Guard at line 563: `if (!response || !response.rows) { return; }` — empty results short-circuit.
6. **Branch logic (lines 577-635)** — converts `SqlSeries.series` into one `DataFrame`-like object `{ refId, length, fields }`, where `fields` carries `text` (and optionally `value`).

### 2.4 What Grafana does with the result

`queryVariables` returns (wrapped in `from(...)`, line 642) `{ data: [resultContent] }` where `resultContent.fields` has a `text` field and optionally a `value` field, both declared `FieldType.string`. Grafana's `CustomVariableSupport` reads these fields to build the variable options: each row becomes an option with `text` as the label and `value` as the stored value (falling back to text). Grafana then renders these in the variable dropdown. The `$__all` synthetic option and multi-value handling are layered on top by Grafana once the base options exist.

**The contract Grafana relies on:** `text`/`value` field values are primitive strings. The plugin *declares* `FieldType.string`, but several branches push **raw, non-string** values into those fields (see §3). That broken contract is the root cause.

---

## 3. `queryVariables` output branches — line by line (the bug)

Setup (lines 581-597): scan `meta` for any column whose lowercased name `includes('text')` → `textField`; any that `includes('value')` → `valueField`. Build `resultContent = {refId:'A', length, fields:[]}`.

### Branch A — text + value (lines 599-609)
```ts
if (textField && valueField) {
  resultContent.fields.push({ name:'text',  type:FieldType.string,
    values: sqlSeries.series.map(item => item[textField!].toString()) });   // 603
  resultContent.fields.push({ name:'value', type:FieldType.string,
    values: sqlSeries.series.map(item => item[valueField!].toString()) });  // 608
}
```
- Uses `.toString()`. For a JS **array** value, `[1,2].toString()` → `"1,2"` (a string). So this branch is **partially protected**: arrays become comma-joined strings (lossy but not a crash).
- **But** `.toString()` throws if the value is `null` or `undefined` (`null.toString()` → `TypeError`). So a NULL cell in a `__text`/`__value`-style query crashes *here*, inside the plugin (different stack than #781, but still a hard failure).
- For a plain object `{}` → `"[object Object]"` (useless but a string, no crash).

### Branch B — text only (lines 610-615)
```ts
} else if (textField) {
  resultContent.fields.push({ name:'text', type:FieldType.string,
    values: sqlSeries.series.map(item => item[textField!]) });             // 614  ← RAW, no normalization
}
```
- **No `.toString()`.** Whatever ClickHouse returned for that column is pushed **raw** into a field declared `FieldType.string`.
- For `Array(...)` columns, ClickHouse `FORMAT JSON` returns a **real JS array**, so `field.values = [ ['a','b'], ['c'] , ... ]` — arrays inside a "string" field. **This is the #781 trigger** when the chosen `text` column is array-typed (e.g. variable named `array_var_text` or any column matching `includes('text')`).

### Branch C — first String-typed column (lines 617-623)
```ts
const getFirstStringField = sqlSeries.meta.find((col:any) => col.type === 'String');
if (getFirstStringField) {
  resultContent.fields.push({ name:'text', type:FieldType.string,
    values: sqlSeries.series.map(item => item[getFirstStringField.name]) }); // 622  ← RAW
}
```
- `col.type === 'String'` is an **exact** match. `Array(String)`, `Nullable(String)`, `LowCardinality(String)`, `Map(...)`, `Tuple(...)` all **fail** this equality and fall through to Branch D.
- Even when it matches, values are pushed raw (fine for genuine `String`, which is already a JS string).

### Branch D — first element fallback (lines 624-632)
```ts
} else {
  const getFirstElement = sqlSeries.meta[0];
  resultContent.fields.push({ name:'text', type:FieldType.string,
    values: sqlSeries.series.map(item => item[getFirstElement.name]) });    // 630  ← RAW
}
```
- This is the **default landing zone for `Array(String)`** (since it is not exactly `'String'`, Branch C is skipped). Pushes raw arrays into a string field. **This is the most likely #781 path** for a query like `SELECT groupArray(service_name) AS arr ...` or `SELECT arrayColumn FROM ...`.

### Concrete data-shape walkthrough — `SELECT groupArray(name) AS arr`

ClickHouse `FORMAT JSON`:
```json
{ "meta":[{"name":"arr","type":"Array(String)"}],
  "data":[{"arr":["mysql","postgresql","redis"]}], "rows":1 }
```
- `textField`? `"arr".includes('text')` → false. `valueField`? false. → not Branch A/B.
- Branch C: `meta.find(c=>c.type==='String')` → none (`'Array(String)' !== 'String'`). → Branch D.
- Branch D: `getFirstElement = {name:'arr'}`; `item['arr']` = `["mysql","postgresql","redis"]` (a JS array).
- Result: `fields=[{name:'text', type:'string', values: [ ["mysql","postgresql","redis"] ]}]`.

So a single option whose "string" value is actually an array. Grafana builds an option from it; when the user opens the dropdown (and especially with `$__all` present, which adds a synthetic "All" element and triggers multi-value rendering), the option-list renderer iterates `children.at(...).props` and finds an element it cannot read → `props is undefined` → React crash that bubbles up uncaught and takes down the dashboard.

### Branches that can emit a non-string (summary)

| Branch | Line | Protection | Non-string possible? |
|---|---|---|---|
| A text+value | 603 / 608 | `.toString()` | Array→"1,2" OK; **null/undefined → throws**; object→"[object Object]" |
| B text-only | 614 | none | **YES — raw arrays/objects/null** |
| C first String | 622 | none (but type==='String' gate) | Practically string-only |
| D first element | 630 | none | **YES — raw arrays/objects/null/numbers** |

`.toString()` on 603/608 masks Branch A for arrays/objects but **not** for null; Branches B and D mask nothing.

---

## 4. Pinning the Grafana crash mechanism

**Confidence: medium-high on the cause, low on the exact minified frame.** I cannot read Grafana's minified `7836.*.js` / `4315.*.js`, so I cannot name the exact component. What is well-supported:

- The error class `TypeError: ...props.children.at(...).props is undefined` is a **React element traversal** failure: code does `someElement.props.children.at(i).props.X`. This pattern appears in Grafana's variable value rendering (`VariableValueSelect` / option `SelectMenu` / option group rendering), which maps option records to React children and then re-reads `.props` off them.
- A non-primitive option value (a JS array) leads to (a) a label that React renders as multiple children instead of a single text node, and/or (b) an option object whose `value` is an array, breaking the `===`/key logic Grafana uses to find the selected child. Either makes `children.at(i)` land on `undefined`/text-node, whose `.props` is `undefined`.
- The presence of **`$__all`** and **multi-value** (`repeated_service` is multi) is very likely contributory, not incidental: `$__all` adds the synthetic "All" option and forces Grafana into the multi-select rendering path that does the `children.at(...).props` traversal. With a single scalar string option, the simpler path may not hit the bad access. This matches the repro precisely targeting `var-array_var=$__all`.

**Honest uncertainty:** It is *possible* the crash is partly in custom-all-value/interpolation formatting rather than pure rendering, but the stack is a render-time `props` access, so rendering is the dominant suspect. The fix below (normalize values to strings) removes the precondition regardless of which exact frame fires, because Grafana then only ever sees primitive string options.

---

## 5. Other variable-value pitfalls (beyond `Array`)

All of these reach Branches B/C/D and are pushed raw (or `.toString()`'d in A):

- **`Map(K,V)`** → JSON object `{}` → raw object in string field (Branch D). Same crash class.
- **`Tuple(...)`** → JS array `[…]` → same as Array.
- **Nested / `Array(Tuple(...))`** (e.g. `$columns`-style) → array of arrays → worst case.
- **`Nullable(String)` with NULLs / any NULL cell** → `null` pushed raw (B/D) — Grafana may render an empty/odd option; in Branch A, `null.toString()` **throws** in the plugin.
- **Numbers** (`UInt*`, `Int*`, `Float*`) → numbers pushed into a `FieldType.string` field. Usually tolerated by Grafana (coerced), but technically violates the declared type; `$__all`/interpolation can behave oddly.
- **Very large arrays** → one giant comma-joined option (Branch A) or a huge array object (D) — performance/UX problem even if it does not crash.
- **`LowCardinality(String)`** → real value is a plain string, but `col.type==='String'` is false, so Branch C is skipped → falls to D. Still works (raw value is a string) but only by luck.

**Conclusion:** the fix should normalize **all** value types, not just `Array`. The class of bug is "non-primitive (or null) value in a field declared `FieldType.string`."

---

## 6. Solution design

### 6.1 Normalization helper

Add a small pure helper (suggested location: `src/datasource/helpers/index.ts`, which already exports `conditionalTest`, `convertTimestamp`, `createContextAwareInterpolation` — `src/datasource/helpers/index.ts:5,511,523`). Mirrors the object/null handling already used everywhere else (`toTable.ts:44-46`, `toTimeSeries.ts:24-26`, `toLogs`/`transformObject` `toLogs.ts:17-20`, `bigIntUtils.ts:146-151`):

```ts
/** Coerce any ClickHouse cell value to a primitive string suitable for a
 *  Grafana variable option. Objects/arrays -> JSON; null/undefined -> ''. */
export const normalizeVariableValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value); // arrays -> "[...]", maps/tuples -> "{...}"/"[...]"
  }
  return String(value);
};
```

(Design choice: `JSON.stringify` for arrays gives `["a","b"]` — round-trippable — rather than `.toString()`'s lossy `a,b`. Either is acceptable; JSON is recommended for consistency with the rest of the codebase and to avoid ambiguity when array elements contain commas. If preserving the existing `.toString()` "1,2" UX for Branch A matters for back-compat, keep that one branch's display but still guarantee a string.)

### 6.2 Exact edits in `queryVariables` (datasource.ts)

Replace the four `.map(...)` callbacks so every emitted value goes through `normalizeVariableValue`:

- **Line 603** `item => item[textField!].toString()` → `item => normalizeVariableValue(item[textField!])`
- **Line 608** `item => item[valueField!].toString()` → `item => normalizeVariableValue(item[valueField!])`
- **Line 614** `item => item[textField!]` → `item => normalizeVariableValue(item[textField!])`
- **Line 622** `item => item[getFirstStringField.name]` → `item => normalizeVariableValue(item[getFirstStringField.name])`
- **Line 630** `item => item[getFirstElement.name]` → `item => normalizeVariableValue(item[getFirstElement.name])`

Plus import the helper at the top of `datasource.ts` (it already imports from `./helpers` at line 25).

This single, uniform change eliminates **every** non-string code path (arrays, tuples, maps, nested, null, numbers) and removes the `null.toString()` throw in Branch A.

### 6.3 Normalize vs. throw a friendly error — recommended UX

The title says "show proper error messages instead of stacktrace," but two interpretations exist:

- **(a) Normalize to string (RECOMMENDED).** Turns an `Array(String)` variable into usable options (e.g. each row's array becomes a JSON/text label). No crash, dashboard stays alive, and the user actually gets values. This is strictly better than an error for the common case where the array is the data. It is also the pattern every *other* converter in this codebase already follows.

- **(b) Throw a friendly error.** Detect a complex column type and `throw new Error('Variable query column "arr" has type Array(String); variables require scalar columns. Use arrayJoin()/groupArray element access to return scalars.')`. A thrown error inside `queryVariables` is caught by Grafana's variable machinery and shown as a red error on the variable (in the editor preview via the `<Alert>` at `QueryEditor.tsx:162`, and as a variable-level error on the dashboard) — i.e. a "proper error message," not an uncaught React crash.

**Best UX = BOTH (recommended):**
1. **Always normalize** (6.2) so nothing can crash Grafana's renderer — this is the safety net.
2. **Additionally warn** when a complex type is detected, so the user understands why their array shows up as `["a","b"]`. The warning can be surfaced via the editor preview alert path and/or `console.warn`. Detection is cheap: inspect `sqlSeries.meta` for the chosen column's `type` and flag if it starts with `Array(`/`Map(`/`Tuple(`/`Nested(` or is `'Object'`/JSON.

This satisfies the literal title (a proper message) while also not punishing the legitimate "I want the array contents as options" use case.

**How a thrown error surfaces vs. the current crash:** today the bad value escapes `queryVariables` *successfully* (no throw) and Grafana crashes later in render — an **uncaught** error that breaks the whole dashboard with a minified stack. If instead the value is normalized, render succeeds. If a complex type is *thrown* in `queryVariables`, Grafana's variable subsystem catches it and renders a controlled "variable failed" message — contained, not a full-page React error boundary trip.

### 6.4 Confirm `FieldType.string` invariant

After normalization, every `values[]` entry is a primitive string, matching the declared `type: FieldType.string`. That is the actual contract Grafana relies on; the current code declares it but violates it.

---

## 7. Legacy `response_parser.ts` path — should it be fixed too?

`ResponseParser.parse` (`src/datasource/response_parser.ts:30-51`) is the **legacy** path used by `metricFindQuery` (`datasource.ts:695-731`), which feeds:
- adhoc filters (`adhoc.ts:40,106,129,163` → `processTagKeysResponse`/`processTagValuesResponse`), and
- query-builder autocomplete (`useConnectionData.ts:138`, `useSystemDatabases.ts:28`, `useAutocompletionData.ts:68`).

`parse` pushes values **raw** too:
- `{ text: result }` (line 32, non-object scalar),
- `{ text: result[textKey], value: result[valueKey] }` (line 42),
- `res.push(result)` (line 45, whole row),
- `{ text: result[textKey] }` (line 49).

None normalize objects/arrays/null. For **adhoc tag values** the downstream `processTagValuesResponse` (`adhoc.ts:177`) does `{ text: item.text, value: item.text }`, so an array `item.text` would propagate into the adhoc value dropdown — same class of risk, though adhoc *values* are usually scalar by construction (`SELECT DISTINCT col`). The repro URL *does* include an adhoc filter, but the crash is on `array_var`, so this path is secondary.

**Recommendation:** Fix `response_parser.ts` too, for consistency and defense-in-depth, but treat it as lower priority / separate commit. Tradeoffs:
- **Pro:** prevents the same crash class in adhoc/autocomplete; cheap (same helper).
- **Con:** adhoc/autocomplete results are normally scalars, so risk is lower; changing `parse` touches more consumers and warrants its own tests (it has existing tests in `response_parser.jest.ts` and `datasource.jest.ts:126-203` to keep green). Normalizing there must not change the existing key-value-pair behavior asserted at `datasource.jest.ts:331-333` (`{a,b,c}` round-trip).

Minimal-risk approach: ship the `queryVariables` fix first (directly closes #781), then a follow-up for `response_parser.ts`.

---

## 8. Complete test plan

There are **no existing tests for `queryVariables`**. Tests in this repo favor exercising pure transformation logic directly (see `sql_series_specs.jest.ts`, `datasource.jest.ts`) rather than the full async datasource (which depends on `resourceClient`, `templateSrv`, `backendSrv`).

### 8.1 Unit tests for the normalization helper (new, easiest, highest value)
File: `src/spec/datasource.jest.ts` (or a new `src/spec/variable-values.jest.ts`).
- `normalizeVariableValue('foo') === 'foo'`
- `normalizeVariableValue(42) === '42'`
- `normalizeVariableValue(null) === ''`
- `normalizeVariableValue(undefined) === ''`
- `normalizeVariableValue(['a','b']) === '["a","b"]'`
- `normalizeVariableValue({k:'v'}) === '{"k":"v"}'` (Map)
- `normalizeVariableValue([['a',1]]) === '[["a",1]]'` (Tuple/nested)

### 8.2 Branch-level tests for the variable result builder (recommended refactor)
The branch logic in `queryVariables` (lines 577-635) is duplicated almost verbatim in `processQueryResponse`'s Variable branch (`datasource.ts:421-480`). Extracting it into a pure exported function `buildVariableFields(meta, series)` returning `{fields}` would make it directly testable **and** fix both copies at once. Suggested tests:
- **Array(String) via first-element (Branch D):** `meta=[{name:'arr',type:'Array(String)'}]`, `series=[{arr:['mysql','postgresql']}]` → `fields[0].values === ['["mysql","postgresql"]']`, all strings, `type===FieldType.string`.
- **Array named `*text` (Branch B):** `meta=[{name:'arr_text',type:'Array(String)'}]`, value array → normalized string, no throw.
- **text+value with array value (Branch A):** `meta=[{name:'__text',type:'String'},{name:'__value',type:'Array(String)'}]` → both fields strings; value array → JSON string (and confirm `null` value no longer throws).
- **Map / Tuple cell:** `meta=[{name:'m',type:'Map(String,String)'}]`, `series=[{m:{a:'b'}}]` → `'{"a":"b"}'`.
- **null cells:** any branch with `null` → `''` (and explicitly assert Branch A no longer throws on null).
- **First-String gate:** `meta=[{name:'s',type:'String'},{name:'arr',type:'Array(String)'}]` → picks `s` (Branch C), value passes through unchanged.
- **Numbers:** `meta=[{name:'n',type:'UInt32'}]`, `series=[{n:5}]` → `'5'`.

### 8.3 `$__all` / multi-value expansion (integration-ish)
Pure unit tests can't reproduce Grafana's `$__all` renderer, but we can assert the **precondition is removed**: after normalization every `values[]` element passes `typeof === 'string'`. Add an assertion helper `expect(fields.every(f => f.values.every(v => typeof v === 'string'))).toBe(true)` across all the §8.2 cases. This is the testable invariant that prevents the crash.

### 8.4 Manual / E2E repro
- Create a CH table; define a dashboard variable `array_var` with query `SELECT groupArray(service_name) AS arr FROM default.test_grafana`.
- Set the variable to **All** (`$__all`) and open the dropdown.
- **Before fix:** dashboard crashes with the React stack from the issue.
- **After fix:** dropdown shows a JSON-string option (e.g. `["mysql","postgresql"]`), no crash.
- A Playwright test under `tests/e2e/features/` could create such a variable and assert the page does not throw and the option renders; mark as the regression guard for #781. (E2E is heavier; the §8.2/§8.3 unit tests are the primary coverage.)

---

## 9. Effort breakdown & sizing

| Task | Effort |
|---|---|
| Add `normalizeVariableValue` helper + unit tests | XS (~30 min) |
| Apply to 5 call sites in `queryVariables` (603,608,614,622,630) | XS |
| (Recommended) extract `buildVariableFields` and reuse in `processQueryResponse:421-480` | S (~1-2 h, dedupes two copies) |
| Branch-level unit tests (§8.2/§8.3) | S |
| Optional complex-type warning (detect + surface) | S |
| Optional `response_parser.ts` normalization + keep existing tests green | S |
| Optional E2E regression test | S-M |

**Overall sizing: S (Small).** Core fix is a handful of lines + a helper + tests. Doing the recommended refactor (dedupe the two identical branch blocks) and the response_parser pass nudges it toward the upper end of S but not M.

---

## 10. Risks & uncertainty

- **Exact crash frame: low confidence.** Cannot read minified Grafana; the named component is inferred from the error signature. Mitigation: the fix removes the *only* plausible precondition (non-string option values), so it is robust regardless of the exact frame.
- **Behavior change for array variables:** options now appear as JSON strings instead of crashing. This is a net improvement, but users with array columns will see `["a","b"]` instead of nothing. If a different display is desired (e.g. `arrayJoin` semantics — one option per element), that is a feature, not part of this fix; the warning (§6.3) tells them how.
- **`.toString()` → JSON change in Branch A** alters the rendered form for existing array text+value variables from `a,b` to `["a","b"]`. If strict back-compat is required, keep `.toString()`-style joining for that one branch but still guard null. Low risk; arrays in `__text/__value` variables are rare.
- **`response_parser.ts` change risk:** must preserve the key-value-pair path asserted by `datasource.jest.ts:331-333` and `response_parser.jest.ts`. Keep it a separate, test-guarded change.
- **What to confirm before/after:** (1) reproduce the crash on current branch with the §8.4 steps to capture the real stack; (2) confirm post-fix the dropdown + `$__all` + multi-value combo all render; (3) re-run `npm run test` and `npm run lint`.

---

## 11. Step-by-step execution checklist

1. **Reproduce** on `datalinks-fixed`: build a variable `SELECT groupArray(...) AS arr`, set to `$__all`, open dropdown, capture the real (non-minified-as-possible) stack. Confirm it matches #781.
2. **Add helper** `normalizeVariableValue` to `src/datasource/helpers/index.ts` and export it.
3. **Add unit tests** for the helper (§8.1).
4. **(Recommended) Extract** `buildVariableFields(meta, series)` pure function and call it from BOTH `queryVariables` (datasource.ts:577-635) and `processQueryResponse` Variable branch (datasource.ts:421-480). Otherwise, edit the 5 call sites directly (603, 608, 614, 622, 630) per §6.2.
5. **Add branch tests** (§8.2) + the `$__all` string-invariant assertion (§8.3).
6. **(Optional) Complex-type warning** in the editor preview / console when `meta` shows `Array(`/`Map(`/`Tuple(`/`Nested(`.
7. **(Optional) Normalize `response_parser.ts`** (lines 32,42,45,49) with the same helper; keep `response_parser.jest.ts` + `datasource.jest.ts` green.
8. **(Optional) E2E** regression test under `tests/e2e/features/`.
9. **Verify:** `npm run test`, `npm run lint`; manual §8.4 confirming no crash and a JSON-string option appears; confirm `$__all` + multi-value `repeated_service` + adhoc filter from the repro URL all coexist without crashing.
10. **Commit** referencing #781; if doing the response_parser pass, keep it a separate commit.

---

## Appendix — key file:line references

- Variable support wiring: `src/datasource/datasource.ts:102-109`
- `queryVariables` (buggy branches): `src/datasource/datasource.ts:539-643`; raw pushes at **614, 622, 630**; `.toString()` at **603, 608**
- Duplicate branch logic in query path: `src/datasource/datasource.ts:421-480`
- Editor component: `src/views/QueryEditor/QueryEditor.tsx:105-…` (preview alert at 162)
- `DatasourceMode` enum: `src/types/types.ts:28-32`
- Legacy parser: `src/datasource/response_parser.ts:30-51`
- Adhoc consumers of legacy parse: `src/datasource/adhoc.ts:40,54-88,106,129,163,176-179`
- Existing object/null normalization precedent: `toTable.ts:44-46`, `toTimeSeries.ts:24-26,159-164`, `toLogs.ts:17-20`, `bigIntUtils.ts:146-151`
- Helpers module (suggested home for new helper): `src/datasource/helpers/index.ts:5,511,523`
- `seriesQuery`/`_request` result shape (`{meta,data,rows}`): `src/datasource/datasource.ts:207-234,739-742`
- Test patterns: `src/spec/datasource.jest.ts`, `src/spec/response_parser.jest.ts`, `src/spec/sql_series_specs.jest.ts` (no `queryVariables` tests exist)
