import { parse as parseLossless, isInteger } from 'lossless-json';
import { isSafeInteger } from './sql-series/bigIntUtils';

/**
 * Lossless parsing of ClickHouse FORMAT JSON responses.
 *
 * Native JSON.parse converts 64-bit integers to IEEE-754 doubles, silently
 * rounding values above 2^53-1 (e.g. 11189782786942380395 becomes
 * 11189782786942380000). ClickHouse >= 25.8 emits UInt64/Int64 as bare JSON
 * numbers by default (output_format_json_quote_64bit_integers changed to 0,
 * see ClickHouse/ClickHouse#86553), so the response is fetched as text and
 * parsed with lossless-json: integers outside the safe range stay strings,
 * everything else parses to the same values native JSON.parse would produce.
 * The resulting strings are the same shape the sql-series transforms already
 * handle for quoted 64-bit output.
 *
 * @see https://github.com/Altinity/clickhouse-grafana/issues/832
 */

const DIGIT_RUN_16 = /\d{16,}/;

// Integers that cannot be represented exactly in a JS number stay strings;
// safe integers and floats become regular numbers
const parseNumber = (value: string): number | string =>
  isInteger(value) && !isSafeInteger(value) ? value : Number(value);

/**
 * Parse a raw ClickHouse HTTP response body without losing 64-bit precision.
 * Responses without 16+ digit runs (the vast majority) take the native
 * JSON.parse fast path. Non-string input is returned unchanged so call sites
 * stay safe if a response arrives already parsed.
 */
export const parseJsonResponseLossless = (data: any): any => {
  if (typeof data !== 'string') {
    return data;
  }
  if (!DIGIT_RUN_16.test(data)) {
    return JSON.parse(data);
  }
  return parseLossless(data, undefined, parseNumber);
};

/**
 * Best-effort variant for error bodies: with responseType 'text' an HTTP
 * error arrives as a raw string, but downstream classification (e.g.
 * isPermissionError reading error.data.exception) expects the parsed object
 * Grafana used to provide. Restores the object when the body is JSON and
 * returns the input unchanged otherwise (e.g. text/plain ClickHouse errors).
 *
 * Grafana's backend_srv processRequestError runs before the plugin's error
 * handlers and wraps string bodies as {message, error, response} — unwrap
 * that shape too, using the untouched body kept in `response`.
 */
export const tryParseJson = (data: any): any => {
  if (typeof data === 'string') {
    try {
      return parseJsonResponseLossless(data);
    } catch (e) {
      return data;
    }
  }
  if (data && typeof data.response === 'string') {
    try {
      const parsed = parseJsonResponseLossless(data.response);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (e) {
      // fall through: keep the wrapper for non-JSON bodies
    }
  }
  return data;
};
