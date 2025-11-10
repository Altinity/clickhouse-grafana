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
        const variables = [{ name: 'container', current: { value: 'mycontainer' } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'container', multi: undefined, includeAll: undefined };
        const result = interpolateFn('mycontainer', variable);
        expect(result).toBe('mycontainer'); // No quotes
      });

      it('should detect concatenation with dot before variable', () => {
        const query = 'SELECT * FROM service.$namespace.cluster';
        const variables = [{ name: 'namespace', current: { value: 'mynamespace' } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'namespace', multi: undefined, includeAll: undefined };
        const result = interpolateFn('mynamespace', variable);
        expect(result).toBe('mynamespace'); // No quotes
      });

      it('should detect concatenation with dots on both sides', () => {
        const query = 'SELECT * FROM app.$container.$namespace.svc';
        const variables = [{ name: 'container', current: { value: 'mycontainer' } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'container', multi: undefined, includeAll: undefined };
        const result = interpolateFn('mycontainer', variable);
        expect(result).toBe('mycontainer'); // No quotes
      });

      it('should detect concatenation with braced variables', () => {
        const query = 'SELECT * FROM ${container}.${namespace}.svc';
        const variables = [{ name: 'container', current: { value: 'mycontainer' } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'container', multi: undefined, includeAll: undefined };
        const result = interpolateFn('mycontainer', variable);
        expect(result).toBe('mycontainer'); // No quotes
      });

      it('should handle the user reported issue pattern', () => {
        const query = "AND JSON_VALUE(message, '$.service.host') = '$container.$selectednamespace.8090.svc'";
        const variables = [
          { name: 'container', current: { value: 'mycontainer' } },
          { name: 'selectednamespace', current: { value: 'mynamespace' } }
        ];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);

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
        const variables = [{ name: 'service', current: { value: 'myservice' } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'service', multi: undefined, includeAll: undefined };
        const result = interpolateFn('myservice', variable);
        expect(result).toBe("'myservice'"); // Should have quotes
      });

      it('should quote variables in WHERE clauses', () => {
        const query = 'SELECT * FROM table WHERE name = $name';
        const variables = [{ name: 'name', current: { value: 'testname' } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'name', multi: undefined, includeAll: undefined };
        const result = interpolateFn('testname', variable);
        expect(result).toBe("'testname'"); // Should have quotes
      });

      it('should quote variables in repeated panels (original issue #712)', () => {
        const query = 'SELECT service_name, count() FROM table WHERE service_name IN (${repeated_service})';
        // For repeated panels, the value differs from the current value
        const variables = [{ name: 'repeated_service', current: { value: 'postgres' } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'repeated_service', multi: undefined, includeAll: undefined };
        const result = interpolateFn('mysql', variable);
        expect(result).toBe("'mysql'"); // Should have quotes for repeated value
      });
    });

    describe('Additional concatenation patterns', () => {
      it('should handle variables with underscores in concatenation', () => {
        const query = 'SELECT * FROM $container_name.$namespace_id.svc';
        const variables = [
          { name: 'container_name', current: { value: 'mycontainer' } },
          { name: 'namespace_id', current: { value: 'mynamespace' } }
        ];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable1 = { name: 'container_name', multi: undefined, includeAll: undefined };
        const variable2 = { name: 'namespace_id', multi: undefined, includeAll: undefined };
        expect(interpolateFn('mycontainer', variable1)).toBe('mycontainer');
        expect(interpolateFn('mynamespace', variable2)).toBe('mynamespace');
      });

      it('should handle variables with numbers in concatenation', () => {
        const query = 'SELECT * FROM $container1.$namespace2.svc';
        const variables = [
          { name: 'container1', current: { value: 'cont1' } },
          { name: 'namespace2', current: { value: 'ns2' } }
        ];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable1 = { name: 'container1', multi: undefined, includeAll: undefined };
        const variable2 = { name: 'namespace2', multi: undefined, includeAll: undefined };
        expect(interpolateFn('cont1', variable1)).toBe('cont1');
        expect(interpolateFn('ns2', variable2)).toBe('ns2');
      });

      it('should handle concatenation at start of query', () => {
        const query = '$host.domain.com WHERE 1=1';
        const variables = [{ name: 'host', current: { value: 'myhost' } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'host', multi: undefined, includeAll: undefined };
        expect(interpolateFn('myhost', variable)).toBe('myhost');
      });

      it('should handle concatenation at end of query', () => {
        const query = 'SELECT * FROM table WHERE host = server.$domain';
        const variables = [{ name: 'domain', current: { value: 'example.com' } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'domain', multi: undefined, includeAll: undefined };
        expect(interpolateFn('example.com', variable)).toBe('example.com');
      });
    });

    describe('Complex SQL contexts', () => {
      it('should NOT quote variables already inside LIKE string literals (issue #827)', () => {
        const query = "SELECT * FROM table WHERE name LIKE '$prefix%'";
        const variables = [{ name: 'prefix', current: { value: 'test' } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'prefix', multi: undefined, includeAll: undefined };
        const result = interpolateFn('test', variable);
        expect(result).toBe('test'); // Should NOT have quotes - already in string literal
      });

      it('should NOT remove quotes when concatenation is inside quotes', () => {
        const query = "SELECT * FROM table WHERE host = '$container.$namespace'";
        const variables = [
          { name: 'container', current: { value: 'cont' } },
          { name: 'namespace', current: { value: 'ns' } }
        ];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable1 = { name: 'container', multi: undefined, includeAll: undefined };
        const variable2 = { name: 'namespace', multi: undefined, includeAll: undefined };
        // This is a tricky case - the concatenation is inside quotes, so we should still apply quotes
        expect(interpolateFn('cont', variable1)).toBe('cont');
        expect(interpolateFn('ns', variable2)).toBe('ns');
      });

      it('should handle mixed concatenation and non-concatenation in same query', () => {
        const query = 'SELECT * FROM $db.$table WHERE service = $service AND host = $host.$domain';
        const variables = [
          { name: 'db', current: { value: 'mydb' } },
          { name: 'table', current: { value: 'mytable' } },
          { name: 'service', current: { value: 'myservice' } },
          { name: 'host', current: { value: 'myhost' } },
          { name: 'domain', current: { value: 'mydomain' } }
        ];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);

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
        const variables = [];
        const interpolateFn = interpolateQueryExprWithContext('', variables);
        const variable = { name: 'test', multi: undefined, includeAll: undefined };
        const result = interpolateFn('value', variable);
        expect(result).toBe("'value'"); // Should default to quoting
      });

      it('should handle undefined variable name', () => {
        const query = 'SELECT * FROM $container.svc';
        const variables = [];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: undefined, multi: undefined, includeAll: undefined };
        const result = interpolateFn('value', variable);
        expect(result).toBe("'value'"); // Should default to quoting
      });

      it('should handle multi-value variables in concatenation context', () => {
        const query = 'SELECT * FROM $container.svc';
        const variables = [{ name: 'container', current: { value: ['val1', 'val2'] } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'container', multi: true, includeAll: false, options: [{ value: 'val1' }] };
        const result = interpolateFn(['val1', 'val2'], variable);
        // Arrays don't make sense in concatenation, so falls back to array literal format
        expect(result).toBe("['val1', 'val2']");
      });

      it('should handle values containing dots', () => {
        const query = 'SELECT * FROM $host WHERE 1=1';
        const variables = [{ name: 'host', current: { value: 'my.host.com' } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'host', multi: undefined, includeAll: undefined };
        const result = interpolateFn('my.host.com', variable);
        expect(result).toBe("'my.host.com'"); // Should have quotes because it's not in concatenation
      });

      it('should handle numeric values', () => {
        const query = 'SELECT * FROM $port.config';
        const variables = [{ name: 'port', current: { value: '8080' } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'port', multi: undefined, includeAll: undefined };
        const result = interpolateFn('8080', variable);
        expect(result).toBe('8080'); // No quotes for concatenation
      });

      it('should handle special SQL keywords in concatenation', () => {
        const query = 'SELECT * FROM $schema.$table.$column';
        const variables = [
          { name: 'schema', current: { value: 'public' } },
          { name: 'table', current: { value: 'users' } },
          { name: 'column', current: { value: 'id' } }
        ];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
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
        const variables = [{ name: longVarName, current: { value: 'value' } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: longVarName, multi: undefined, includeAll: undefined };
        expect(interpolateFn('value', variable)).toBe('value');
      });

      it('should handle multiple consecutive dots in pattern', () => {
        const query = 'SELECT * FROM $var1..$var2...$var3';
        const variables = [
          { name: 'var1', current: { value: 'a' } },
          { name: 'var2', current: { value: 'b' } },
          { name: 'var3', current: { value: 'c' } }
        ];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
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
        const variables = [{ name: 'service', current: { value: '$__all' } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'service', multi: true, includeAll: true };
        const result = interpolateFn('$__all', variable);
        expect(result).toBe("'$__all'"); // Should quote special Grafana value
      });

      it('should handle $__all corner case with array value and options', () => {
        const query = 'SELECT * FROM table WHERE service IN ($service)';
        const variables = [{ 
          name: 'service', 
          current: { 
            text: ['$__all'], 
            value: ['$__all'] 
          }
        }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { 
          name: 'service', 
          multi: true, 
          includeAll: true,
          options: [
            { value: 'foo', text: 'foo', selected: false },
            { value: 'bar', text: 'bar', selected: false },
            { value: 'baz', text: 'baz', selected: false }
          ]
        };
        
        // When $__all is selected, any individual value should be treated as repeated
        const result = interpolateFn('foo', variable);
        expect(result).toBe("'foo'"); // Should be quoted as it's different from all options
      });

      it('should handle $__all corner case with string value and options', () => {
        const query = 'SELECT * FROM table WHERE service IN ($service)';
        const variables = [{ 
          name: 'service', 
          current: { 
            text: '$__all', 
            value: '$__all' 
          }
        }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { 
          name: 'service', 
          multi: true, 
          includeAll: true,
          options: [
            { value: 'foo', text: 'foo', selected: false },
            { value: 'bar', text: 'bar', selected: false },
            { value: 'baz', text: 'baz', selected: false }
          ]
        };
        
        // When $__all is selected, any individual value should be treated as repeated
        const result = interpolateFn('foo', variable);
        expect(result).toBe("'foo'"); // Should be quoted as it's different from all options
      });

      it('should handle $__all case when interpolated value matches all options', () => {
        const query = 'SELECT * FROM table WHERE service IN ($service)';
        const variables = [{ 
          name: 'service', 
          current: { 
            text: ['$__all'], 
            value: ['$__all'] 
          }
        }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { 
          name: 'service', 
          multi: true, 
          includeAll: true,
          options: [
            { value: 'foo', text: 'foo', selected: false },
            { value: 'bar', text: 'bar', selected: false }
          ]
        };
        
        // When the interpolated value equals all option values, it should not be repeated
        const result = interpolateFn(['foo', 'bar'], variable);
        expect(result).toBe("'foo','bar'"); // Should use normal array handling
      });

      it('should handle empty array values', () => {
        const query = 'SELECT * FROM table WHERE service IN ($service)';
        const variables = [{ name: 'service', current: { value: [] } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'service', multi: true, includeAll: false };
        const result = interpolateFn([], variable);
        expect(result).toBe(''); // Empty array should return empty string
      });

      it('should handle regex pattern variables', () => {
        const query = 'SELECT * FROM $table WHERE 1=1';
        const variables = [{ name: 'table', current: { value: '/^prefix_.*/' } }];
        const interpolateFn = interpolateQueryExprWithContext(query, variables);
        const variable = { name: 'table', multi: undefined, includeAll: undefined };
        const result = interpolateFn('/^prefix_.*/', variable);
        expect(result).toBe("'/^prefix_.*/'"); // Should quote regex patterns
      });
    });
  });

  describe('Array function vs IN clause detection (Issue #829)', () => {
    it('should format arrays WITH brackets for arrayIntersect', () => {
      const query = 'SELECT arrayIntersect($tags, col) FROM table';
      const variables = [{ name: 'tags', current: { value: ['k01', 'k02', 'k03'] } }];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);
      const variable = { name: 'tags', multi: true, includeAll: false, options: [{ value: 'k01' }] };
      const result = interpolateFn(['k01', 'k02', 'k03'], variable);
      expect(result).toBe("['k01', 'k02', 'k03']"); // WITH brackets
    });

    it('should format arrays WITH brackets for hasAny', () => {
      const query = 'SELECT * FROM table WHERE hasAny(tags, $var)';
      const variables = [{ name: 'var', current: { value: ['a', 'b'] } }];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);
      const variable = { name: 'var', multi: true, includeAll: false, options: [{ value: 'a' }] };
      const result = interpolateFn(['a', 'b'], variable);
      expect(result).toBe("['a', 'b']"); // WITH brackets
    });

    it('should format arrays WITHOUT brackets for IN clause', () => {
      const query = 'SELECT * FROM table WHERE name IN ($names)';
      const variables = [{ name: 'names', current: { value: ['alice', 'bob'] } }];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);
      const variable = { name: 'names', multi: true, includeAll: false, options: [{ value: 'alice' }] };
      const result = interpolateFn(['alice', 'bob'], variable);
      expect(result).toBe("'alice','bob'"); // WITHOUT brackets
    });

    it('should format arrays WITHOUT brackets for NOT IN clause', () => {
      const query = 'SELECT * FROM table WHERE name NOT IN ($names)';
      const variables = [{ name: 'names', current: { value: ['alice', 'bob'] } }];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);
      const variable = { name: 'names', multi: true, includeAll: false, options: [{ value: 'alice' }] };
      const result = interpolateFn(['alice', 'bob'], variable);
      expect(result).toBe("'alice','bob'"); // WITHOUT brackets
    });

    it('should format arrays WITHOUT brackets for GLOBAL IN clause', () => {
      const query = 'SELECT * FROM table WHERE name GLOBAL IN ($names)';
      const variables = [{ name: 'names', current: { value: ['alice', 'bob'] } }];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);
      const variable = { name: 'names', multi: true, includeAll: false, options: [{ value: 'alice' }] };
      const result = interpolateFn(['alice', 'bob'], variable);
      expect(result).toBe("'alice','bob'"); // WITHOUT brackets
    });

    it('should format arrays WITHOUT brackets for tuple', () => {
      const query = 'SELECT tuple($var) FROM table';
      const variables = [{ name: 'var', current: { value: ['a', 'b'] } }];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);
      const variable = { name: 'var', multi: true, includeAll: false, options: [{ value: 'a' }] };
      const result = interpolateFn(['a', 'b'], variable);
      expect(result).toBe("'a','b'"); // WITHOUT brackets
    });

    it('should handle mixed IN clause and array function in same query', () => {
      const query = 'SELECT * FROM table WHERE name IN ($names) AND arrayIntersect($tags, col) = []';
      const variables = [
        { name: 'names', current: { value: ['alice', 'bob'] } },
        { name: 'tags', current: { value: ['a', 'b'] } }
      ];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);
      const namesVar = { name: 'names', multi: true, includeAll: false, options: [{ value: 'alice' }] };
      const tagsVar = { name: 'tags', multi: true, includeAll: false, options: [{ value: 'a' }] };

      expect(interpolateFn(['alice', 'bob'], namesVar)).toBe("'alice','bob'"); // SQL IN format
      expect(interpolateFn(['a', 'b'], tagsVar)).toBe("['a', 'b']"); // Array format
    });

    it('should handle issue #829 exact scenario from PROD', () => {
      const query = `
        SELECT
          arrayIntersect($list_var, f_tags)[1] AS f_label,
          sum(f_bytes)
        FROM table
        WHERE hasAny($list_var, f_tags)
          AND f_host IN ($host_list)
      `;
      const variables = [
        { name: 'list_var', current: { value: ['k01', 'k02', 'k03'] } },
        { name: 'host_list', current: { value: ['h01', 'h02'] } }
      ];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);
      const listVar = { name: 'list_var', multi: true, includeAll: false, options: [{ value: 'k01' }] };
      const hostVar = { name: 'host_list', multi: true, includeAll: false, options: [{ value: 'h01' }] };

      // Array functions should get brackets
      expect(interpolateFn(['k01', 'k02', 'k03'], listVar)).toBe("['k01', 'k02', 'k03']");
      // IN clause should NOT get brackets
      expect(interpolateFn(['h01', 'h02'], hostVar)).toBe("'h01','h02'");
    });

    it('should work with PREWHERE IN clause', () => {
      const query = 'SELECT * FROM table PREWHERE name IN ($names)';
      const variables = [{ name: 'names', current: { value: ['alice', 'bob'] } }];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);
      const variable = { name: 'names', multi: true, includeAll: false, options: [{ value: 'alice' }] };
      const result = interpolateFn(['alice', 'bob'], variable);
      expect(result).toBe("'alice','bob'"); // WITHOUT brackets
    });

    it('should work with HAVING IN clause', () => {
      const query = 'SELECT count(*) FROM table GROUP BY name HAVING name IN ($names)';
      const variables = [{ name: 'names', current: { value: ['alice', 'bob'] } }];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);
      const variable = { name: 'names', multi: true, includeAll: false, options: [{ value: 'alice' }] };
      const result = interpolateFn(['alice', 'bob'], variable);
      expect(result).toBe("'alice','bob'"); // WITHOUT brackets
    });
  });

  describe('createContextAwareInterpolation wrapper', () => {
    it('should work with the wrapper function', () => {
      const query = 'SELECT * FROM $container.$namespace.svc';
      const variables = [{ name: 'container', current: { value: 'mycontainer' } }];
      const interpolateFn = createContextAwareInterpolation(query, variables);
      const variable = { name: 'container', multi: undefined, includeAll: undefined };
      const result = interpolateFn('mycontainer', variable);
      expect(result).toBe('mycontainer'); // No quotes for concatenation
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain original behavior for non-concatenation with multi=false, includeAll=false', () => {
      const query = 'SELECT * FROM table WHERE name = $test';
      const variables = [{ name: 'test', current: { value: 'testvalue' } }];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);
      const variable = { name: 'test', multi: false, includeAll: false };

      // Should behave exactly like original - no quotes for explicit single variables
      expect(interpolateFn('testvalue', variable)).toBe('testvalue');
      expect(interpolateQueryExpr('testvalue', variable)).toBe('testvalue');
    });

    it('should maintain original behavior for non-concatenation with multi=undefined, includeAll=undefined', () => {
      const query = 'SELECT * FROM table WHERE name = $test';
      const variables = [{ name: 'test', current: { value: 'testvalue' } }];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);
      const variable = { name: 'test', multi: undefined, includeAll: undefined };

      // Should behave exactly like original - quotes for repeated variables (issue #712)
      expect(interpolateFn('testvalue', variable)).toBe("'testvalue'");
      expect(interpolateQueryExpr('testvalue', variable)).toBe("'testvalue'");
    });

    it('should maintain original behavior for multi-value variables', () => {
      const query = 'SELECT * FROM table WHERE name IN ($test)';
      const variables = [{ name: 'test', current: { value: ['val1', 'val2'] } }];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);
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
      const concatVariables = [{ name: 'container', current: { value: 'myvalue' } }];
      const concatFn = interpolateQueryExprWithContext(concatenationQuery, concatVariables);
      expect(concatFn('myvalue', { name: 'container', multi: undefined, includeAll: undefined })).toBe('myvalue');

      // Non-concatenation context - OLD behavior preserved (fix for #712)
      const normalVariables = [{ name: 'test', current: { value: 'myvalue' } }];
      const normalFn = interpolateQueryExprWithContext(normalQuery, normalVariables);
      expect(normalFn('myvalue', variable)).toBe("'myvalue'");

      // Original function would always quote when multi/includeAll are undefined
      expect(interpolateQueryExpr('myvalue', variable)).toBe("'myvalue'");
    });
  });

  describe('Regression tests for specific issues', () => {
    it('should handle issue #797 - service host concatenation', () => {
      const query = "AND JSON_VALUE(message, '$.service.host') = '$container.$selectednamespace.8090.svc'";
      const variables = [
        { name: 'container', current: { value: 'transcription' } },
        { name: 'selectednamespace', current: { value: 'dev' } }
      ];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);

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

    it('should handle issue #797 - URL LIKE pattern with variable in string literal', () => {
      const query = "AND request_url LIKE 'https://${container}%'";
      const interpolateFn = interpolateQueryExprWithContext(query);

      const containerVar = { name: 'container', multi: undefined, includeAll: undefined };

      // Variable is inside a string literal, so it should NOT be quoted
      // This is the same fix as #827
      expect(interpolateFn('transcription', containerVar)).toBe('transcription');
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
      // For repeated panels, use different current value to trigger repeated behavior
      const variables = [{ name: 'Var', current: { value: 'original-value' } }];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);
      const variable = { name: 'Var', multi: undefined, includeAll: undefined };

      // Single value should be quoted (this is a repeated value since it differs from current)
      expect(interpolateFn('test-1', variable)).toBe("'test-1'");

      // Multiple values should be quoted and comma-separated
      const multiVar = { name: 'Var', multi: true, includeAll: false };
      expect(interpolateFn(['test-1', 'test-2'], multiVar)).toBe("'test-1','test-2'");
    });

    it('should fix issue #827 - double quotes in LIKE clause', () => {
      // The exact scenario from issue #827
      const query = "SELECT $timeSeries AS t, host, avg(usage_user) FROM $table WHERE host LIKE '${host_prefix}%'";
      const variables = [{ name: 'host_prefix', current: { value: 'telegraf-' } }];
      const interpolateFn = interpolateQueryExprWithContext(query, variables);
      const variable = { name: 'host_prefix', multi: undefined, includeAll: undefined };

      // Should NOT add quotes because it's already inside a string literal
      expect(interpolateFn('telegraf-', variable)).toBe('telegraf-');

      // The resulting query should be: WHERE host LIKE 'telegraf-%'
      // NOT: WHERE host LIKE ''telegraf-'%' (double quotes bug)
      const resultQuery = query.replace('${host_prefix}', 'telegraf-');
      expect(resultQuery).toContain("WHERE host LIKE 'telegraf-%'");
      expect(resultQuery).not.toContain("''telegraf-'");
    });
  });
});
