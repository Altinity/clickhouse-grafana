import { LogsFieldMode, LogsFieldConfigEntry } from '../../types/types';

export const transformObject = (obj: any): any => {
  // Check if the input is an object and not null
  if (obj && typeof obj === 'object') {
    // Create a new object to store the transformed properties
    const result: any = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        // If the value is an object (and not null), extract first level properties
        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            // For arrays, we still stringify
            result[key] = JSON.stringify(value);
          } else {
            // For objects, extract first level properties
            for (const nestedKey in value) {
              if (Object.prototype.hasOwnProperty.call(value, nestedKey)) {
                const nestedValue = value[nestedKey];
                // Create a new key in the format `key[nestedKey]`
                const newKey = `${key}['${nestedKey}']`;

                // If nested value is still an object, stringify it
                if (nestedValue && typeof nestedValue === 'object') {
                  result[newKey] = JSON.stringify(nestedValue);
                } else {
                  // Otherwise, keep the primitive value as is
                  result[newKey] = nestedValue;
                }
              }
            }
          }
        } else {
          // Otherwise, keep the primitive value as it is
          result[key] = value;
        }
      }
    }

    return result;
  }
  // Return the original value if it's not an object
  return obj;
};

export interface FieldRenderResult {
  labels: Record<string, any>;   // entries to add to the log labels (expand/single)
  bodyAppend?: string;           // text to append to the message body (raw), e.g. "col={json}"
  hidden?: boolean;              // true for hide
}

const stringifyIfObject = (value: any): any =>
  value && typeof value === 'object' ? JSON.stringify(value) : value;

// Default expand depth when a field carries no explicit `depth` in
// logsFieldConfig. Kept at 1 on purpose: one level of flattening is exactly
// what the plugin did before per-field settings existed, so upgrading the
// plugin does not change the label shape of nested Map/JSON columns.
// Deeper expansion is an explicit opt-in via the Depth selector in the
// "Advanced log fields settings" modal.
export const DEFAULT_EXPAND_DEPTH = 1;

const stripNullable = (chType: string): string => {
  let t = chType.trim();
  if (t.startsWith('Nullable(')) {
    t = t.slice('Nullable('.length, -1);
  }
  return t;
};

export type PathStyle = 'bracket' | 'dot';

// Map uses bracket subscript col['k']; JSON / Tuple / Nested use dot access col.k
export const pathStyleForType = (chType: string): PathStyle => {
  const t = stripNullable(chType).trim();
  if (/^Map\b/i.test(t)) {
    return 'bracket';
  }
  if (/^(JSON|Tuple|Nested|Object)\b/i.test(t)) {
    return 'dot';
  }
  return 'bracket';
};

const flattenDeep = (prefix: string, value: any, levelsLeft: number, out: Record<string, any>, pathStyle: PathStyle = 'bracket'): void => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (levelsLeft <= 0) {
      out[prefix] = JSON.stringify(value);
      return;
    }
    for (const k in value) {
      if (Object.prototype.hasOwnProperty.call(value, k)) {
        const childKey = pathStyle === 'dot' ? `${prefix}.${k}` : `${prefix}['${k}']`;
        flattenDeep(childKey, value[k], levelsLeft - 1, out, pathStyle);
      }
    }
  } else if (Array.isArray(value)) {
    out[prefix] = JSON.stringify(value);
  } else {
    out[prefix] = value;
  }
};

export const expandFieldDeep = (colName: string, value: any, maxDepth: number = DEFAULT_EXPAND_DEPTH, pathStyle: PathStyle = 'bracket'): Record<string, any> => {
  const out: Record<string, any> = {};
  flattenDeep(colName, value, maxDepth, out, pathStyle);
  return out;
};

export const renderFieldByMode = (colName: string, value: any, mode: LogsFieldMode, depth?: number, pathStyle?: PathStyle): FieldRenderResult => {
  switch (mode) {
    case 'hide':
      return { labels: {}, hidden: true };
    case 'raw':
      return { labels: {}, bodyAppend: `${colName}=${stringifyIfObject(value)}` };
    case 'single':
      return { labels: { [colName]: stringifyIfObject(value) } };
    case 'expand':
    default:
      return { labels: expandFieldDeep(colName, value, depth ?? DEFAULT_EXPAND_DEPTH, pathStyle ?? 'bracket') };
  }
};

export const isComplexType = (chType: string): boolean =>
  /^(Map|Array|Tuple|Nested|Object|JSON|Dynamic|Variant)\b/i.test(stripNullable(chType));

// split a comma-separated type-arg list at TOP nesting level only
const splitTopLevelArgs = (s: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') { depth++; cur += ch; }
    else if (ch === ')') { depth--; cur += ch; }
    else if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; }
    else { cur += ch; }
  }
  if (cur.trim()) { parts.push(cur); }
  return parts.map((p) => p.trim());
};

// strip a leading "fieldName " from a Tuple/Nested element (e.g. "lat Float64" -> "Float64")
const stripElementName = (part: string): string => {
  const sp = part.indexOf(' ');
  if (sp > 0) {
    const first = part.slice(0, sp);
    if (/^[A-Za-z_]\w*$/.test(first)) {
      return part.slice(sp + 1).trim();
    }
  }
  return part;
};

// True when the type can nest deeper than one level (so a depth selector is meaningful).
export const typeHasNesting = (chType: string): boolean => {
  const t = stripNullable(chType).trim();
  const mapMatch = /^Map\((.*)\)$/is.exec(t);
  if (mapMatch) {
    const parts = splitTopLevelArgs(mapMatch[1]);
    if (parts.length >= 2) {
      const valueType = parts.slice(1).join(',').trim();
      return isComplexType(valueType);
    }
    return false;
  }
  const tupMatch = /^(?:Tuple|Nested)\((.*)\)$/is.exec(t);
  if (tupMatch) {
    return splitTopLevelArgs(tupMatch[1]).some((p) => isComplexType(stripElementName(p)));
  }
  if (/^(Object|JSON)\b/i.test(t)) {
    return true; // dynamic/semi-structured — can nest
  }
  return false;
};

export const defaultModeForType = (chType: string): LogsFieldMode | undefined => {
  const t = stripNullable(chType);
  if (/^Array\b/i.test(t)) {
    return 'single';
  }
  if (/^(Dynamic|Variant)\b/i.test(t)) {
    return 'single';
  }
  if (/^(Map|Object|JSON|Tuple|Nested)\b/i.test(t)) {
    return 'expand';
  }
  return undefined;
};

export const resolveFieldModes = (
  meta: Array<{ name: string; type: string }>,
  logsFieldConfig?: Record<string, LogsFieldConfigEntry>
): Record<string, LogsFieldMode> => {
  const result: Record<string, LogsFieldMode> = {};
  for (const col of meta || []) {
    const override = logsFieldConfig?.[col.name]?.mode;
    if (override) {
      result[col.name] = override;
      continue;
    }
    const def = defaultModeForType(col.type);
    if (def) {
      result[col.name] = def;
    }
  }
  return result;
};
