# Issue #678 — Complex types in Logs panel +/- filters and adhoc, doesn't work

> Deep-dive analysis. Repo: `Altinity/clickhouse-grafana` (TS frontend + Go backend). Branch: `datalinks-fixed`. READ-ONLY analysis — no source modified.

---

## 0. Issue summary (verified from `gh issue view 678`)

- **Title:** "Complex types in Logs panel +/- filters and ahdoc, doesn't work"
- **Author:** Slach (Eugene Klimov). **State:** OPEN. **Labels:** `bug`, `p3`.
- **Body (verbatim core):** "adhoc filters from details doesn't work ;( … we need to option to allow enable and disable filters for complex clickhouse types like Map/Object etc."
- The reporter shows that clicking a filter on a Map column produces:
  ```sql
  SELECT *
  FROM default.test_logs_with_complex_labels
  WHERE (_time >= toDateTime64(1732609375, 3)) AND (_time <= toDateTime64(1732782175, 3))
        AND (_map = '{"map_key0":"map_value0"}')
  FORMAT JSON
  ```
  which **errors at ClickHouse** (cannot compare a `Map` column to a `String` literal).
- A ClickHouse-specific single-quote serialization (`'{\'map_key0\':\'map_value0\'}'`) "works" but the reporter explicitly states he does not know how to implement it correctly for all ClickHouse invariants.
- **Dropdown value selection also fails** (the adhoc values dropdown).
- **Only comment** (lunaticusgreen, collaborator): links Grafana core issue `grafana/grafana#98038` (a request to disable filters per-field; closed stale).

