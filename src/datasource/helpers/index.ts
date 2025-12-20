import { TemplateSrv } from '@grafana/runtime';
import { dateMath, TypedVariableModel } from '@grafana/data';
import { each, isString, map } from 'lodash';

export const conditionalTest = (query: string, templateSrv: TemplateSrv) => {
  const betweenBraces = (query: string): boolean | any => {
    let r = {
      result: '',
      error: '',
    };
    let openBraces = 1;
    for (let i = 0; i < query.length; i++) {
      if (query.charAt(i) === '(') {
        openBraces++;
      }
      if (query.charAt(i) === ')') {
        openBraces--;
        if (openBraces === 0) {
          r.result = query.substring(0, i);
          break;
        }
      }
    }
    if (openBraces > 1) {
      r.error = 'missing parentheses';
    }
    return r;
  };

  let macros = '$conditionalTest(';
  let openMacros = query.indexOf(macros);
  while (openMacros !== -1) {
    let r = betweenBraces(query.substring(openMacros + macros.length, query.length));
    if (r.error.length > 0) {
      throw { message: '$conditionalIn macros error: ' + r.error };
    }
    let arg = r.result;
    // first parameters is an expression and require some complex parsing,
    // so parse from the end where you know that the last parameters is a comma with a variable
    let param1 = arg.substring(0, arg.lastIndexOf(',')).trim();
    let param2 = arg.substring(arg.lastIndexOf(',') + 1).trim();
    // remove the $ from the variable
    let varInParam = param2.substring(1);
    let done = 0;
    //now find in the list of variable what is the value
    let variables = templateSrv.getVariables();
    for (let i = 0; i < variables.length; i++) {
      let varG: TypedVariableModel = variables[i];
      if (varG.name === varInParam) {
        let closeMacros = openMacros + macros.length + r.result.length + 1;
        done = 1;

        const value: any = 'current' in varG ? varG.current.value : '';

        if (
          // for query variable when all is selected
          // may be add another test on the all activation may be wise.
          (varG.type === 'query' &&
            ((value.length === 1 && value[0] === '$__all') || (typeof value === 'string' && value === '$__all'))) ||
          // for multi-value drop-down when no one value is select, fix https://github.com/Altinity/clickhouse-grafana/issues/485
          (typeof value === 'object' && value.length === 0) ||
          // for textbox variable when nothing is entered
          (['textbox', 'custom'].includes(varG.type) && ['', undefined, null].includes(value))
        ) {
          query = query.substring(0, openMacros) + ' ' + query.substring(closeMacros, query.length);
        } else {
          // replace of the macro with standard test.
          query = query.substring(0, openMacros) + ' ' + param1 + ' ' + query.substring(closeMacros, query.length);
        }
        break;
      }
    }
    if (done === 0) {
      throw { message: '$conditionalTest macros error cannot find referenced variable: ' + param2 };
    }
    openMacros = query.indexOf(macros);
  }
  return query;
};

export const adhocFilterVariable = 'adhoc_query_filter';

