import { interpolateQueryExpr, interpolateQueryExprWithContext } from './index';

/**
 * EXECUTABLE BEHAVIOR CONTRACT for template-variable interpolation.
 *
 * VARIANT: the 3.4.x auto-quoting default is KEPT (undefined/null configs
 * still quote in plain positions). Issue #905 is fixed by a TARGETED
 * exception for identifier positions (FROM/JOIN/INTO/TO/TABLE) — class 13.
 * PR #906 (raw default) is deliberately NOT adopted, so dashboards that rely
 * on auto-quoting (the issue #809 workaround cohort) keep working.
 *
 * ============================================================================
 * BEHAVIOR CLASS TABLE (source of truth — change ONLY together with the tests)
 * ============================================================================
 *
 * | #  | Class                                          | SQL example                      | Variables                            | master                                 | After this branch                     | Change     | Notes                          |
 * |----|------------------------------------------------|----------------------------------|--------------------------------------|----------------------------------------|---------------------------------------|------------|--------------------------------|
 * | 1  | Concatenation / string literals                | FROM $db.$table · LIKE 'pre$v%'  | all                                  | raw                                    | raw                                   | unchanged  | #797, #827                     |
 * | 2  | IN()/IN[]/NOT IN/tuple() + scalar              | WHERE x IN ($v)                  | all                                  | 'val' + escaping                       | 'val' + escaping                      | unchanged  | #847                           |
 * | 3  | IN(...) + array                                | WHERE x IN ($multi)              | multi-select                         | 'a','b'                                | 'a','b'                               | unchanged  | #838 (no duplicated brackets)  |
 * | 4  | Array outside IN                               | hasAny($tags, col)               | multi-select                         | ['a', 'b']                             | ['a', 'b']                            | unchanged  | #829                           |
 * | 5  | Repeated panels (value != current)             | repeat by variable               | all                                  | 'val' — quotes even numbers; NO escape | same                                  | unchanged  | #712                           |
 * | 6  | Plain position, multi:false/includeAll:false   | WHERE db = '$db'                 | query/custom, multi-select off       | raw                                    | raw                                   | unchanged  |                                |
 * | 7  | Plain position, truthy config                  | WHERE x = $v with multi/All on   | multi-select, groupby                | 'val' + escaping                       | 'val' + escaping                      | unchanged  |                                |
 * | 8  | Numbers                                        | WHERE port = $port               | all                                  | raw                                    | raw                                   | unchanged  |                                |
 * | 9  | Plain position, non-numeric string,            | WHERE x = $var                   | constant, textbox, interval;         | 'val' (3.4.x auto-quoting)             | 'val' — UNCHANGED                     | unchanged  | #809 cohort preserved;         |
 * |    | falsy config other than false/false            |                                  | query/custom from old JSON (null)    |                                        |                                       |            | #905 is fixed by class 13      |
 * | 10 | Plain position, numeric string + first         | WHERE x = $v ($v='123')          | query/custom from old JSON           | '123' (escape reads options)           | '123' — UNCHANGED                     | unchanged  |                                |
 * |    | non-numeric option in options, falsy config    |                                  | with mixed options                   |                                        |                                       |            |                                |
 * | 11 | null value with falsy config                   | empty variable                   | constant/textbox                     | crash: TypeError in clickhouseEscape   | raw, no crash                         | bug fixed  | latent crash removed           |
 * | 12 | Grafana format specifiers                      | ${var:raw}, ${var:sqlstring}     | all                                  | plugin is not invoked                  | plugin is not invoked                 | unchanged  |                                |
 * | 13 | Identifier position:                           | FROM $v · JOIN $v ·              | all (any config, including           | 'val' — ALWAYS invalid SQL             | raw — works                           | FIX #905   | a quoted identifier is never   |
 * |    | FROM/JOIN/INTO/TO/TABLE $v                     | RENAME TABLE a TO $v             | undefined/null, truthy, repeated)    | (FROM 'db.t')                          |                                       |            | valid ClickHouse SQL           |
 *
 * ============================================================================
 * COVERAGE MAP: every test title starts with [class N] — grep by class number.
 *   class 1  -> 3 cases (dot concatenation, string literal, numeric suffix)
 *   class 2  -> 5 cases (IN, NOT IN, GLOBAL IN, tuple, IN-beats-concatenation)
 *   class 3  -> 3 cases (IN (), IN [], multi+includeAll)
 *   class 4  -> 1 case  (array function literal)
 *   class 5  -> 5 cases (repeated, $__all expansion, quotes numbers, no escaping,
 *                        empty-current quirk)
 *   class 6  -> 1 case
 *   class 7  -> 2 cases (multi on, includeAll on)
 *   class 8  -> 1 case
 *   class 9  -> 5 cases (undefined, null/null, mixed combo, escaping, strict-semantics pin)
 *   class 10 -> 2 cases (truthy and falsy configs)
 *   class 11 -> 1 case  (null passthrough, no crash)
 *   class 12 -> unit-unreachable: Grafana never invokes the plugin for ${var:format}
 *   class 13 -> 8 cases (FROM for falsy/truthy/repeated, JOIN, TO, INTO, TABLE,
 *                        IN-beats-identifier)
 * ============================================================================
 */