### Two conflated problems (confirmed correct)
- **(a) The real bug:** the +/- buttons and adhoc filters emit **invalid ClickHouse SQL** for complex column types (Map / Object / JSON / Array / Tuple).
- **(b) The proposed workaround:** "option to enable/disable filters per field." This needs a **Grafana core change** (issue #98038, now stale) and is **unnecessary** if every click produces valid SQL. See §8.

> **Important nuance discovered during the trace:** The screenshot in the issue (`_map = '{...}'`, the *whole map* serialized) reflects behavior **before** commit `b6c1db6a` ("Add display for first level of map properties", 2025-03-24). The issue was filed 2024-12-16. On the **current `datalinks-fixed` branch**, first-level Map keys are now flattened to labels like ``_map['map_key0']`` (see §1.2). This **partially fixes Map(String,String)** but leaves a family of related bugs (nested Map, JSON dot-path, Array, numeric-string values, unescaped keys, dropdown). The issue is therefore **only partially resolved** by the current code, and the remaining cases still emit broken SQL or silently drop filters. The fix below addresses the complete matrix.

---

## 1. Exact current behavior, traced in code

### 1.1 Frontend +/- buttons → adHocFilters

**`src/datasource/datasource.ts:341` `toggleQueryFilter`:**
```ts
toggleQueryFilter(query: CHQuery, filter: any): any {
  let filters = [...query.adHocFilters];
  let isFilterAdded = query.adHocFilters.filter(
    (f) => f.key === filter.options.key && f.value === filter.options.value
  ).length;
  if (filter.type === 'FILTER_FOR') {
    if (isFilterAdded) {
      filters = filters.filter(
        (f) => f.key !== filter.options.key && f.value !== filter.options.value && f.operator !== filter.options.operator
      );
    } else {
      filters.push({ value: filter.options.value, key: filter.options.key, operator: '=' });
    }
  } else if (filter.type === 'FILTER_OUT') {
    if (isFilterAdded) { /* same remove logic */ }
    else { filters.push({ value: filter.options.value, key: filter.options.key, operator: '!=' }); }
  }
  return { ...query, adHocFilters: filters };
}
```
Key facts:
- The **`key`** comes straight from Grafana's `filter.options.key`, which for a logs `labels` field is **the label key string** as emitted by `toLogs` (e.g. ``_map['map_key0']``). The **`value`** is the label value (e.g. `map_value0`).
- Operator is hard-coded to `=` (FILTER_FOR) or `!=` (FILTER_OUT). No `=~`/`!~`/`>` from this path; those only come from the adhoc variable UI.
- **Removal bug (pre-existing, unrelated but worth noting):** the remove predicate uses `&&` across key/value/operator, so it only removes a filter when **all three differ** — i.e. it rarely removes the intended one. Toggling a filter off is broken. Out of scope for #678 but should be filed.

**`src/datasource/datasource.ts:380` `queryHasFilter`:**
```ts
queryHasFilter(query: CHQuery, filter: QueryFilterOptions): boolean {
  return query.adHocFilters.some((f) => f.key === filter.key && f.value === filter.value);
}
```
Used by Grafana to render the +/- toggle state. Both methods push into the **same `query.adHocFilters` array** that the adhoc-variable path also feeds — so the +/- path and the adhoc path **share the backend SQL generator** (`ProcessAdhocFilters`). Confirmed: one fix location covers both.

`CHQuery.adHocFilters` is typed `any[]` (`src/types/types.ts:44`), default `[]` (`:108`). No type metadata is carried per filter today.

### 1.2 How label key/value originate — `toLogs.ts`

**`transformObject` (`src/datasource/sql-series/toLogs.ts:6-50`)** flattens the **first level** of nested objects:
```ts
// For arrays, we still stringify
result[key] = JSON.stringify(value);          // arrays → JSON string  (line 20)
...
// For objects, extract first level properties
const newKey = `${key}['${nestedKey}']`;       // Map/Object → key['nestedKey']  (line 27)
if (nestedValue && typeof nestedValue === 'object') {
  result[newKey] = JSON.stringify(nestedValue); // deeper than 1 level → JSON string (line 31)
} else {
  result[newKey] = nestedValue;                 // primitive leaf kept as-is (line 34)
}
```
Consequences (the crux of the bug surface):
- **Map(String,String)** `{map_key0: map_value0}` → label key ``_map['map_key0']``, value `map_value0`. **First-level only.**
- **Nested Map** `{a: {b: v}}` → label key ``_map['a']``, value `'{"b":"v"}'` (JSON string of the inner object). The user can only filter on the *stringified inner object*, never on `b`.
- **Array(String/Int)** → entire array `JSON.stringify`'d into one label value: ``_arr`` = `["x","y"]`. No per-element key.
- **Tuple / nested objects > 1 deep** → JSON string.

**`_toFieldType` (`src/datasource/sql-series/toLogs.ts:52-85`)** maps ClickHouse types to Grafana `FieldType`. There is **no case** for `Map`, `Array`, `Tuple`, `Object`, `JSON` — they fall through to the default `return FieldType.string` (line 84). `Nullable(...)` is unwrapped (lines 53-56); `LowCardinality(...)` is **not** unwrapped (so `LowCardinality(String)` → string by fall-through, which is fine for type bucketing but the wrapper name leaks elsewhere). Because complex types bucket as `string`, the column qualifies as a **label field** (lines 121-128) and gets folded into the `labels` field of the data frame.

**Label field emission:**
- labelFields selection (`toLogs.ts:121-128`): `type === number || string`, not the message field, not in `['severity','level','id']`, not a promoted data-link column.
- `transformObject(labels)` is pushed per row (`toLogs.ts:147`).
- The `labels` field is emitted as `FieldType.other` (`toLogs.ts:190-194`):
  ```ts
  labelFieldsList.length && { name: 'labels', values: labelFieldsList, type: FieldType.other },
  ```
- The `body` field is explicitly `config: { filterable: false }` (`toLogs.ts:188`), but **labels are filterable** — that's what powers the +/- buttons in the logs detail view.

> So today: clicking +/- on ``_map['map_key0']`` pushes `{key:"_map['map_key0']", value:"map_value0", operator:"="}`.

### 1.3 Backend SQL build — `pkg/adhoc/adhoc_filters.go`

Full function (the single source of truth for SQL generation, shared by all 3 call sites in `resource_handlers.go:375, 615, 1025`):
```go
func ProcessAdhocFilters(adhocFilters []AdhocFilter, targetDatabase, targetTable string) []string {
	var adhocConditions []string
	for _, filter := range adhocFilters {
		var parts []string
		if strings.Contains(filter.Key, ".") {
			parts = strings.Split(filter.Key, ".")            // (A) splits on '.'
		} else {
			parts = []string{targetDatabase, targetTable, filter.Key}
		}
		if len(parts) == 1 { parts = append([]string{targetTable}, parts...) }
		if len(parts) == 2 { parts = append([]string{targetTable}, parts...) }
		if len(parts) < 3 { continue }
		if targetDatabase != parts[0] || targetTable != parts[1] { continue }  // (B) db/table gate

		operator := filter.Operator
		switch operator {
		case "=~": operator = "LIKE"
		case "!~": operator = "NOT LIKE"
		}

		var value string
		switch v := filter.Value.(type) {
		case float64:
			value = fmt.Sprintf("%g", v)
		case string:
			// Don't quote if it's already a number or contains special SQL syntax
			if regexp.MustCompile(`^\s*\d+(\.\d+)?\s*$`).MatchString(v) ||   // (C) numeric-string bug
				strings.Contains(v, "'") ||                                  // (D) any quote → emitted raw
				strings.Contains(v, ", ") {
				value = v
			} else {
				escaped := strings.ReplaceAll(v, "'", "''")
				value = fmt.Sprintf("'%s'", escaped)
			}
		default:
			str := fmt.Sprintf("%v", v)
			escaped := strings.ReplaceAll(str, "'", "''")
			value = fmt.Sprintf("'%s'", escaped)
		}
		condition := fmt.Sprintf("%s %s %s", parts[2], operator, value)        // (E) raw key injection
		adhocConditions = append(adhocConditions, condition)
	}
	return adhocConditions
}
```

**Confirmed bugs/latent issues, traced to lines:**

1. **(A) Dot-splitting breaks any key containing `.`** — including JSON/Object dot-paths and Map keys that contain a literal `.`. Example: key `_json.user.id` → `parts = ["_json","user","id"]` → `parts[0]="_json" != targetDatabase` → **filter silently dropped** (gate B). A Map key like ``_map['a.b']`` does **not** contain a top-level `.`? It does: the substring `.` inside `['a.b']` triggers the split → `["_map['a", "b']"]` → 2 parts → prepend table → `[table, "_map['a", "b']"]` → `parts[0]=table != targetDatabase` → dropped. **Hostile/realistic keys with `.` are silently lost.**

2. **(C) numeric-looking string value left unquoted.** A `String`-typed value that looks numeric (e.g. an order id `"12345"`, a version `"1.2"`, a zip code) is emitted **without quotes** → `col = 12345`. For a `String` column ClickHouse raises `Illegal types of arguments` / `Cannot parse` (String vs UInt). This is the classic "numeric-string" bug. Conversely a genuinely numeric Map leaf (`Map(String,Int)`) value arriving as JSON number → handled by the `float64` branch as `%g` (OK), but if it arrives as a string it's matched by the regex (accidentally OK for Int, wrong for String).

3. **(D) value containing a single quote is emitted RAW (un-escaped, un-quoted).** `strings.Contains(v, "'")` → `value = v` verbatim. So value `O'Brien` → `col = O'Brien` → **syntax error / SQL injection vector**. This is a real injection bug, not just a complex-type bug.

4. **(E) raw key injection.** `parts[2]` (the column expression) is concatenated **with no validation/escaping**. For a flattened Map label the key is ``_map['map_key0']`` — which is *coincidentally valid ClickHouse subscript syntax*, so Map(String,String) "works by accident" today. But a key containing a `'` or `]` (e.g. a map key `it's` → label ``_map['it's']``) injects/breaks SQL. A maliciously-shaped key is an injection vector. There is **no allow-listing** of the key against the table's real columns.

5. **No type awareness whatsoever.** `AdhocFilter` struct (`adhoc_filters.go:9-14`) carries only `Key string`, `Operator string`, `Value interface{}`. The backend cannot tell Map from Array from String, so it cannot choose `col['k']=v` vs `has(col,v)` vs `col=v`.

**Net current behavior matrix (current branch):**

| Column type | Label key produced | Click → SQL emitted | Result |
|---|---|---|---|
| `Map(String,String)` | ``_map['k']`` | ``_map['k'] = 'v'`` | **works by accident** (valid subscript) |
| `Map(String,Int)` | ``_map['k']`` | ``_map['k'] = 5`` (float64) or `= 5` (numeric-string) | usually works |
| `Map(String,String)` value w/ quote | ``_map['k']`` | ``_map['k'] = O'Brien`` | **syntax error** |
| `Map(String,String)` key w/ quote/`]`/`.` | broken key | dropped or broken | **dropped/broken** |
| nested `Map`/`Object`>1 | ``_map['a']`` = `'{"b":"v"}'` | ``_map['a'] = '{"b":"v"}'`` | **CH error** (Map vs String) |
| `Array(String)` | ``_arr`` = `'["x","y"]'` | ``_arr = '["x","y"]'`` | **CH error** (Array vs String) |
| `JSON`/`Object` dot key | `_json.a.b` | (split) → dropped | **silently dropped** |
| `String` numeric-looking value | `id` | `id = 12345` | **CH error** (String vs UInt) |

### 1.4 Adhoc values dropdown — `src/datasource/adhoc.ts`

- `DEFAULT_VALUES_QUERY = 'SELECT DISTINCT {field} AS value FROM {database}.{table} LIMIT 300'` (`adhoc.ts:3`).
- `GetTagKeys` runs `SELECT database, table, name, type FROM system.columns WHERE {filter} ORDER BY database, table` (`adhoc.ts:13`). **The plugin already reads each column's ClickHouse `type`** here. Today it's used only to special-case `Enum` (`adhoc.ts:64-78`) and is otherwise discarded.
- `GetTagValues` (`adhoc.ts:93-174`): splits `options.key` on `.` (`adhoc.ts:147`), requires 2-3 parts, then `buildQuery` substitutes `{field}` literally into `SELECT DISTINCT {field} ...`.
  - For a complex column the dropdown is keyed on the **bare column name** (e.g. `_map`), so `SELECT DISTINCT _map` returns whole maps (objects) — the dropdown shows JSON blobs, and selecting one produces `_map = '<json>'` → the original bug.
  - For a flattened key ``_map['k']`` (if it ever reaches here) the `.split('.')` logic mis-parses and the `{field}` substitution would inject the bracket expression — only works for Map(String,*) by accident, and only if the key has no `.`.
  - `Enum` values are pre-resolved from the type string (`adhoc.ts:64-78`) — a precedent for type-driven value generation we can extend.

---

## 2. Type awareness — where the CH column type lives

| Location | Has CH type? | How |
|---|---|---|
| Frontend adhoc (`adhoc.ts` `GetTagKeys`) | **Yes** | `SELECT … type FROM system.columns` (line 13). Currently only Enum is used; type is available per (db,table,name). |
| Frontend logs (`toLogs.ts`) | **Yes** | `self.meta[].type` is the CH type string per column (used by `_toFieldType`). The flattened label key is constructed here, so the type is in scope at construction time. |
| Backend `ProcessAdhocFilters` | **No** | `AdhocFilter` has only key/op/value. **Type must be threaded in.** |

**Threading options (recommended: combine 1 + 3):**
1. **Encode the access path + leaf semantics into the label KEY** (round-trip pattern). The key is the only field that survives Grafana's primitive-only filter model end-to-end, and `toLogs`/`GetTagKeys` already know the type when they build the key. The decoder lives in the backend.
2. **Add `Type string` to the `AdhocFilter` struct** and have the frontend populate it (it knows the type from `system.columns`). Cleaner but requires the frontend to attach type to every adhoc filter, and Grafana's adhoc-variable filters don't carry type — so this only works for the +/- path and the plugin-managed adhoc path, not arbitrary Grafana adhoc variables.
3. **Backend self-discovery:** in `ProcessAdhocFilters` look up the column's type via `system.columns` for `(targetDatabase, targetTable, baseColumn)`. Authoritative and works for *all* paths (including raw adhoc variables), but adds a metadata query. Cache it.

**Decision:** Primary mechanism = **(1) key encoding** for the access path (which is purely structural and already correct in the key), plus **(3) backend type lookup** for the *leaf scalar subtype* (to decide quoting Int vs String and Array element type) with an in-process TTL cache. (2) is a nice-to-have to avoid the lookup on the +/- path but is not load-bearing.

---

## 3. The full fix — encode/decode key format + Tier 1–4 ladder

### 3.1 Key encoding (round-trip) — make Grafana only ever see primitives

The frontend already produces ``col['key']`` for first-level Map. Generalize the encoding so the **key carries the full native accessor**, the **value stays primitive**, and the **backend decodes the key into a ClickHouse accessor expression**. Crucially, keep the encoding **ClickHouse-accessor-shaped** so decoding is near-identity and round-trip-safe.

**Canonical key grammar (frontend → backend):**
```
accessorKey := baseColumn segment*
segment     := mapSubscript | jsonDotPath | arrayMarker
mapSubscript:= '[' quotedKey ']'              // col['a']  (Map / Object subscript)
jsonDotPath := '.' identifier                  // col.a.b   (JSON/Object dot path)
arrayMarker := '[]'                            // col[]     (Array element; value matched via has())
quotedKey   := "'" escaped "'"                 // single-quoted, '' -> '' escaped, exotic chars hex-escaped
```
Examples produced by `toLogs`/`GetTagKeys`:
- `Map(String,String)` leaf `a` → ``_map['a']``
- nested `Map(String,Map(String,Int))` leaf `a.b` → ``_map['a']['b']``
- `JSON`/`Object('json')` path `user.id` → ``_json.user.id`` (dot path)
- `Array(String)` → ``_arr[]`` (array marker; the value selects which element)
- `Tuple(...)` named element → ``_tup.elementName`` (decode to `_tup.elementName`); positional → ``_tup.1``.

**Why not invent a non-CH encoding (e.g. JSONPath `$.a.b`)?** Because the existing label already uses CH subscript syntax and the maintainer's design calls for a *near-identity* decode. Keeping the encoding CH-shaped minimizes round-trip risk (no lossy translation) and means the decoder is mostly a *validator + escaper*, not a transformer.

### 3.2 Decoder (backend, in `ProcessAdhocFilters`)

Replace the `strings.Split(key, ".")` qualifier logic with a **tokenizer** that:
1. Splits off the optional `db.table.` qualifier **only when it appears before the base column and the base column is a real column** (look it up). Do **not** split on `.` that occurs *inside* `[...]` or *after* the base column (dot-path segments).
2. Parses the remaining string into `(baseColumn, []segment)` per the grammar.
3. **Allow-lists `baseColumn`** against `system.columns` for `(db,table)`. If not a real column → **refuse (Tier 4)**: drop filter, attach a notice. This closes the raw-key-injection hole (E).
4. Re-emits each segment safely: Map subscript `[%s]` with the key **re-escaped** (`'` → `''`, and bracket/control chars hex-escaped), dot-path as `.ident` with `ident` validated `^[A-Za-z_][A-Za-z0-9_]*$`, array marker → wrap in `has(...)`.
5. Looks up the **leaf scalar type** to drive value quoting (§3.4).

Pseudocode (Go, illustrative):
```go
type accessor struct {
	base     string
	segs     []segment // {kind: map|dot|array, key string}
	leafType string    // resolved CH scalar type of the leaf, e.g. "String","Int64","UInt8"
	valueExpr string   // built SQL value-bearing left-hand expr
}

func decodeKey(rawKey, db, table string, cols map[string]string) (accessor, bool) {
	base, rest := splitBase(rawKey)          // qualifier-aware, bracket-aware
	colType, ok := cols[base]
	if !ok { return accessor{}, false }      // Tier 4: not a real column
	segs, ok := parseSegments(rest)
	if !ok { return accessor{}, false }      // malformed accessor → Tier 4
	leaf := resolveLeafType(colType, segs)   // walk Map/Array/Tuple/JSON to the leaf
	return accessor{base, segs, leaf, ""}, true
}
```

### 3.3 Tier 1–4 degradation ladder (concrete I/O)

Notation: input `(key, op, value, columnType)` → emitted SQL predicate.

**Tier 1 — flatten to scalar predicate (typed Map / JSON dot / nested):**
| Input | Emitted |
|---|---|
| ``(_map['a'], =, "v", Map(String,String))`` | ``_map['a'] = 'v'`` |
| ``(_map['a'], =, "5", Map(String,Int64))`` | ``_map['a'] = 5`` (leaf Int → no quote) |
| ``(_map['a']['b'], =, "v", Map(String,Map(String,String)))`` | ``_map['a']['b'] = 'v'`` |
| ``(_json.user.id, =, "5", JSON)`` | ``_json.user.id = 5`` (or `= '5'` if leaf dynamic → toString floor) |
| ``(_obj.path, =, "v", Object('json'))`` | ``_obj.path = 'v'`` |

**Tier 2 — type-appropriate accessor (Array, Tuple):**
| Input | Emitted |
|---|---|
| ``(_arr[], =, "x", Array(String))`` | ``has(_arr, 'x')`` |
| ``(_arr[], !=, "x", Array(String))`` | ``NOT has(_arr, 'x')`` |
| ``(_arr[], =, "5", Array(Int64))`` | ``has(_arr, 5)`` |
| ``(_arr[], =~, "x%", Array(String))`` | ``arrayExists(e -> e LIKE 'x%', _arr)`` |
| ``(_tup.name, =, "v", Tuple(name String, age UInt8))`` | ``_tup.name = 'v'`` |
| ``(_tup.1, =, "5", Tuple(UInt8, String))`` | ``_tup.1 = 5`` |

**Tier 3 — universal `toString` floor** (heterogeneous/dynamic keys, unknown leaf, JSON with `Dynamic` leaves, anything we can't statically type):
| Input | Emitted |
|---|---|
| ``(_dyn.x, =, "v", JSON/Dynamic)`` | ``toString(_dyn.x) = 'v'`` |
| ``(_map['a'], =, "v", Map(String, <unknown>))`` | ``toString(_map['a']) = 'v'`` |
| whole complex col fallback | ``toString(_map) = 'v'`` (only if user explicitly filters the whole column) |
Values for Tier 3 dropdowns come from `SELECT DISTINCT toString(<accessor>) …` so they always match.

**Tier 4 — refuse safely** (never emit broken SQL, never cause a CH error):
- base column not in `system.columns` → drop + notice "Filter on `X` skipped: not a column of `db.table`."
- malformed accessor (unparseable segments, depth cap exceeded) → drop + notice.
- operator not supported for the type (e.g. `>` on a Map subscript with String leaf is allowed; `=~` on Array Int → drop or coerce) → drop + notice.
- **The contract: a click can NEVER produce SQL that errors at ClickHouse.** Worst case = filter is dropped with a user-visible notice.

### 3.4 Value quoting per leaf subtype (fixes the numeric-string bug C and quote bug D)

Replace the heuristic in `adhoc_filters.go:56-75` with **leaf-type-driven** quoting:
```go
func quoteValue(v interface{}, leafType string) string {
	base := unwrap(leafType) // strip Nullable(...), LowCardinality(...)
	switch {
	case isNumeric(base): // (U)Int*, Float*, Decimal*
		switch x := v.(type) {
		case float64: return strconv.FormatFloat(x, 'g', -1, 64)
		case string:  return sanitizeNumeric(x) // validate it's numeric; else Tier4
		default:      return fmt.Sprintf("%v", x)
		}
	case isBool(base):
		return normalizeBool(v) // 0/1
	default: // String, FixedString, UUID, Date*, Enum, IPv*, unknown
		s := fmt.Sprintf("%v", v)
		return "'" + escapeSQLString(s) + "'" // ALWAYS quote + escape, even if it looks numeric or has quotes
	}
}
func escapeSQLString(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `'`, `\'`) // or '' doubling — pick one consistently; ClickHouse accepts both
	return s
}
```
Key corrections vs current code:
- A `String` leaf value `"12345"` → ``'12345'`` (was `12345` → CH error). **Bug C fixed.**
- A value `O'Brien` → ``'O\'Brien'`` (was raw → syntax error/injection). **Bug D fixed.**
- A numeric leaf value `5` (from string or float) → `5` (no quotes). Correct for Int/Float.
- Decimal/Float formatting via `strconv` (avoid `%g` precision loss; e.g. large ints printed in exponent form). **Note:** current `%g` on `float64(200)` happens to print `200`, but `%g` on `float64(100000000)` prints `1e+08` → would break. `strconv.FormatFloat(x,'g',-1,64)` is safer; for integer leaves prefer `%.0f` or pass through as JSON-int string.

### 3.5 Operators (`=`, `!=`, `=~`/LIKE, `!~`/NOT LIKE) per tier

| Op | Scalar leaf (T1/T3) | Array (T2) |
|---|---|---|
| `=` | `lhs = val` | `has(arr, val)` |
| `!=` | `lhs != val` | `NOT has(arr, val)` |
| `=~` | `lhs LIKE val` | `arrayExists(e -> e LIKE val, arr)` |
| `!~` | `lhs NOT LIKE val` | `NOT arrayExists(e -> e LIKE val, arr)` |
| `>` `>=` `<` `<=` | `lhs <op> val` (numeric leaf only; else Tier4) | n/a → Tier4 |
LIKE values must NOT be over-escaped (the `%`/`_` wildcards are intentional); only escape the surrounding quote.

### 3.6 Wrapper unwrapping
`Nullable(T)`, `LowCardinality(T)`, `LowCardinality(Nullable(T))` → unwrap recursively to find both the **container kind** (Map/Array/Tuple/JSON/scalar) and the **leaf scalar type**. `toLogs._toFieldType` already unwraps `Nullable` but not `LowCardinality`; the decoder must unwrap both. Map missing-key semantics interact with Nullable (see §5).

---

## 4. Dropdown values — per-type DISTINCT query

`GetTagValues` must generate the values query from the **column type** (already available in `GetTagKeys`/`system.columns`) and the **encoded accessor**:

| Column type | Values query | Notes |
|---|---|---|
| scalar | `SELECT DISTINCT col AS value FROM db.t LIMIT N` | current behavior |
| `Map(String,V)` (filtering a leaf ``col['k']``) | `SELECT DISTINCT col['k'] AS value FROM db.t WHERE mapContains(col,'k') LIMIT N` | `mapContains` avoids the default-value row (see §5) |
| `Map(String,V)` (enumerate keys for adhoc) | `SELECT DISTINCT arrayJoin(mapKeys(col)) AS value FROM db.t LIMIT N` | lets the dropdown offer keys, then a second dropdown offers values |
| `Array(T)` | `SELECT DISTINCT arrayJoin(col) AS value FROM db.t LIMIT N` | per-element values; filter emits `has()` |
| `JSON`/`Object` path `col.a.b` | `SELECT DISTINCT col.a.b AS value FROM db.t LIMIT N` | or `toString(col.a.b)` floor |
| `Tuple` element | `SELECT DISTINCT col.elem AS value FROM db.t LIMIT N` | |
| unknown / dynamic | `SELECT DISTINCT toString(<accessor>) AS value FROM db.t LIMIT N` | Tier 3 floor — guarantees the selected value round-trips |

Implementation: extend `adhoc.ts` so `DEFAULT_VALUES_QUERY` is **chosen by type**. Reuse the type captured in `GetTagKeys` (build a `{ "db.table.col": type }` map alongside `tagKeys`). The `{field}` substitution must use the **decoded accessor**, never the raw bracketed string blindly (escape the map key). The dropdown selection then carries the **encoded key** so the backend round-trips it.

Selecting from the dropdown must produce the **same encoded key** the +/- button produces, so both paths converge on `ProcessAdhocFilters`.

---

## 5. Missing-key default semantics (false matches)

**ClickHouse gotcha (confirmed in design):** `m['missing_key']` returns the **value-type default** (e.g. `''` for String, `0` for Int), **not NULL**. So:
- `WHERE _map['k'] = ''` matches **every row where `k` is absent** (false positives).
- Deep paths `_map['a']['b']` match rows where `a` is absent (inner map defaults to empty, `['b']` → default).

**Design — guard with `mapContains` (and depth-aware guards):**
- For `=` on a Map leaf, optionally emit: `mapContains(_map,'k') AND _map['k'] = 'v'`. This excludes default-value false matches.
- For nested: `mapContains(_map,'a') AND mapContains(_map['a'],'b') AND _map['a']['b'] = 'v'`.
- For `!=`: be careful — `mapContains(...) AND _map['k'] != 'v'` (only consider present keys) vs the looser `_map['k'] != 'v'` (treats absent as `!= 'v'`, i.e. matches absent). Make this a **documented choice**; default to "key must be present" for both `=` and `!=` for least surprise, with an option.
- **Tradeoff:** `mapContains` guards add cost and verbosity, and for the dropdown values query they prevent the empty-string blob row from appearing. They are **opt-in via a datasource setting** (`adHocMapContainsGuard`, default ON) because some users may *want* default-match semantics.
- JSON/Object paths: a missing path yields NULL or default depending on engine/version — Tier 3 `toString()` floor sidesteps ambiguity (`toString(NULL)`/empty handled explicitly).

---

## 6. Deep / dynamic nesting — caps, notice, dynamic keys

- **SQL correctness is depth-independent** (chained subscript valid at any depth; leaf type statically known for typed Maps). Confirmed. The real problems are:
  1. **Label cardinality explosion:** flattening b-ary maps of depth d yields up to `b^d` leaf labels **per row**, exploding the `labels` field and the dropdown.
  2. **Dynamic/heterogeneous keys:** can't enumerate keys for the adhoc dropdown when keys vary per row (use `arrayJoin(mapKeys(col))` with `LIMIT`).
  3. **Key-string length / exotic chars:** round-trip risk through the encoded key (quotes, brackets, dots, control chars, very long keys).
- **Concrete caps (recommended defaults, configurable):**
  - `flattenDepthCap = 2` (flatten first 2 Map levels; deeper → JSON string + Tier 3 `toString` floor). Today `transformObject` flattens only **1** level — raising to 2 is the natural MVP+1.
  - `flattenBreadthCap = 50` leaf labels per column per row; beyond that, stop flattening that column and emit a truncated marker label `col` = `<N keys, truncated>`.
  - `keyLengthCap = 256` chars; longer keys → not flattened (Tier 3 floor on whole column).
  - dropdown `LIMIT 300` (already present), plus `LIMIT` on `mapKeys` enumeration.
- **Truncation notice mechanism:** attach a `Notice` to the data frame (`frame.meta.notices = [{ severity:'warning', text:'… truncated …' }]`) so Grafana shows it on the panel; and for dropped filters, surface via the existing query-error / inspector path. The backend already has a universal error response (`sendUniversalErrorResponse`); add a **non-fatal notices channel** to the adhoc response so dropped filters are reported without failing the query.
- **Dynamic keys + adhoc dropdown:** offer a two-step picker — first `mapKeys` enumeration (Tier 2 key dropdown), then values for the chosen key. For fully dynamic JSON, fall to free-text + Tier 3.

---

## 7. Backend vs frontend responsibility split

- **SQL generation lives in the backend** (`ProcessAdhocFilters`) — it is the single choke point shared by the adhoc-variable path **and** the +/- path (both feed `query.adHocFilters` → `createQueryWithAdhoc`/`applyAdhocFilters` → `ProcessAdhocFilters`). Confirmed via `resource_handlers.go:375, 615, 1025`. Putting decode + tier logic here fixes **all** paths at once and is the only place with authority to query `system.columns` for the leaf type.
- **Frontend responsibilities:**
  - `toLogs.transformObject`: produce the **canonical encoded key** (extend the existing ``col['k']`` to handle depth-2, arrays `col[]`, JSON dot paths, with caps/escaping).
  - `adhoc.ts`: produce **type-aware dropdown queries** and carry the **encoded key + (optionally) type** into the filter; guarantee the encoded key matches what `toLogs` emits.
  - Optionally attach `type` to the pushed filter object in `toggleQueryFilter` (requires `toLogs` to expose the column type to the labels field, or a lookup) — nice-to-have to skip the backend `system.columns` lookup on the +/- path.
- **Decoding/escaping is duplicated minimally:** the frontend escapes when building the **dropdown SQL** (it builds SQL directly), the backend escapes when building the **WHERE predicate**. Share the escaping rules (document them once); ideally factor a tiny TS + Go escaper with identical semantics and a shared test vector file.

---

## 8. The Grafana #98038 angle (per-field disable)

- Grafana's filtering UI is **all-or-nothing per datasource**: `hasFilteringFunctionality = !disableActions && onClickFilterLabel && onClickFilterOutLabel`. There is **no per-field disable** in Grafana core; #98038 requested adding one and was **closed stale**.
- **If every click produces VALID SQL (Tiers 1–3) or safely refuses (Tier 4), per-field disabling is unnecessary.** The plugin never needs Grafana to hide a button, because no button can produce a broken query. This resolves the "we need an option to enable/disable filters" half of the issue **without any Grafana core change**.
- Recommendation: do **not** pursue a Grafana-core dependency. Document in the issue that #98038 is moot once SQL is always valid. (If a user still wants to suppress noisy complex-type buttons, that's a cosmetic plugin-side option, e.g. `body filterable:false`-style config per field — orthogonal, low priority.)

---

## 9. Phased implementation plan (each phase independently shippable)

**Phase 0 — Safety net (tiny, do first regardless):** Fix value quoting in `ProcessAdhocFilters` so `String` values are always quoted+escaped and only true numerics are unquoted; fix the quote-injection (D) and numeric-string (C) bugs. Add base-column allow-listing against `system.columns` to kill raw-key injection (E). **This alone makes Map(String,String) robust and closes the injection holes.** Ships value-correctness without any encoding work. **Effort: S.**

**Phase 1 — MVP: Map(String,\*) flatten + decode (Tier 1, depth 1).** Confirm/clean the existing ``col['k']`` encoding in `transformObject`; add a backend decoder that bracket-aware-splits the qualifier, allow-lists the base column, resolves the leaf type from `system.columns`, and quotes per leaf type. Map(String,String) and Map(String,Int) fully correct, with `mapContains` guard (§5) behind a default-on setting. **Effort: M.**

**Phase 2 — Nested Map (depth 2) + JSON/Object dot paths (Tier 1).** Raise `flattenDepthCap` to 2 in `transformObject`; decode chained subscripts and dot paths; leaf-type walk through nested Map/JSON. **Effort: M.**

**Phase 3 — Array (Tier 2) + Tuple.** Emit `col[]` marker in `transformObject` for arrays (instead of JSON-stringify), decode to `has()`/`arrayExists()`; Tuple element accessors. **Effort: M.**

**Phase 4 — Type-aware dropdown values (`adhoc.ts`).** Per-type DISTINCT queries (`mapContains`, `arrayJoin(mapKeys)`, `arrayJoin`, `toString` floor); ensure dropdown selection emits the canonical encoded key. **Effort: M.**

**Phase 5 — Caps + Tier 3 floor + notices.** Depth/breadth/length caps in `transformObject`; `toString` floor for unknown/dynamic leaves; non-fatal notices channel for dropped filters + truncation. **Effort: M.**

> Phases 0–1 resolve the core of #678 (the on-screen Map case). 2–5 close the long tail. Each is shippable and testable on its own.

---

## 10. Complete test plan

### Backend — `pkg/adhoc/adhoc_filters_test.go` (extend)
Add a type-aware signature path (the tests today call `ProcessAdhocFilters(filters, db, table)` with no type). Introduce a column-type fixture (mock `system.columns`) or pass type via the struct.

**Matrix: type × operator × value → expected predicate**
| # | key | type | op | value | expected |
|---|---|---|---|---|---|
| 1 | `_map['k']` | Map(String,String) | = | `v` | ``_map['k'] = 'v'`` (+ `mapContains` if guard on) |
| 2 | `_map['k']` | Map(String,Int64) | = | `5` | ``_map['k'] = 5`` |
| 3 | `_map['k']` | Map(String,String) | = | `12345` | ``_map['k'] = '12345'`` (string leaf → quoted) |
| 4 | `_map['k']` | Map(String,String) | = | `O'Brien` | ``_map['k'] = 'O\'Brien'`` (escaped) |
| 5 | `_map['a']['b']` | Map(String,Map(String,String)) | = | `v` | ``_map['a']['b'] = 'v'`` |
| 6 | `_arr[]` | Array(String) | = | `x` | ``has(_arr, 'x')`` |
| 7 | `_arr[]` | Array(Int64) | = | `5` | ``has(_arr, 5)`` |
| 8 | `_arr[]` | Array(String) | != | `x` | ``NOT has(_arr, 'x')`` |
| 9 | `_arr[]` | Array(String) | =~ | `x%` | ``arrayExists(e -> e LIKE 'x%', _arr)`` |
| 10 | `_json.a.b` | JSON | = | `v` | ``_json.a.b = 'v'`` or `toString(...)` floor |
| 11 | `_tup.name` | Tuple(name String,…) | = | `v` | ``_tup.name = 'v'`` |
| 12 | `col` (scalar) | LowCardinality(Nullable(String)) | = | `v` | ``col = 'v'`` (wrappers unwrapped) |
| 13 | `id` (String) | String | = | `12345` | ``id = '12345'`` (numeric-string bug regression) |
| 14 | `n` (UInt32) | UInt32 | > | `100` | `n > 100` |
| 15 | `=~`/`!~` mapping | any | =~ | `m%` | `LIKE 'm%'` (no over-escape) |
| **Hostile** | | | | | |
| 16 | `_map['it\'s']` | Map(String,String) | = | `v` | escaped subscript or Tier4 drop, never raw |
| 17 | `_map['a.b']` | Map(String,String) | = | `v` | bracket-aware split → ``_map['a.b'] = 'v'`` (not dropped) |
| 18 | `notacolumn` | — | = | `v` | dropped (allow-list) + notice |
| 19 | `_map['k']` | Map(String,String) | = | `'); DROP` | quoted+escaped, no injection |
| 20 | missing-key | Map(String,String) | = | `''` | `mapContains` guard excludes absent rows |

Also keep existing tests (db/table gating, `$adhoc` replacement, condition format) green.

### Frontend — `src/spec/sql_series_specs.jest.ts` (`toLogs`/`transformObject`)
- `transformObject`: Map(String,String) → ``_map['k']`` key (regression of current); Map(String,Int) leaf primitive preserved; nested depth-2 → ``_map['a']['b']``; array → ``_arr[]`` marker; key with `'`/`]`/`.` escaped; depth/breadth/length caps produce truncation marker; exotic-char round-trip.
- `_toFieldType`: Map/Array/Tuple/Object/JSON bucket correctly; `LowCardinality(...)` unwrapped.

### Frontend — `adhoc.ts` (new tests)
- type-driven values query selection (Map → `mapContains`; Array → `arrayJoin`; keys → `mapKeys`; unknown → `toString`).
- dropdown selection emits the canonical encoded key identical to the +/- path.
- key escaping in `{field}` substitution (no injection).

### Integration / E2E (Playwright + TestFlows)
- Logs panel with a `test_logs_with_complex_labels`-style table (Map, nested Map, Array, JSON): click +/- on each, assert generated SQL is valid and the panel returns rows (no CH error). This is the literal reproduction from the issue.
- Adhoc variable dropdown: pick a Map key+value, assert valid filter.

---

## 11. Effort breakdown & maintainer confirmations

| Phase | Scope | Effort |
|---|---|---|
| 0 | value quote/escape + base-column allow-list | **S** |
| 1 | Map(String,\*) decode + leaf-type lookup + mapContains | **M** |
| 2 | nested Map depth-2 + JSON dot paths | **M** |
| 3 | Array (`has`/`arrayExists`) + Tuple | **M** |
| 4 | type-aware dropdown values | **M** |
| 5 | caps + Tier 3 floor + notices | **M** |
| **Overall** | full fix | **L** (as expected) |

**Confirm with maintainers before building:**
1. **Type-threading mechanism:** OK to do a cached `system.columns` lookup inside `ProcessAdhocFilters` (adds a metadata query per distinct table), vs. requiring the frontend to attach `type` to every filter (won't cover raw Grafana adhoc variables)? Recommended: backend lookup + cache.
2. **`mapContains` guard default:** ON (exclude default-value false matches) vs OFF (CH-native default semantics)? Recommended ON, with a datasource setting.
3. **Flatten depth/breadth/length caps:** confirm defaults (depth 2, breadth 50, key length 256) — these change the `labels` field shape and dropdown size.
4. **Quote-escaping convention:** `''` doubling vs `\'` backslash — pick one and apply identically in TS and Go (share a test-vector file).
5. **Encoding shape:** approve the CH-accessor-shaped key grammar (``col['a']['b']``, `col.a.b`, `col[]`) vs an abstract path syntax. Recommended: CH-shaped (near-identity decode, lowest round-trip risk).
6. **Notices channel:** approve adding a non-fatal "dropped/truncated filter" notices field to the adhoc response so Tier 4 refusals are surfaced without failing the query.
7. **Out-of-scope companion bug:** the `toggleQueryFilter` removal predicate (`&&` instead of `||`) is broken — file separately?

---

## Appendix — Key file/line references
- Frontend +/-: `src/datasource/datasource.ts:341` (`toggleQueryFilter`), `:380` (`queryHasFilter`).
- Adhoc collection: `src/datasource/datasource.ts:822, 877`; `src/views/QueryEditor/helpers/getAdHocFilters.ts`.
- Resource client: `src/datasource/resource_handler.ts:48` (`applyAdhocFilters`), `:79` (`createQueryWithAdhoc`), `:90` (`processQueryBatch`).
- Label flattening / type bucketing: `src/datasource/sql-series/toLogs.ts:6-50` (`transformObject`, key ``col['k']`` at `:27`, arrays stringified `:20`, deeper stringified `:31`), `:52-85` (`_toFieldType`, no Map/Array case → default string `:84`), labels emission `:121-128, 147, 190-194`, body `filterable:false` `:188`.
- Backend SQL: `pkg/adhoc/adhoc_filters.go:18-83` (`ProcessAdhocFilters`; dot-split `:24`, db/table gate `:41`, op map `:47-52`, value quoting `:56-75`, raw key concat `:78`). Struct `:9-14` (no type field).
- Backend call sites: `pkg/resource_handlers.go:375` (applyAdhocFilters), `:615` (processQueryBatch), `:1025` (createQueryWithAdhoc); `parseTargets` `:185-210`; `$adhoc` replacement `:396-402`.
- Adhoc dropdown: `src/datasource/adhoc.ts:3` (`DEFAULT_VALUES_QUERY`), `:13` (`system.columns` query incl. `type`), `:64-78` (Enum precedent), `:93-174` (`GetTagValues`, key split `:147`).
- Tests: `pkg/adhoc/adhoc_filters_test.go`; `src/spec/sql_series_specs.jest.ts:103-168` (toLogs).
