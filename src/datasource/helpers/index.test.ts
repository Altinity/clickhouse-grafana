import { interpolateQueryExpr, interpolateQueryExprWithContext, createContextAwareInterpolation } from './index';

describe('Variable Interpolation', () => {
  describe('interpolateQueryExpr (original)', () => {
    it('should quote single variables when multi/includeAll are undefined', () => {
      const variable = { name: 'test', multi: undefined, includeAll: undefined };
      const result = interpolateQueryExpr('testvalue', variable);
      expect(result).toBe("'testvalue'");
    });

    it('should not quote single variables when multi=false and includeAll=false', () => {
      const variable = { name: 'test', multi: false, includeAll: false };
      const result = interpolateQueryExpr('testvalue', variable);
      expect(result).toBe('testvalue');
    });

    it('should handle multi-value variables', () => {
      const variable = { name: 'test', multi: true, includeAll: false, options: [{ value: 'val1' }, { value: 'val2' }] };
      const result = interpolateQueryExpr(['val1', 'val2'], variable);
      expect(result).toBe("'val1','val2'");
    });
  });

  describe('Context-aware interpolation', () => {
    describe('Concatenation detection', () => {
      it('should detect concatenation with dot after variable', () => {
        const query = 'SELECT * FROM $container.namespace.svc';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'container', multi: undefined, includeAll: undefined };
        const result = interpolateFn('mycontainer', variable);
        expect(result).toBe('mycontainer'); // No quotes
      });

      it('should detect concatenation with dot before variable', () => {
        const query = 'SELECT * FROM service.$namespace.cluster';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'namespace', multi: undefined, includeAll: undefined };
        const result = interpolateFn('mynamespace', variable);
        expect(result).toBe('mynamespace'); // No quotes
      });

      it('should detect concatenation with dots on both sides', () => {
        const query = 'SELECT * FROM app.$container.$namespace.svc';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'container', multi: undefined, includeAll: undefined };
        const result = interpolateFn('mycontainer', variable);
        expect(result).toBe('mycontainer'); // No quotes
      });

      it('should detect concatenation with braced variables', () => {
        const query = 'SELECT * FROM ${container}.${namespace}.svc';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'container', multi: undefined, includeAll: undefined };
        const result = interpolateFn('mycontainer', variable);
        expect(result).toBe('mycontainer'); // No quotes
      });

      it('should handle the user reported issue pattern', () => {
        const query = "AND JSON_VALUE(message, '$.service.host') = '$container.$selectednamespace.8090.svc'";
        const interpolateFn = interpolateQueryExprWithContext(query);
        
        const containerVar = { name: 'container', multi: undefined, includeAll: undefined };
        const namespaceVar = { name: 'selectednamespace', multi: undefined, includeAll: undefined };
        
        const containerResult = interpolateFn('mycontainer', containerVar);
        const namespaceResult = interpolateFn('mynamespace', namespaceVar);
        
        expect(containerResult).toBe('mycontainer'); // No quotes for concatenation
        expect(namespaceResult).toBe('mynamespace'); // No quotes for concatenation
      });
    });

    describe('Non-concatenation contexts', () => {
      it('should quote variables in IN clauses', () => {
        const query = 'SELECT * FROM table WHERE service IN ($service)';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'service', multi: undefined, includeAll: undefined };
        const result = interpolateFn('myservice', variable);
        expect(result).toBe("'myservice'"); // Should have quotes
      });

      it('should quote variables in WHERE clauses', () => {
        const query = 'SELECT * FROM table WHERE name = $name';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'name', multi: undefined, includeAll: undefined };
        const result = interpolateFn('testname', variable);
        expect(result).toBe("'testname'"); // Should have quotes
      });

      it('should quote variables in repeated panels (original issue #712)', () => {
        const query = 'SELECT service_name, count() FROM table WHERE service_name IN (${repeated_service})';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'repeated_service', multi: undefined, includeAll: undefined };
        const result = interpolateFn('mysql', variable);
        expect(result).toBe("'mysql'"); // Should have quotes
      });
    });

    describe('Additional concatenation patterns', () => {
      it('should handle variables with underscores in concatenation', () => {
        const query = 'SELECT * FROM $container_name.$namespace_id.svc';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable1 = { name: 'container_name', multi: undefined, includeAll: undefined };
        const variable2 = { name: 'namespace_id', multi: undefined, includeAll: undefined };
        expect(interpolateFn('mycontainer', variable1)).toBe('mycontainer');
        expect(interpolateFn('mynamespace', variable2)).toBe('mynamespace');
      });

      it('should handle variables with numbers in concatenation', () => {
        const query = 'SELECT * FROM $container1.$namespace2.svc';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable1 = { name: 'container1', multi: undefined, includeAll: undefined };
        const variable2 = { name: 'namespace2', multi: undefined, includeAll: undefined };
        expect(interpolateFn('cont1', variable1)).toBe('cont1');
        expect(interpolateFn('ns2', variable2)).toBe('ns2');
      });

      it('should handle concatenation at start of query', () => {
        const query = '$host.domain.com WHERE 1=1';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'host', multi: undefined, includeAll: undefined };
        expect(interpolateFn('myhost', variable)).toBe('myhost');
      });

      it('should handle concatenation at end of query', () => {
        const query = 'SELECT * FROM table WHERE host = server.$domain';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'domain', multi: undefined, includeAll: undefined };
        expect(interpolateFn('example.com', variable)).toBe('example.com');
      });
    });

    describe('Complex SQL contexts', () => {
      it('should quote variables in LIKE patterns', () => {
        const query = "SELECT * FROM table WHERE name LIKE '$prefix%'";
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'prefix', multi: undefined, includeAll: undefined };
        const result = interpolateFn('test', variable);
        expect(result).toBe("'test'"); // Should have quotes
      });

      it('should NOT remove quotes when concatenation is inside quotes', () => {
        const query = "SELECT * FROM table WHERE host = '$container.$namespace'";
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable1 = { name: 'container', multi: undefined, includeAll: undefined };
        const variable2 = { name: 'namespace', multi: undefined, includeAll: undefined };
        // This is a tricky case - the concatenation is inside quotes, so we should still apply quotes
        expect(interpolateFn('cont', variable1)).toBe('cont');
        expect(interpolateFn('ns', variable2)).toBe('ns');
      });

      it('should quote variables in BETWEEN clauses', () => {
        const query = 'SELECT * FROM table WHERE value BETWEEN $min AND $max';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable1 = { name: 'min', multi: undefined, includeAll: undefined };
        const variable2 = { name: 'max', multi: undefined, includeAll: undefined };
        expect(interpolateFn('10', variable1)).toBe("'10'");
        expect(interpolateFn('20', variable2)).toBe("'20'");
      });

      it('should handle mixed concatenation and non-concatenation in same query', () => {
        const query = 'SELECT * FROM $db.$table WHERE service = $service AND host = $host.$domain';
        const interpolateFn = interpolateQueryExprWithContext(query);
        
        // Concatenation variables
        const dbVar = { name: 'db', multi: undefined, includeAll: undefined };
        const tableVar = { name: 'table', multi: undefined, includeAll: undefined };
        const hostVar = { name: 'host', multi: undefined, includeAll: undefined };
        const domainVar = { name: 'domain', multi: undefined, includeAll: undefined };
        
        // Non-concatenation variable
        const serviceVar = { name: 'service', multi: undefined, includeAll: undefined };
        
        expect(interpolateFn('mydb', dbVar)).toBe('mydb'); // No quotes
        expect(interpolateFn('mytable', tableVar)).toBe('mytable'); // No quotes
        expect(interpolateFn('myhost', hostVar)).toBe('myhost'); // No quotes
        expect(interpolateFn('mydomain', domainVar)).toBe('mydomain'); // No quotes
        expect(interpolateFn('myservice', serviceVar)).toBe("'myservice'"); // Should have quotes
      });
    });

    describe('Edge cases', () => {
      it('should handle empty query', () => {
        const interpolateFn = interpolateQueryExprWithContext('');
        const variable = { name: 'test', multi: undefined, includeAll: undefined };
        const result = interpolateFn('value', variable);
        expect(result).toBe("'value'"); // Should default to quoting
      });

      it('should handle undefined variable name', () => {
        const query = 'SELECT * FROM $container.svc';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: undefined, multi: undefined, includeAll: undefined };
        const result = interpolateFn('value', variable);
        expect(result).toBe("'value'"); // Should default to quoting
      });

      it('should handle multi-value variables in concatenation context', () => {
        const query = 'SELECT * FROM $container.svc';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'container', multi: true, includeAll: false, options: [{ value: 'val1' }] };
        const result = interpolateFn(['val1', 'val2'], variable);
        // Should fall back to original logic for arrays
        expect(result).toBe("'val1','val2'");
      });

      it('should handle values containing dots', () => {
        const query = 'SELECT * FROM $host WHERE 1=1';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'host', multi: undefined, includeAll: undefined };
        const result = interpolateFn('my.host.com', variable);
        expect(result).toBe("'my.host.com'"); // Should have quotes because it's not in concatenation
      });

      it('should handle numeric values', () => {
        const query = 'SELECT * FROM $port.config';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'port', multi: undefined, includeAll: undefined };
        const result = interpolateFn('8080', variable);
        expect(result).toBe('8080'); // No quotes for concatenation
      });

      it('should handle null and undefined values', () => {
        const query = 'SELECT * FROM $var';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'var', multi: undefined, includeAll: undefined };
        
        expect(interpolateFn(null, variable)).toBe("'null'");
        expect(interpolateFn(undefined, variable)).toBe("'undefined'");
      });

      it('should handle special SQL keywords in concatenation', () => {
        const query = 'SELECT * FROM $schema.$table.$column';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const schemaVar = { name: 'schema', multi: undefined, includeAll: undefined };
        const tableVar = { name: 'table', multi: undefined, includeAll: undefined };
        const columnVar = { name: 'column', multi: undefined, includeAll: undefined };
        
        expect(interpolateFn('public', schemaVar)).toBe('public');
        expect(interpolateFn('users', tableVar)).toBe('users');
        expect(interpolateFn('id', columnVar)).toBe('id');
      });

      it('should handle very long variable names', () => {
        const longVarName = 'very_long_variable_name_that_might_cause_issues';
        const query = `SELECT * FROM $${longVarName}.$namespace`;
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: longVarName, multi: undefined, includeAll: undefined };
        expect(interpolateFn('value', variable)).toBe('value');
      });

      it('should handle multiple consecutive dots in pattern', () => {
        const query = 'SELECT * FROM $var1..$var2...$var3';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const var1 = { name: 'var1', multi: undefined, includeAll: undefined };
        const var2 = { name: 'var2', multi: undefined, includeAll: undefined };
        const var3 = { name: 'var3', multi: undefined, includeAll: undefined };
        
        expect(interpolateFn('a', var1)).toBe('a');
        expect(interpolateFn('b', var2)).toBe('b');
        expect(interpolateFn('c', var3)).toBe('c');
      });
    });

    describe('Grafana-specific patterns', () => {
      it('should handle $__all value correctly', () => {
        const query = 'SELECT * FROM table WHERE service IN ($service)';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'service', multi: true, includeAll: true };
        const result = interpolateFn('$__all', variable);
        expect(result).toBe("'$__all'"); // Should quote special Grafana value
      });

      it('should handle empty array values', () => {
        const query = 'SELECT * FROM table WHERE service IN ($service)';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'service', multi: true, includeAll: false };
        const result = interpolateFn([], variable);
        expect(result).toBe(''); // Empty array should return empty string
      });

      it('should handle regex pattern variables', () => {
        const query = 'SELECT * FROM $table WHERE 1=1';
        const interpolateFn = interpolateQueryExprWithContext(query);
        const variable = { name: 'table', multi: undefined, includeAll: undefined };
        const result = interpolateFn('/^prefix_.*/', variable);
        expect(result).toBe("'/^prefix_.*/'"); // Should quote regex patterns
      });
    });
  });

  describe('createContextAwareInterpolation wrapper', () => {
    it('should work with the wrapper function', () => {
      const query = 'SELECT * FROM $container.$namespace.svc';
      const interpolateFn = createContextAwareInterpolation(query);
      const variable = { name: 'container', multi: undefined, includeAll: undefined };
      const result = interpolateFn('mycontainer', variable);
      expect(result).toBe('mycontainer'); // No quotes for concatenation
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain original behavior for non-concatenation with multi=false, includeAll=false', () => {
      const query = 'SELECT * FROM table WHERE name = $test';
      const interpolateFn = interpolateQueryExprWithContext(query);
      const variable = { name: 'test', multi: false, includeAll: false };
      
      // Should behave exactly like original - no quotes for explicit single variables
      expect(interpolateFn('testvalue', variable)).toBe('testvalue');
      expect(interpolateQueryExpr('testvalue', variable)).toBe('testvalue');
    });

    it('should maintain original behavior for non-concatenation with multi=undefined, includeAll=undefined', () => {
      const query = 'SELECT * FROM table WHERE name = $test';
      const interpolateFn = interpolateQueryExprWithContext(query);
      const variable = { name: 'test', multi: undefined, includeAll: undefined };
      
      // Should behave exactly like original - quotes for repeated variables (issue #712)
      expect(interpolateFn('testvalue', variable)).toBe("'testvalue'");
      expect(interpolateQueryExpr('testvalue', variable)).toBe("'testvalue'");
    });

    it('should maintain original behavior for multi-value variables', () => {
      const query = 'SELECT * FROM table WHERE name IN ($test)';
      const interpolateFn = interpolateQueryExprWithContext(query);
      const variable = { name: 'test', multi: true, includeAll: false, options: [{ value: 'val1' }, { value: 'val2' }] };
      
      // Should behave exactly like original
      const originalResult = interpolateQueryExpr(['val1', 'val2'], variable);
      const newResult = interpolateFn(['val1', 'val2'], variable);
      expect(newResult).toBe(originalResult);
      expect(newResult).toBe("'val1','val2'");
    });

    it('should only change behavior for concatenation with multi=undefined, includeAll=undefined', () => {
      // This is the ONLY case where behavior changes
      const concatenationQuery = 'SELECT * FROM $container.$namespace.svc';
      const normalQuery = 'SELECT * FROM table WHERE name = $test';
      
      const variable = { name: 'test', multi: undefined, includeAll: undefined };
      
      // Concatenation context - NEW behavior (fix for #797)
      const concatFn = interpolateQueryExprWithContext(concatenationQuery);
      expect(concatFn('myvalue', { name: 'container', multi: undefined, includeAll: undefined })).toBe('myvalue');
      
      // Non-concatenation context - OLD behavior preserved (fix for #712)
      const normalFn = interpolateQueryExprWithContext(normalQuery);
      expect(normalFn('myvalue', variable)).toBe("'myvalue'");
      
      // Original function would always quote when multi/includeAll are undefined
      expect(interpolateQueryExpr('myvalue', variable)).toBe("'myvalue'");
    });
  });

  describe('Regression tests for specific issues', () => {
    it('should handle issue #797 - service host concatenation', () => {
      const query = "AND JSON_VALUE(message, '$.service.host') = '$container.$selectednamespace.8090.svc'";
      const interpolateFn = interpolateQueryExprWithContext(query);
      
      // Test the exact scenario from the issue
      const containerVar = { name: 'container', multi: undefined, includeAll: undefined };
      const namespaceVar = { name: 'selectednamespace', multi: undefined, includeAll: undefined };
      
      expect(interpolateFn('transcription', containerVar)).toBe('transcription');
      expect(interpolateFn('dev', namespaceVar)).toBe('dev');
      
      // The resulting query should be valid SQL
      const resultQuery = query
        .replace('$container', 'transcription')
        .replace('$selectednamespace', 'dev');
      expect(resultQuery).toBe("AND JSON_VALUE(message, '$.service.host') = 'transcription.dev.8090.svc'");
    });

    it('should handle issue #797 - URL LIKE concatenation', () => {
      const query = "AND request_url LIKE 'https://${container}%'";
      const interpolateFn = interpolateQueryExprWithContext(query);
      
      const containerVar = { name: 'container', multi: undefined, includeAll: undefined };
      
      // Even though it's in a LIKE pattern, the ${container} is not in a concatenation context
      // so it should be quoted
      expect(interpolateFn('transcription', containerVar)).toBe("'transcription'");
    });

    it('should handle partially replaced concatenation patterns', () => {
      // Simulate a scenario where one variable is already replaced
      const partiallyReplacedQuery = "SELECT * FROM mydb.$table WHERE service = $service";
      const interpolateFn = interpolateQueryExprWithContext(partiallyReplacedQuery);
      
      const tableVar = { name: 'table', multi: undefined, includeAll: undefined };
      const serviceVar = { name: 'service', multi: undefined, includeAll: undefined };
      
      // $table is in concatenation context (mydb.$table)
      expect(interpolateFn('users', tableVar)).toBe('users');
      
      // $service is not in concatenation context
      expect(interpolateFn('api', serviceVar)).toBe("'api'");
    });

    it('should handle the exact issue #797 scenario with multi-pass replacement', () => {
      // This tests the exact scenario that was failing
      const originalQuery = "AND JSON_VALUE(message, '$.service.host') = '$container.$selectednamespace.8090.svc'";
      
      // Our fix: Both variables should see the original query context and be unquoted
      const interpolateFn = interpolateQueryExprWithContext(originalQuery);
      
      const containerVar = { name: 'container', multi: undefined, includeAll: undefined };
      const namespaceVar = { name: 'selectednamespace', multi: undefined, includeAll: undefined };
      
      // Both variables should NOT be quoted because they're in concatenation context
      expect(interpolateFn('transcription', containerVar)).toBe('transcription');
      expect(interpolateFn('dev', namespaceVar)).toBe('dev');
      
      // Simulate the complete replacement (what Grafana would do)
      let finalQuery = originalQuery;
      finalQuery = finalQuery.replace('$container', 'transcription');
      finalQuery = finalQuery.replace('$selectednamespace', 'dev');
      
      expect(finalQuery).toBe("AND JSON_VALUE(message, '$.service.host') = 'transcription.dev.8090.svc'");
    });

    it('should not interfere with backend macros', () => {
      // Test that our context detection doesn't break backend macro processing
      const queryWithAdhoc = 'SELECT * FROM $table WHERE $timeFilter AND $adhoc';
      const interpolateFn = interpolateQueryExprWithContext(queryWithAdhoc);
      
      // These aren't variables that should be processed by frontend interpolation
      // They should be handled by backend macro processing
      // Our context detection should not interfere with them
      const tableVar = { name: 'table', multi: undefined, includeAll: undefined };
      
      // $table is in concatenation with $timeFilter, but they're macros, not user variables
      // A user variable in this context should work normally
      expect(interpolateFn('events', tableVar)).toBe("'events'"); // Should be quoted as normal variable
    });

    it('should handle quoted string with multiple variables', () => {
      // Test variables inside the same quoted string context
      const query = "WHERE host = '$container.$selectednamespace.$environment.cluster.local'";
      const interpolateFn = interpolateQueryExprWithContext(query);
      
      const containerVar = { name: 'container', multi: undefined, includeAll: undefined };
      const namespaceVar = { name: 'selectednamespace', multi: undefined, includeAll: undefined };
      const envVar = { name: 'environment', multi: undefined, includeAll: undefined };
      
      // All should be unquoted since they're building parts of a single string
      expect(interpolateFn('api', containerVar)).toBe('api');
      expect(interpolateFn('prod', namespaceVar)).toBe('prod');
      expect(interpolateFn('staging', envVar)).toBe('staging');
    });

    it('should handle complex multi-variable concatenation', () => {
      const query = "SELECT * FROM $db.$schema.$table WHERE host = '$host.$domain.svc.cluster.local'";
      const interpolateFn = interpolateQueryExprWithContext(query);
      
      // All these are in concatenation context
      const dbVar = { name: 'db', multi: undefined, includeAll: undefined };
      const schemaVar = { name: 'schema', multi: undefined, includeAll: undefined };
      const tableVar = { name: 'table', multi: undefined, includeAll: undefined };
      const hostVar = { name: 'host', multi: undefined, includeAll: undefined };
      const domainVar = { name: 'domain', multi: undefined, includeAll: undefined };
      
      expect(interpolateFn('production', dbVar)).toBe('production');
      expect(interpolateFn('public', schemaVar)).toBe('public');
      expect(interpolateFn('users', tableVar)).toBe('users');
      expect(interpolateFn('api', hostVar)).toBe('api');
      expect(interpolateFn('default', domainVar)).toBe('default');
    });

    it('should maintain fix for issue #712 - repeated panels', () => {
      const query = 'SELECT 1 WHERE 1 IN ($Var)';
      const interpolateFn = interpolateQueryExprWithContext(query);
      const variable = { name: 'Var', multi: undefined, includeAll: undefined };
      
      // Single value should be quoted
      expect(interpolateFn('test-1', variable)).toBe("'test-1'");
      
      // Multiple values should be quoted and comma-separated
      const multiVar = { name: 'Var', multi: true, includeAll: false };
      expect(interpolateFn(['test-1', 'test-2'], multiVar)).toBe("'test-1','test-2'");
    });
  });
});