type Row = {
  cls: number;
  why: string;
  query: string;
  variable: any;
  value: any;
  expected: string;
};

const ROWS: Row[] = [
  // ---- classes 6-9: single scalar in a plain position (3.4.x default kept) ----
  { cls: 6, why: 'multi=false/includeAll=false stays raw (all eras)',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: false, includeAll: false },
    value: 'abc', expected: 'abc' },
  { cls: 9, why: 'undefined/undefined auto-quotes (3.4.x default kept, #809 cohort)',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'abc', expected: "'abc'" },
  { cls: 9, why: 'null/null auto-quotes',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: null, includeAll: null },
    value: 'abc', expected: "'abc'" },
  { cls: 9, why: 'mixed combo from real dashboard JSON (multi:null, includeAll:false) auto-quotes',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: null, includeAll: false },
    value: 'abc', expected: "'abc'" },
  { cls: 7, why: 'includeAll=true quotes',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: false, includeAll: true },
    value: 'abc', expected: "'abc'" },
  { cls: 7, why: 'multi=true scalar quotes',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: true, includeAll: false },
    value: 'abc', expected: "'abc'" },
  { cls: 8, why: 'numeric strings stay raw (escape passes numbers through)',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: '123', expected: '123' },
  { cls: 9, why: 'auto-quoting escapes quotes inside the value',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: "O'Brien", expected: "'O\\'Brien'" },

  // ---- class 2: IN/tuple + scalar (#847) ----
  { cls: 2, why: 'scalar inside IN () is quoted (#847)',
    query: 'SELECT * FROM t WHERE x IN ($v)',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'abc', expected: "'abc'" },
  { cls: 2, why: 'NOT IN quotes too',
    query: 'SELECT * FROM t WHERE x NOT IN ($v)',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'abc', expected: "'abc'" },
  { cls: 2, why: 'tuple() counts as IN context',
    query: 'SELECT tuple($v) FROM t',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'abc', expected: "'abc'" },
  { cls: 2, why: 'IN context outranks the concatenation detector (#847)',
    query: 'SELECT * FROM db.$v WHERE x IN ($v)',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'abc', expected: "'abc'" },
  { cls: 2, why: 'GLOBAL IN quotes like plain IN',
    query: 'SELECT * FROM t WHERE x GLOBAL IN ($v)',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'abc', expected: "'abc'" },

  // ---- class 3: IN + array (#838) ----
  { cls: 3, why: 'array inside IN () -> quoted CSV',
    query: 'SELECT * FROM t WHERE x IN ($v)',
    variable: { name: 'v', multi: true, includeAll: false },
    value: ['a', 'b'], expected: "'a','b'" },
  { cls: 3, why: 'square-bracket IN [$v] -> CSV without duplicated brackets (#838)',
    query: 'SELECT * FROM t WHERE x IN [$v]',
    variable: { name: 'v', multi: true, includeAll: false },
    value: ['a', 'b'], expected: "'a','b'" },
  { cls: 3, why: 'multi+includeAll array in IN -> CSV',
    query: 'SELECT * FROM t WHERE x IN ($v)',
    variable: { name: 'v', multi: true, includeAll: true },
    value: ['a', 'b'], expected: "'a','b'" },

  // ---- class 1: concatenation / string literals (#797, #827) ----
  { cls: 1, why: 'concatenation $db.$table stays raw (#797)',
    query: 'SELECT * FROM $db.$table',
    variable: { name: 'db', multi: undefined, includeAll: undefined },
    value: 'mydb', expected: 'mydb' },
  { cls: 1, why: "variable inside a '...' string literal stays raw (#827)",
    query: "SELECT * FROM t WHERE x = 'prefix$v'",
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'abc', expected: 'abc' },
  { cls: 1, why: 'numeric suffix $v.8090.svc stays raw (#797)',
    query: 'SELECT * FROM $v.8090.svc',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'host', expected: 'host' },

  // ---- class 4: arrays outside IN (#829) ----
  { cls: 4, why: 'array in an array-function context -> ClickHouse array literal (#829)',
    query: 'SELECT arrayIntersect($v, col) FROM t',
    variable: { name: 'v', multi: true, includeAll: false },
    value: ['a', 'b'], expected: "['a', 'b']" },

  // ---- class 10: options quirk (unchanged on this branch) ----
  { cls: 10, why: 'truthy config: numeric string quotes when options contain non-numeric values',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: true, includeAll: false, options: [{ value: 'abc' }, { value: '123' }] },
    value: '123', expected: "'123'" },
  { cls: 10, why: 'falsy config: same behavior — options are read, number quotes (3.4.x kept)',
    query: 'SELECT * FROM t WHERE x = $v',
    variable: { name: 'v', multi: null, includeAll: false, options: [{ value: 'abc' }, { value: '123' }] },
    value: '123', expected: "'123'" },

  // ---- class 13: identifier positions — THE FIX for #905 ----
  { cls: 13, why: 'FIX #905: constant/textbox (undefined config) right after FROM is raw',
    query: 'SELECT count() FROM $v',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'db.logs', expected: 'db.logs' },
  { cls: 13, why: 'truthy config after FROM is raw (a quoted identifier is never valid SQL)',
    query: 'SELECT count() FROM $v',
    variable: { name: 'v', multi: true, includeAll: false },
    value: 'db.logs', expected: 'db.logs' },
  { cls: 13, why: 'IN context outranks the identifier position (same rule as #847)',
    query: 'SELECT count() FROM $v WHERE x IN ($v)',
    variable: { name: 'v', multi: undefined, includeAll: undefined },
    value: 'abc', expected: "'abc'" },
  { cls: 13, why: 'JOIN is an identifier position',
    query: 'SELECT * FROM t JOIN $v USING id',
    variable: { name: 'v', multi: true, includeAll: false },
    value: 'dim_table', expected: 'dim_table' },
  { cls: 13, why: 'TO is an identifier position (RENAME TABLE ... TO $v)',
    query: 'RENAME TABLE t1 TO $v',
    variable: { name: 'v', multi: true, includeAll: false },
    value: 't2', expected: 't2' },
  { cls: 13, why: 'INTO is an identifier position (INSERT INTO $v)',
    query: 'INSERT INTO $v SELECT 1',
    variable: { name: 'v', multi: true, includeAll: false },
    value: 'target_tbl', expected: 'target_tbl' },
  { cls: 13, why: 'TABLE is an identifier position (OPTIMIZE TABLE $v)',
    query: 'OPTIMIZE TABLE $v FINAL',
    variable: { name: 'v', multi: true, includeAll: false },
    value: 'events', expected: 'events' },
];

