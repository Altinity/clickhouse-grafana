import { isSafeInteger, is64BitIntegerType, formatNumericValue } from '../datasource/sql-series/bigIntUtils';

describe('bigIntUtils', () => {
  describe('isSafeInteger', () => {
    it('should return true for zero', () => {
      expect(isSafeInteger(0)).toBe(true);
      expect(isSafeInteger('0')).toBe(true);
    });

    it('should return true for small positive numbers', () => {
      expect(isSafeInteger(1234567890)).toBe(true);
      expect(isSafeInteger('1234567890')).toBe(true);
    });

    it('should return true for small negative numbers', () => {
      expect(isSafeInteger(-1234567890)).toBe(true);
      expect(isSafeInteger('-1234567890')).toBe(true);
    });

    it('should return true for MAX_SAFE_INTEGER', () => {
      expect(isSafeInteger(9007199254740991)).toBe(true);
      expect(isSafeInteger('9007199254740991')).toBe(true);
    });

    it('should return true for MIN_SAFE_INTEGER', () => {
      expect(isSafeInteger(-9007199254740991)).toBe(true);
      expect(isSafeInteger('-9007199254740991')).toBe(true);
    });

    it('should return false for numbers larger than MAX_SAFE_INTEGER', () => {
      expect(isSafeInteger('9007199254740992')).toBe(false); // MAX_SAFE_INTEGER + 1
      expect(isSafeInteger('11189782786942380395')).toBe(false); // Issue #832 example
      expect(isSafeInteger('18446744073709551615')).toBe(false); // Max UInt64
    });

    it('should return false for numbers smaller than MIN_SAFE_INTEGER', () => {
      expect(isSafeInteger('-9007199254740992')).toBe(false);
      expect(isSafeInteger('-9223372036854775808')).toBe(false); // Min Int64
    });

    it('should return false for non-integer strings', () => {
      expect(isSafeInteger('abc')).toBe(false);
      expect(isSafeInteger('12.34')).toBe(false);
      expect(isSafeInteger('')).toBe(false);
    });
  });

  describe('is64BitIntegerType', () => {
    it('should return true for UInt64', () => {
      expect(is64BitIntegerType('UInt64')).toBe(true);
    });

    it('should return true for Int64', () => {
      expect(is64BitIntegerType('Int64')).toBe(true);
    });

    it('should return true for Nullable(UInt64)', () => {
      expect(is64BitIntegerType('Nullable(UInt64)')).toBe(true);
    });

    it('should return true for Nullable(Int64)', () => {
      expect(is64BitIntegerType('Nullable(Int64)')).toBe(true);
    });

    it('should return true for LowCardinality(UInt64)', () => {
      expect(is64BitIntegerType('LowCardinality(UInt64)')).toBe(true);
    });

    it('should return true for Decimal64', () => {
      expect(is64BitIntegerType('Decimal64(2)')).toBe(true);
      expect(is64BitIntegerType('Decimal64(18)')).toBe(true);
    });

    it('should return true for Decimal128', () => {
      expect(is64BitIntegerType('Decimal128(2)')).toBe(true);
      expect(is64BitIntegerType('Decimal128(38)')).toBe(true);
    });

    it('should return true for Nullable(Decimal64)', () => {
      expect(is64BitIntegerType('Nullable(Decimal64(2))')).toBe(true);
    });

    it('should return false for UInt32', () => {
      expect(is64BitIntegerType('UInt32')).toBe(false);
    });

    it('should return false for Int32', () => {
      expect(is64BitIntegerType('Int32')).toBe(false);
    });

    it('should return false for Float64 (JS Number IS float64)', () => {
      expect(is64BitIntegerType('Float64')).toBe(false);
    });

    it('should return false for Decimal32 (max ~4 billion is safe)', () => {
      expect(is64BitIntegerType('Decimal32(2)')).toBe(false);
    });

    it('should return false for String', () => {
      expect(is64BitIntegerType('String')).toBe(false);
    });

    it('should return false for empty/null', () => {
      expect(is64BitIntegerType('')).toBe(false);
      expect(is64BitIntegerType(null as any)).toBe(false);
      expect(is64BitIntegerType(undefined as any)).toBe(false);
    });

    it('should return true for Array(Tuple(String, UInt64))', () => {
      expect(is64BitIntegerType('Array(Tuple(String, UInt64))')).toBe(true);
      expect(is64BitIntegerType('Array(Tuple(String, Int64))')).toBe(true);
    });

    it('should return false for Array(Tuple(String, UInt32))', () => {
      expect(is64BitIntegerType('Array(Tuple(String, UInt32))')).toBe(false);
    });
  });

  describe('formatNumericValue', () => {
    describe('with UInt64 type', () => {
      const chType = 'UInt64';

      it('should convert safe integer strings to numbers', () => {
        expect(formatNumericValue('1234567890', chType)).toBe(1234567890);
        expect(formatNumericValue('0', chType)).toBe(0);
        expect(formatNumericValue('9007199254740991', chType)).toBe(9007199254740991);
      });

      it('should keep unsafe integer strings as strings', () => {
        expect(formatNumericValue('9007199254740992', chType)).toBe('9007199254740992');
        expect(formatNumericValue('11189782786942380395', chType)).toBe('11189782786942380395');
        expect(formatNumericValue('18446744073709551615', chType)).toBe('18446744073709551615');
      });

      it('should return null/undefined as is', () => {
        expect(formatNumericValue(null, chType)).toBeNull();
        expect(formatNumericValue(undefined, chType)).toBeUndefined();
      });

      it('should return numbers as is', () => {
        expect(formatNumericValue(123, chType)).toBe(123);
      });

      it('should stringify objects', () => {
        expect(formatNumericValue({ a: 1 }, chType)).toBe('{"a":1}');
      });
    });

    describe('with Nullable(UInt64) type', () => {
      const chType = 'Nullable(UInt64)';

      it('should convert safe integer strings to numbers', () => {
        expect(formatNumericValue('1234567890', chType)).toBe(1234567890);
      });

      it('should keep unsafe integer strings as strings', () => {
        expect(formatNumericValue('11189782786942380395', chType)).toBe('11189782786942380395');
      });
    });

    describe('with Int64 type', () => {
      const chType = 'Int64';

      it('should convert safe negative integer strings to numbers', () => {
        expect(formatNumericValue('-1234567890', chType)).toBe(-1234567890);
        expect(formatNumericValue('-9007199254740991', chType)).toBe(-9007199254740991);
      });

      it('should keep unsafe negative integer strings as strings', () => {
        expect(formatNumericValue('-9007199254740992', chType)).toBe('-9007199254740992');
        expect(formatNumericValue('-9223372036854775808', chType)).toBe('-9223372036854775808');
      });
    });

    describe('with non-64-bit types', () => {
      it('should always convert to number for UInt32', () => {
        expect(formatNumericValue('123', 'UInt32')).toBe(123);
        expect(formatNumericValue('abc', 'UInt32')).toBe('abc'); // NaN case
      });

      it('should always convert to number for Float64', () => {
        expect(formatNumericValue('123.45', 'Float64')).toBe(123.45);
      });

      it('should convert to number when no type specified', () => {
        expect(formatNumericValue('123', undefined)).toBe(123);
      });
    });
  });
});