export const clickhouseEscape = (value: any, variable: any): any => {
  const NumberOnlyRegexp = /^[+-]?\d+(\.\d+)?$/;

  let returnAsIs = true;
  // if at least one of options is not digit or is array
  each(variable.options, function (opt): boolean {
    if (typeof opt.value === 'string' && opt.value === '$__all') {
      return true;
    }
    if (typeof opt.value === 'number') {
      returnAsIs = true;
      return false;
    }
    if (typeof opt.value === 'string' && !NumberOnlyRegexp.test(opt.value)) {
      returnAsIs = false;
      return false;
    }

    return true;
  });

  if (value instanceof Array) {
    let arrayValues = map(value, function (v) {
      return clickhouseEscape(v, variable);
    });
    return '[' + arrayValues.join(', ') + ']';
  } else if (typeof value === 'number' || (returnAsIs && typeof value === 'string' && NumberOnlyRegexp.test(value))) {
    return value;
  } else {
    return "'" + value.replace(/[\\']/g, '\\$&') + "'";
  }
};

/**
 * Context-aware variable interpolation with smart array formatting.
 *
 * This function solves multiple issues by detecting SQL context:
 * - #797: Variable concatenation (e.g., `$container.$namespace.svc`)
 * - #712: Repeated panel variables
 * - #829: Array functions (e.g., `arrayIntersect($var, col)`)
 *
 * @param query - The SQL query string containing variables
 * @returns Function that interpolates variables based on context
 *
 * **BEHAVIOR BY CONTEXT (Priority Order):**
 *
 * 1. **Concatenation Context** (e.g., `$container.$namespace.svc`):
 *    - Returns raw value without quotes: `containervalue.namespacevalue.svc`
 *    - Fixes issue #797
 *
 * 2. **IN Clause / tuple() Context** (e.g., `WHERE id IN ($var)`):
 *    - Returns comma format WITHOUT brackets: `'val1','val2'`
 *    - Works with: IN, NOT IN, GLOBAL IN, tuple()
 *
 * 3. **Array Function Context** (default for arrays):
 *    - Returns ClickHouse array literal WITH brackets: `['val1','val2']`
 *    - Works with: arrayIntersect, hasAny, hasAll, etc.
 *    - Fixes issue #829
 *
 * **EXAMPLES:**
 * ```typescript
 * // Concatenation - no quotes
 * interpolateQueryExprWithContext('SELECT * FROM $db.$table')
 * // → db.table
 *
 * // IN clause - comma format
 * interpolateQueryExprWithContext('WHERE id IN ($ids)')
 * // → 'val1','val2'
 *
 * // Array function - array literal format
 * interpolateQueryExprWithContext('SELECT arrayIntersect($tags, col)')
 * // → ['val1','val2']
 * ```
 */
export const interpolateQueryExprWithContext = (query: string, variables: any[] = []) => {
  return (value: any, variable: any) => {
    // Check if this variable is part of a concatenation pattern
    const currentVariableValue = variables.find(v => v.name === variable.name)

    const isInConcatenation = detectConcatenationContext(query, variable.name);
    const needsComma = needsCommaFormat(query, variable.name);

    let isRepeated = false;
    if (currentVariableValue && "current" in currentVariableValue) {
      let currentValue = currentVariableValue.current.value;

      // Handle $__all case: when current.value is ["$__all"], extract all values from options
      if (Array.isArray(currentValue) && currentValue.length === 1 && currentValue[0] === '$__all' && variable.options) {
        currentValue = variable.options.map((opt: any) => opt.value);
      } else if (typeof currentValue === 'string' && currentValue === '$__all' && variable.options) {
        currentValue = variable.options.map((opt: any) => opt.value);
      }

      isRepeated = !(JSON.stringify(value) === JSON.stringify(currentValue));
    }

    // Priority 1: Concatenation context - no quotes for simple values
    if (isInConcatenation && !Array.isArray(value)) {
      return value;
    }

    // Priority 2: Arrays in IN clause / tuple() - use comma format without brackets
    if (needsComma && Array.isArray(value)) {
      return interpolateQueryExpr(value, variable, isRepeated);  // Returns: 'val1','val2'
    }

    // Priority 3: Arrays in any other context (array functions) - use ClickHouse array literal
    if (Array.isArray(value)) {
      return clickhouseEscape(value, variable);  // Returns: ['val1','val2']
    }

    // Default: use original logic for single values
    return interpolateQueryExpr(value, variable, isRepeated);
  };
};

/**
 * Detects if a variable needs comma-separated format (without array brackets).
 *
 * Identifies SQL contexts where array variables should be formatted as 'val1','val2'
 * instead of the ClickHouse array literal format ['val1','val2'].
 *
 * @param query - The SQL query string to analyze
 * @param variableName - The variable name to check
 * @returns true if variable needs comma format (no brackets), false otherwise
 *
 * **DETECTED PATTERNS:**
 * - `IN ($var)` - Standard IN clause
 * - `NOT IN ($var)` - Negated IN clause
 * - `GLOBAL IN ($var)` - Distributed query IN clause
 * - `GLOBAL NOT IN ($var)` - Distributed query negated IN
 * - `tuple($var)` - Tuple construction
 *
 * **EXAMPLES:**
 * ```typescript
 * needsCommaFormat('WHERE id IN ($var)', 'var')              // true → 'val1','val2'
 * needsCommaFormat('WHERE id NOT IN ($var)', 'var')          // true → 'val1','val2'
 * needsCommaFormat('WHERE id GLOBAL IN ($var)', 'var')       // true → 'val1','val2'
 * needsCommaFormat('SELECT tuple($var)', 'var')              // true → 'val1','val2'
 * needsCommaFormat('SELECT arrayIntersect($var, col)', 'var') // false → ['val1','val2']
 * needsCommaFormat('SELECT hasAny($var, tags)', 'var')        // false → ['val1','val2']
 * ```
 */
const needsCommaFormat = (query: string, variableName: string): boolean => {
  if (!query || !variableName) {
    return false;
  }

  // Match IN clause variations (both parentheses and square brackets) and tuple function
  // Pattern breakdown:
  // - (?:NOT\s+)? - optional NOT keyword
  // - (?:GLOBAL\s+)? - optional GLOBAL keyword
  // - IN\s*\(\s* or IN\s*\[\s* - IN followed by opening paren or bracket
  // - \$\{?variableName\}? - variable with optional braces
  // - \s*\) or \s*\] - closing paren or bracket
  // OR
  // - \btuple\s*\( - tuple function call
  // Using separate patterns to ensure matching brackets (not mixed like "IN ($var]")
  const pattern = new RegExp(
    // IN with parentheses: IN ($var), NOT IN ($var), GLOBAL IN ($var)
    `(?:NOT\\s+)?(?:GLOBAL\\s+)?IN\\s*\\(\\s*\\$\\{?${variableName}\\}?\\s*\\)|` +
    // IN with square brackets: IN [$var], NOT IN [$var], GLOBAL IN [$var]
    `(?:NOT\\s+)?(?:GLOBAL\\s+)?IN\\s*\\[\\s*\\$\\{?${variableName}\\}?\\s*\\]|` +
    // tuple function
    `\\btuple\\s*\\(\\s*\\$\\{?${variableName}\\}?`,
    'i'
  );

  return pattern.test(query);
};

/**
 * Detects if a variable is used in a concatenation pattern within a SQL query.
 *
 * Identifies patterns where variables are connected with dots or inside string literals,
 * indicating they should be treated as part of a larger identifier rather than quoted SQL values.
 *
 * @param query - The SQL query string to analyze
 * @param variableName - The variable name to check for concatenation usage
 * @returns true if variable is used in concatenation, false otherwise
 *
 * **DETECTED PATTERNS:**
 * - `$variable.suffix` - Variable followed by dot
 * - `prefix.$variable` - Variable preceded by dot
 * - `$var1.$var2` - Variable between other variables
 * - `${variable}.suffix` - Braced variable syntax
 * - `'quoted'.$variable` - Quoted string followed by variable (issue #797)
 * - `$variable.8090` - Variable followed by numbers
 * - `$variable.identifier` - Variable followed by valid identifier
 * - `'prefix$variable'` - Variable inside single-quoted string (issue #827)
 * - `"prefix$variable"` - Variable inside double-quoted string (issue #827)
 *
 * **EXAMPLES:**
 * ```typescript
 * detectConcatenationContext('SELECT * FROM $db.$table', 'db')           // true
 * detectConcatenationContext('WHERE name = $name', 'name')               // false
 * detectConcatenationContext('FROM ${schema}.${table}', 'schema')        // true
 * detectConcatenationContext("= 'transcription'.$namespace", 'namespace') // true (issue #797)
 * detectConcatenationContext('$container.8090.svc', 'container')         // true
 * detectConcatenationContext("WHERE host LIKE '${prefix}%'", 'prefix')   // true (issue #827)
 * ```
 */
const detectConcatenationContext = (query: string, variableName: string): boolean => {
  if (!query || !variableName) {
    return false;
  }

  // Look for patterns like: $variable. or .$variable or $variable1.$variable2
  const patterns = [
    new RegExp(`\\$\\{?${variableName}\\}?\\.`, 'g'),  // $variable. or ${variable}.
    new RegExp(`\\.\\$\\{?${variableName}\\}?`, 'g'),  // .$variable or .${variable}
    new RegExp(`\\$\\{?${variableName}\\}?\\.\\$`, 'g'), // $variable1.$variable2
    // More precise patterns for partially replaced queries
    new RegExp(`'[^']*'\\.\\$\\{?${variableName}\\}?`, 'g'), // 'quoted'.$variable (for issue #797)
    new RegExp(`\\$\\{?${variableName}\\}?\\.\\d+`, 'g'), // $variable.8090 (numbers after variable)
    new RegExp(`\\$\\{?${variableName}\\}?\\.[a-zA-Z_][a-zA-Z0-9_]*`, 'g'), // $variable.identifier (valid identifiers only)
    // Variables inside string literals (for issue #827)
    new RegExp(`'[^']*\\$\\{?${variableName}\\}?[^']*'`, 'g'), // 'text$variable' or '$variabletext'
    new RegExp(`"[^"]*\\$\\{?${variableName}\\}?[^"]*"`, 'g'), // "text$variable" or "$variabletext"
  ];

  return patterns.some(pattern => pattern.test(query));
};

/**
 * Original variable interpolation function with issue #712 fix.
 * 
 * This function handles variable interpolation based on Grafana variable configuration.
 * It was modified to fix repeated panel variables by adding quotes when multi/includeAll
 * are undefined, but this caused issue #797 with concatenation patterns.
 * 
 * @param value - The variable value(s) to interpolate
 * @param variable - Grafana variable configuration object
 * @returns Interpolated string ready for SQL injection
 * 
 * **BEHAVIOR MATRIX:**
 * ```
 * | multi | includeAll | Array | Result              | Use Case           |
 * |-------|------------|-------|---------------------|--------------------|  
 * | undef | undef      | No    | 'value' (quoted)    | Repeated panels    |
 * | false | false      | No    | value (raw)         | Explicit single    |
 * | true  | false      | Yes   | 'val1','val2'       | Multi-select       |
 * | Any   | Any        | Yes   | escaped,joined      | Arrays             |
 * ```
 * 
 * **EXAMPLES:**
 * ```typescript
 * // Repeated panel variable (issue #712 fix)
 * interpolateQueryExpr('mysql', {multi: undefined, includeAll: undefined})
 * // → "'mysql'"
 * 
 * // Explicit single variable  
 * interpolateQueryExpr('mysql', {multi: false, includeAll: false})
 * // → "mysql"
 * 
 * // Multi-value variable
 * interpolateQueryExpr(['val1', 'val2'], {multi: true, includeAll: false})
 * // → "'val1','val2'"
 * ```
 * 
 * **ISSUES:**
 * - This function doesn't consider query context
 * - Causes concatenation issues when multi/includeAll are undefined
 * - Use `interpolateQueryExprWithContext` for context-aware interpolation
 */
export const interpolateQueryExpr = (value: any, variable: any, isRepeated?: boolean) => {
  // Repeated Single variable value (issue #712 fix)
  // When multi/includeAll are undefined, assume it's a repeated panel variable
  // and add quotes to ensure proper SQL syntax in IN clauses
  if (isRepeated && !Array.isArray(value)) {
    return `'${value}'`;
  }

  // Single variable value (explicit configuration)
  // When multi=false and includeAll=false, treat as raw value without quotes
  if (variable.multi === false && variable.includeAll === false && !Array.isArray(value)) {
    return value;
  }

  // Multi-value or complex variable handling
  if (!Array.isArray(value)) {
    return clickhouseEscape(value, variable);
  }
  
  // Array values - escape each element and join with commas
  let escapedValues = value.map(function (v) {
    return clickhouseEscape(v, variable);
  });
  return escapedValues.join(',');
};

/**
 * Creates a context-aware interpolation function for a specific query.
 * 
 * This is a convenience wrapper around `interpolateQueryExprWithContext` that
 * creates a function compatible with Grafana's `templateSrv.replace()` method.
 * 
 * @param query - The SQL query string that provides context for variable interpolation
 * @returns Function compatible with Grafana's template service
 * 
 * **USAGE:**
 * ```typescript
 * // Create interpolation function for a specific query
 * const interpolateFn = createContextAwareInterpolation(
 *   'SELECT * FROM $database.$table WHERE service = $service'
 * );
 * 
 * // Use with Grafana's template service
 * this.templateSrv.replace(query, scopedVars, interpolateFn);
 * ```
 * 
 * **BEHAVIOR:**
 * - Variables in concatenation patterns (like `$database.$table`) won't be quoted
 * - Variables in SQL contexts (like `service = $service`) will be quoted appropriately
 * - Maintains all backward compatibility with existing variable configurations
 * 
 * **RECOMMENDED USAGE:**
 * Replace all instances of `interpolateQueryExpr` with this context-aware version:
 * ```typescript
 * // OLD (can cause concatenation issues):
 * templateSrv.replace(query, scopedVars, interpolateQueryExpr)
 * 
 * // NEW (context-aware, fixes concatenation):
 * templateSrv.replace(query, scopedVars, createContextAwareInterpolation(query))
 * ```
 */
export const createContextAwareInterpolation = (query: string, variables: any[] = []) => {
  return (value: any, variable: any) => {
    return interpolateQueryExprWithContext(query, variables)(value, variable);
  };
};

/**
 * Converts various date formats to Unix timestamp.
 * 
 * @param date - Date in various formats (string, Date object, etc.)
 * @returns Unix timestamp in seconds
 */
export const convertTimestamp = (date: any) => {
  if (isString(date)) {
    date = dateMath.parse(date, true);
  }

  return Math.floor(date.valueOf() / 1000);
};
