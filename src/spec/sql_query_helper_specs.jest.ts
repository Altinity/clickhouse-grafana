import { SqlQueryHelper } from '../datasource/sql-query/sql-query-helper';
import TemplateSrvStub from './lib/template_srv_stub';

describe('SqlQueryHelper', () => {
  let templateSrv: any;

  beforeEach(() => {
    templateSrv = new TemplateSrvStub();
  });

  // Helper function to normalize whitespace for comparison
  const normalizeWhitespace = (str: string) => {
    return str.replace(/\s+/g, ' ').trim();
  };

  describe('conditionalTest', () => {
    // Setup tests with different variable types and values
    const setupVariableTests = (
      query: string,
      expectedWithValue: string,
      expectedWithoutValue: string,
      varName: string,
      varType: string
    ) => {
      describe(`with ${varType} variable`, () => {
        it('should include SQL_if when variable has value', () => {
          // Setup variable with value
          const variable = {
            name: varName,
            type: varType,
            current: { value: 'test-value' },
          };
          templateSrv.variables = [variable];
          
          const result = SqlQueryHelper.conditionalTest(query, templateSrv);
          expect(normalizeWhitespace(result)).toBe(normalizeWhitespace(expectedWithValue));
        });

        it('should omit SQL_if when variable is empty (2-param format) or use SQL_else (3-param format)', () => {
          // Setup variable with empty value
          let variable: any;
          
          if (varType === 'query') {
            variable = {
              name: varName,
              type: varType,
              current: { value: '$__all' },
            };
          } else if (varType === 'custom' || varType === 'textbox') {
            variable = {
              name: varName,
              type: varType,
              current: { value: '' },
            };
          } else {
            variable = {
              name: varName,
              type: varType,
              current: { value: [] },
            };
          }
          
          templateSrv.variables = [variable];
          
          const result = SqlQueryHelper.conditionalTest(query, templateSrv);
          expect(normalizeWhitespace(result)).toBe(normalizeWhitespace(expectedWithoutValue));
        });
      });
    };

    // Test 2-parameter format: $conditionalTest(SQL_if, $var)
    describe('2-parameter format', () => {
      const query = 'SELECT * FROM table WHERE 1=1 $conditionalTest(AND column = 10, $var)';
      const expectedWithValue = 'SELECT * FROM table WHERE 1=1 AND column = 10';
      const expectedWithoutValue = 'SELECT * FROM table WHERE 1=1';

      setupVariableTests(query, expectedWithValue, expectedWithoutValue, 'var', 'custom');
      setupVariableTests(query, expectedWithValue, expectedWithoutValue, 'var', 'query');
      setupVariableTests(query, expectedWithValue, expectedWithoutValue, 'var', 'textbox');
    });

    // Test 3-parameter format: $conditionalTest(SQL_if, SQL_else, $var)
    describe('3-parameter format', () => {
      const query = 'SELECT * FROM table WHERE 1=1 $conditionalTest(AND status = \'active\', AND status = \'all\', $statusFilter)';
      const expectedWithValue = 'SELECT * FROM table WHERE 1=1 AND status = \'active\'';
      const expectedWithoutValue = 'SELECT * FROM table WHERE 1=1 AND status = \'all\'';

      setupVariableTests(query, expectedWithValue, expectedWithoutValue, 'statusFilter', 'custom');
      setupVariableTests(query, expectedWithValue, expectedWithoutValue, 'statusFilter', 'query');
      setupVariableTests(query, expectedWithValue, expectedWithoutValue, 'statusFilter', 'textbox');
    });

    // Test with array variables
    describe('with array variables', () => {
      it('should handle array values in 2-param format', () => {
        const query = 'SELECT * FROM table WHERE 1=1 $conditionalTest(AND column IN ($var), $var)';
        const expectedWithValue = 'SELECT * FROM table WHERE 1=1 AND column IN ($var)';
        
        const variable = {
          name: 'var',
          type: 'custom',
          current: { value: ['value1', 'value2', 'value3'] },
          multi: true,
        };
        templateSrv.variables = [variable];
        
        const result = SqlQueryHelper.conditionalTest(query, templateSrv);
        expect(normalizeWhitespace(result)).toBe(normalizeWhitespace(expectedWithValue));
      });

      it('should handle array values in 3-param format', () => {
        const query = 'SELECT * FROM table WHERE 1=1 $conditionalTest(AND column IN ($var), AND column = \'all\', $var)';
        const expectedWithValue = 'SELECT * FROM table WHERE 1=1 AND column IN ($var)';
        const expectedWithoutValue = 'SELECT * FROM table WHERE 1=1 AND column = \'all\'';
        
        // Test with non-empty array
        const variableWithValue = {
          name: 'var',
          type: 'custom',
          current: { value: ['value1', 'value2', 'value3'] },
          multi: true,
        };
        templateSrv.variables = [variableWithValue];
        
        let result = SqlQueryHelper.conditionalTest(query, templateSrv);
        expect(normalizeWhitespace(result)).toBe(normalizeWhitespace(expectedWithValue));
        
        // Test with empty array
        const variableWithoutValue = {
          name: 'var',
          type: 'custom',
          current: { value: [] },
          multi: true,
        };
        templateSrv.variables = [variableWithoutValue];
        
        result = SqlQueryHelper.conditionalTest(query, templateSrv);
        expect(normalizeWhitespace(result)).toBe(normalizeWhitespace(expectedWithoutValue));
      });
    });

    // Test with multi-value variables
    describe('with multi-value variables', () => {
      it('should correctly handle multi-value variables in 2-param format', () => {
        const query = 'SELECT * FROM table WHERE 1=1 $conditionalTest(AND column IN ($var), $var)';

        // Test with non-empty multi-value
        const variableWithValues = {
          name: 'var',
          type: 'query',
          includeAll: true,
          multi: true,
          current: { value: ['value1', 'value2'] },
        };
        templateSrv.variables = [variableWithValues];
        
        const expectedWithValue = 'SELECT * FROM table WHERE 1=1 AND column IN ($var)';
        let result = SqlQueryHelper.conditionalTest(query, templateSrv);
        expect(normalizeWhitespace(result)).toBe(normalizeWhitespace(expectedWithValue));
        
        // Test with $__all selected in multi-value
        const variableWithAll = {
          name: 'var',
          type: 'query',
          includeAll: true,
          multi: true,
          current: { value: ['$__all'] },
        };
        templateSrv.variables = [variableWithAll];
        
        const expectedWithAll = 'SELECT * FROM table WHERE 1=1';
        result = SqlQueryHelper.conditionalTest(query, templateSrv);
        expect(normalizeWhitespace(result)).toBe(normalizeWhitespace(expectedWithAll));
      });

      it('should correctly handle multi-value variables in 3-param format', () => {
        const query = 'SELECT * FROM table WHERE 1=1 $conditionalTest(AND column IN ($var), AND column = \'all\', $var)';
        
        // Test with non-empty multi-value
        const variableWithValues = {
          name: 'var',
          type: 'query',
          includeAll: true,
          multi: true,
          current: { value: ['value1', 'value2'] },
        };
        templateSrv.variables = [variableWithValues];
        
        const expectedWithValue = 'SELECT * FROM table WHERE 1=1 AND column IN ($var)';
        let result = SqlQueryHelper.conditionalTest(query, templateSrv);
        expect(normalizeWhitespace(result)).toBe(normalizeWhitespace(expectedWithValue));
        
        // Test with $__all selected in multi-value
        const variableWithAll = {
          name: 'var',
          type: 'query',
          includeAll: true,
          multi: true,
          current: { value: ['$__all'] },
        };
        templateSrv.variables = [variableWithAll];
        
        const expectedWithAll = 'SELECT * FROM table WHERE 1=1 AND column = \'all\'';
        result = SqlQueryHelper.conditionalTest(query, templateSrv);
        expect(normalizeWhitespace(result)).toBe(normalizeWhitespace(expectedWithAll));
      });
    });

    // Test with nested parentheses in SQL expressions
    describe('with nested parentheses', () => {
      it('should handle nested parentheses in SQL_if expression (2-param format)', () => {
        const query = 'SELECT * FROM table WHERE 1=1 $conditionalTest(AND (column1 = 10 OR (column2 IN (1,2,3) AND column3 = \'test\')), $var)';
        const expectedWithValue = 'SELECT * FROM table WHERE 1=1 AND (column1 = 10 OR (column2 IN (1,2,3) AND column3 = \'test\'))';

        const variable = {
          name: 'var',
          type: 'custom',
          current: { value: 'test-value' },
        };
        templateSrv.variables = [variable];
        
        const result = SqlQueryHelper.conditionalTest(query, templateSrv);
        expect(normalizeWhitespace(result)).toBe(normalizeWhitespace(expectedWithValue));
      });

      it('should handle nested parentheses in SQL expressions (3-param format)', () => {
        const query = 'SELECT * FROM table WHERE 1=1 $conditionalTest(AND (column1 = 10 OR (column2 IN (1,2,3))), AND (status = \'pending\' OR status = \'all\'), $var)';
        const expectedWithValue = 'SELECT * FROM table WHERE 1=1 AND (column1 = 10 OR (column2 IN (1,2,3)))';
        const expectedWithoutValue = 'SELECT * FROM table WHERE 1=1 AND (status = \'pending\' OR status = \'all\')';

        // Test with value
        const variableWithValue = {
          name: 'var',
          type: 'custom',
          current: { value: 'test-value' },
        };
        templateSrv.variables = [variableWithValue];
        
        let result = SqlQueryHelper.conditionalTest(query, templateSrv);
        expect(normalizeWhitespace(result)).toBe(normalizeWhitespace(expectedWithValue));

        // Test without value
        const variableWithoutValue = {
          name: 'var',
          type: 'custom',
          current: { value: '' },
        };
        templateSrv.variables = [variableWithoutValue];
        
        result = SqlQueryHelper.conditionalTest(query, templateSrv);
        expect(normalizeWhitespace(result)).toBe(normalizeWhitespace(expectedWithoutValue));
      });
    });

    // Test multiple conditionalTest macros in one query
    describe('with multiple conditionalTest macros', () => {
      it('should process multiple 2-param and 3-param macros correctly', () => {
        const query = `SELECT * FROM table 
          WHERE 1=1 
          $conditionalTest(AND column1 = 'value1', $var1)
          $conditionalTest(AND column2 = 'value2', AND column2 = 'all', $var2)`;
        
        const expected = `SELECT * FROM table 
          WHERE 1=1 
          
          AND column2 = 'all'`;

        const variables = [
          {
            name: 'var1',
            type: 'custom',
            current: { value: '' },
          },
          {
            name: 'var2',
            type: 'custom',
            current: { value: '' },
          },
        ];
        templateSrv.variables = variables;
        
        const result = SqlQueryHelper.conditionalTest(query, templateSrv);
        expect(normalizeWhitespace(result)).toBe(normalizeWhitespace(expected));
      });
    });

    // Test error cases
    describe('error handling', () => {
      it('should throw error when referenced variable is not found', () => {
        const query = 'SELECT * FROM table WHERE $conditionalTest(AND column = 10, $nonexistentVar)';
        
        expect(() => {
          SqlQueryHelper.conditionalTest(query, templateSrv);
        }).toThrow(/cannot find referenced variable/);
      });

      it('should throw error when last parameter in 3-param format is not a variable', () => {
        const query = 'SELECT * FROM table WHERE $conditionalTest(AND column = 10, AND column = 20, nonVariableParam)';
        
        expect(() => {
          SqlQueryHelper.conditionalTest(query, templateSrv);
        }).toThrow(/last parameter must be a variable/);
      });
    });
  });
});