describe('Interpolation behavior contract (change ONLY together with the class table above)', () => {
  it.each(ROWS)('[class $cls] $why', ({ query, variable, value, expected }) => {
    const variables = [{ name: variable.name, current: { value } }];
    const fn = interpolateQueryExprWithContext(query, variables);
    expect(fn(value, variable)).toBe(expected);
  });

  it('[class 9] strict 3.4.x semantics kept: false/false raw, undefined quoted (deliberate distinction)', () => {
    const raw = interpolateQueryExpr('abc', { name: 'v', multi: false, includeAll: false });
    const quoted = interpolateQueryExpr('abc', { name: 'v', multi: undefined, includeAll: undefined });
    expect(raw).toBe('abc');
    expect(quoted).toBe("'abc'");
  });

  it('[class 11] null value does not crash interpolation with TypeError (latent 3.4.x crash removed)', () => {
    const fn = interpolateQueryExprWithContext('SELECT * FROM t WHERE x = $v', [
      { name: 'v', current: { value: null } },
    ]);
    expect(() => fn(null, { name: 'v', multi: undefined, includeAll: undefined })).not.toThrow();
    expect(fn(null, { name: 'v', multi: undefined, includeAll: undefined })).toBeNull();
  });

  it('[class 5] repeated-panel value (differs from current) is quoted (#712)', () => {
    const fn = interpolateQueryExprWithContext('SELECT * FROM t WHERE x = $v', [
      { name: 'v', current: { value: 'postgres' } },
    ]);
    expect(fn('mysql', { name: 'v', multi: undefined, includeAll: undefined })).toBe("'mysql'");
  });

  it('[class 9] non-repeated (value equals current) with undefined config quotes (3.4.x kept)', () => {
    const fn = interpolateQueryExprWithContext('SELECT * FROM t WHERE x = $v', [
      { name: 'v', current: { value: 'mysql' } },
    ]);
    expect(fn('mysql', { name: 'v', multi: undefined, includeAll: undefined })).toBe("'mysql'");
  });

  it('[class 5] repeated path quotes even numeric values (exception to class 8)', () => {
    const fn = interpolateQueryExprWithContext('SELECT * FROM t WHERE x = $v', [
      { name: 'v', current: { value: 'other' } },
    ]);
    expect(fn('123', { name: 'v', multi: undefined, includeAll: undefined })).toBe("'123'");
  });

  it('[class 5] repeated path does NOT escape quotes in the value (pinned as-is)', () => {
    const fn = interpolateQueryExprWithContext('SELECT * FROM t WHERE x = $v', [
      { name: 'v', current: { value: 'other' } },
    ]);
    expect(fn("O'Brien", { name: 'v', multi: undefined, includeAll: undefined })).toBe("'O'Brien'");
  });

  it('[class 5] $__all expands before the repeated check: full array is not "repeated" (#712 corner)', () => {
    const variable = { name: 'v', multi: true, includeAll: true, options: [{ value: 'a' }, { value: 'b' }] };
    const fn = interpolateQueryExprWithContext('SELECT * FROM t WHERE x IN ($v)', [
      { name: 'v', current: { value: ['$__all'] } },
    ]);
    expect(fn(['a', 'b'], variable)).toBe("'a','b'");
  });

  it('[class 5] quirk pinned as-is: empty current {} yields a false-positive isRepeated -> quoted', () => {
    const fn = interpolateQueryExprWithContext('SELECT * FROM t WHERE x = $v', [
      { name: 'v', current: {} },
    ]);
    expect(fn('abc', { name: 'v', multi: undefined, includeAll: undefined })).toBe("'abc'");
  });

  it('[class 13] identifier position outranks the repeated check (raw table name per panel)', () => {
    const fn = interpolateQueryExprWithContext('SELECT count() FROM $v', [
      { name: 'v', current: { value: 'other_table' } },
    ]);
    expect(fn('tbl_shard1', { name: 'v', multi: undefined, includeAll: undefined })).toBe('tbl_shard1');
  });
});
