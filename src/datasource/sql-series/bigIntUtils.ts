/**
 * Utilities for handling big integers (UInt64/Int64) safely in JavaScript.
 *
 * JavaScript Number can only safely represent integers up to 2^53 - 1.
 * Values larger than this will lose precision when converted to Number.
 *
 * @see https://github.com/Altinity/clickhouse-grafana/issues/832
 */

export const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER; // 9007199254740991 (2^53 - 1)
export const MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER; // -9007199254740991

/**
 * Check if a numeric string represents a value within JavaScript's safe integer range.
 * For non-string values, converts to number first and checks if it's a safe integer.
 */
export const isSafeInteger = (value: string | number): boolean => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value);
  }

  // For strings, parse and check
  // Note: We need to be careful here - if the string represents a number
  // larger than MAX_SAFE_INTEGER, parseFloat will already lose precision.
  // So we compare string lengths and values carefully.
  const trimmed = value.trim();

  // Check for non-numeric strings
  if (!/^-?\d+$/.test(trimmed)) {
    return false; // Not an integer string
  }

  // For positive numbers
  if (!trimmed.startsWith('-')) {
    // MAX_SAFE_INTEGER = 9007199254740991 (16 digits)
    if (trimmed.length > 16) {
      return false;
    }
    if (trimmed.length < 16) {
      return true;
    }
    // Exactly 16 digits - compare lexicographically
    return trimmed <= '9007199254740991';
  }

  // For negative numbers
  const abs = trimmed.slice(1);
  // MIN_SAFE_INTEGER = -9007199254740991 (16 digits without minus)
  if (abs.length > 16) {
    return false;
  }
  if (abs.length < 16) {
    return true;
  }
  // Exactly 16 digits - compare lexicographically
  return abs <= '9007199254740991';
};

/**
 * Check if a ClickHouse type is a 64-bit integer type.
 * Also handles nested types like Array(Tuple(String, UInt64)) by extracting the value type.
 */
export const is64BitIntegerType = (chType: string): boolean => {
  if (!chType) {
    return false;
  }

  // Handle Nullable wrapper
  let type = chType;
  if (type.startsWith('Nullable(')) {
    type = type.slice('Nullable('.length, -1);
  }

  // Direct match
  if (type === 'UInt64' || type === 'Int64') {
    return true;
  }

  // Check for Array(Tuple(...)) pattern used by $columns macro
  // E.g., Array(Tuple(String, UInt64)) -> extract UInt64
  const arrayTupleMatch = type.match(/^Array\(Tuple\([^,]+,\s*(\w+)\)\)$/);
  if (arrayTupleMatch) {
    const valueType = arrayTupleMatch[1];
    return valueType === 'UInt64' || valueType === 'Int64';
  }

  return false;
};

/**
 * Extract the value type from an Array(Tuple(...)) type pattern.
 * Returns the original type if not matching the pattern.
 */
export const extractValueTypeFromArrayTuple = (chType: string): string => {
  if (!chType) {
    return chType;
  }

  const arrayTupleMatch = chType.match(/^Array\(Tuple\([^,]+,\s*(\w+)\)\)$/);
  if (arrayTupleMatch) {
    return arrayTupleMatch[1];
  }

  return chType;
};

/**
 * Safely format a numeric value, preserving precision for large integers.
 *
 * For 64-bit integer types:
 * - If the value is within safe range, return as number
 * - If the value is outside safe range, return as string to preserve precision
 *
 * For other numeric types, always convert to number.
 */
export const formatNumericValue = (value: any, chType?: string): number | string | null => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  // For 64-bit types, check if we can safely convert
  if (chType && is64BitIntegerType(chType)) {
    if (typeof value === 'string') {
      if (isSafeInteger(value)) {
        return Number(value);
      }
      // Keep as string to preserve precision
      return value;
    }
    // Already a number - return as is (precision may already be lost)
    return value;
  }

  // For non-64-bit types, convert to number
  const numeric = Number(value);
  if (isNaN(numeric)) {
    return value;
  }
  return numeric;
};
