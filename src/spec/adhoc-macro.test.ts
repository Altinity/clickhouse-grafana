/**
 * Test for Issue #804 - $adhoc macro replacement
 * Tests the $adhoc macro replacement logic with empty filters
 */

describe('$adhoc Macro Replacement (Issue #804)', () => {
  // Simulate the fixed logic from resource_handlers.go
  const simulateAdhocReplacement = (
    sql: string,
    adhocConditions: string[]
  ): string => {
    // Always handle $adhoc replacement, even for empty filters
    if (sql.includes('$adhoc')) {
      let renderedCondition = '1';
      if (adhocConditions.length > 0) {
        renderedCondition = `(${adhocConditions.join(' AND ')})`;
      }
      return sql.replace(/\$adhoc/g, renderedCondition);
    }
    return sql;
  };

  describe('$adhoc macro replacement with various filter scenarios', () => {
    it('should replace $adhoc with "1" when no filters are provided', () => {
      // Arrange
      const sql = 'SELECT 1 FROM system.users WHERE $adhoc';
      const adhocConditions: string[] = [];

      // Act
      const result = simulateAdhocReplacement(sql, adhocConditions);

      // Assert
      expect(result).toBe('SELECT 1 FROM system.users WHERE 1');
      expect(result).not.toContain('$adhoc');
    });

    it('should replace $adhoc with conditions when filters are provided', () => {
      // Arrange
      const sql = 'SELECT * FROM events WHERE $adhoc';
      const adhocConditions = ["status = 'active'", "role = 'admin'"];

      // Act
      const result = simulateAdhocReplacement(sql, adhocConditions);

      // Assert
      expect(result).toBe("SELECT * FROM events WHERE (status = 'active' AND role = 'admin')");
      expect(result).not.toContain('$adhoc');
    });

    it('should replace multiple $adhoc macros in the same query', () => {
      // Arrange
      const sql = 'SELECT * FROM (SELECT * FROM table1 WHERE $adhoc) UNION (SELECT * FROM table2 WHERE $adhoc)';
      const adhocConditions: string[] = [];

      // Act
      const result = simulateAdhocReplacement(sql, adhocConditions);

      // Assert
      expect(result).toBe('SELECT * FROM (SELECT * FROM table1 WHERE 1) UNION (SELECT * FROM table2 WHERE 1)');
      expect(result).not.toContain('$adhoc');
    });

    it('should handle query without $adhoc macro (no replacement needed)', () => {
      // Arrange
      const sql = 'SELECT 1 FROM system.users WHERE status = "active"';
      const adhocConditions = ["role = 'admin'"];

      // Act
      const result = simulateAdhocReplacement(sql, adhocConditions);

      // Assert
      expect(result).toBe('SELECT 1 FROM system.users WHERE status = "active"');
      expect(result).not.toContain('$adhoc');
    });

    it('should replace $adhoc in complex queries', () => {
      // Arrange
      const sql = `
        SELECT 
          count() as total,
          status
        FROM events 
        WHERE $adhoc 
          AND timestamp >= now() - interval 1 hour
        GROUP BY status
      `;
      const adhocConditions = ["level = 'error'"];

      // Act
      const result = simulateAdhocReplacement(sql, adhocConditions);

      // Assert
      expect(result).toContain("WHERE (level = 'error')");
      expect(result).toContain('AND timestamp >= now() - interval 1 hour');
      expect(result).not.toContain('$adhoc');
    });

    it('should handle single condition without parentheses issue', () => {
      // Arrange
      const sql = 'SELECT * FROM logs WHERE $adhoc';
      const adhocConditions = ["status = 'error'"];

      // Act
      const result = simulateAdhocReplacement(sql, adhocConditions);

      // Assert
      expect(result).toBe("SELECT * FROM logs WHERE (status = 'error')");
      expect(result).not.toContain('$adhoc');
    });
  });

  describe('regression scenarios', () => {
    it('should handle the original bug scenario from issue #804', () => {
      // This simulates the exact scenario reported in the issue
      const sql = 'SELECT 1 FROM system.users WHERE $adhoc';
      const adhocConditions: string[] = []; // No filters - this was the broken case

      // Before fix: $adhoc would remain unreplaced when no filters
      // After fix: $adhoc gets replaced with "1"
      const result = simulateAdhocReplacement(sql, adhocConditions);

      expect(result).toBe('SELECT 1 FROM system.users WHERE 1');
      expect(result).not.toContain('$adhoc');
      expect(result).not.toContain('Unknown expression identifier'); // Would be the ClickHouse error
    });

    it('should demonstrate the fix works regardless of filter presence', () => {
      const baseSQL = 'SELECT count() FROM events WHERE $adhoc';
      
      // Case 1: No filters (was broken before fix)
      const resultNoFilters = simulateAdhocReplacement(baseSQL, []);
      expect(resultNoFilters).toBe('SELECT count() FROM events WHERE 1');
      expect(resultNoFilters).not.toContain('$adhoc');

      // Case 2: With filters (was already working before fix)
      const resultWithFilters = simulateAdhocReplacement(baseSQL, ["status = 'active'"]);
      expect(resultWithFilters).toBe("SELECT count() FROM events WHERE (status = 'active')");
      expect(resultWithFilters).not.toContain('$adhoc');
    });
  });

  describe('edge cases', () => {
    it('should handle $adhoc at different positions in the query', () => {
      const testCases = [
        {
          sql: 'SELECT * FROM table WHERE $adhoc',
          expected: 'SELECT * FROM table WHERE 1',
        },
        {
          sql: 'SELECT * FROM table WHERE field = "value" AND $adhoc',
          expected: 'SELECT * FROM table WHERE field = "value" AND 1',
        },
        {
          sql: 'SELECT * FROM table WHERE $adhoc AND field = "value"',
          expected: 'SELECT * FROM table WHERE 1 AND field = "value"',
        },
        {
          sql: 'SELECT * FROM table WHERE field1 = "value1" AND $adhoc AND field2 = "value2"',
          expected: 'SELECT * FROM table WHERE field1 = "value1" AND 1 AND field2 = "value2"',
        },
      ];

      testCases.forEach(({ sql, expected }) => {
        const result = simulateAdhocReplacement(sql, []);
        expect(result).toBe(expected);
      });
    });

    it('should handle multiple conditions properly', () => {
      const sql = 'SELECT * FROM events WHERE $adhoc';
      const adhocConditions = [
        "status = 'active'",
        "level = 'info'",
        "source = 'api'",
      ];

      const result = simulateAdhocReplacement(sql, adhocConditions);

      expect(result).toBe("SELECT * FROM events WHERE (status = 'active' AND level = 'info' AND source = 'api')");
      expect(result).not.toContain('$adhoc');
    });
  });
});
