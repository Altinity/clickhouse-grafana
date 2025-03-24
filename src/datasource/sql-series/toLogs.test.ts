import { toLogs, transformObject } from './toLogs';
import {DataFrameType } from '@grafana/data';

describe('transformObject', () => {
  it('should flatten first-level nested objects with quoted key notation', () => {
    const input = {
      _map: { test: 123, foo: 'bar' },
      regular: 'value',
      array: [1, 2, 3]
    };

    const result = transformObject(input);

    expect(result).toEqual({
      "_map['test']": 123,
      "_map['foo']": 'bar',
      regular: 'value',
      array: '[1,2,3]'
    });
  });

  it('should handle deeper nested objects by stringifying them', () => {
    const input = {
      _metadata: { 
        user: { 
          id: 1, 
          name: 'John' 
        },
        settings: {
          theme: 'dark'
        }
      }
    };

    const result = transformObject(input);

    expect(result).toEqual({
      "_metadata['user']": '{"id":1,"name":"John"}',
      "_metadata['settings']": '{"theme":"dark"}'
    });
  });

  it('should handle arrays as values by stringifying them', () => {
    const input = {
      tags: ['error', 'critical', 'production'],
      simple: 'value'
    };

    const result = transformObject(input);

    expect(result).toEqual({
      tags: '["error","critical","production"]',
      simple: 'value'
    });
  });

  it('should handle null values correctly', () => {
    const input = {
      nullValue: null,
      undefinedValue: undefined,
      validValue: 'test'
    };

    const result = transformObject(input);

    expect(result).toEqual({
      nullValue: null,
      undefinedValue: undefined,
      validValue: 'test'
    });
  });

  it('should handle primitive input by returning it unchanged', () => {
    expect(transformObject('string')).toBe('string');
    expect(transformObject(123)).toBe(123);
    expect(transformObject(null)).toBe(null);
    expect(transformObject(undefined)).toBe(undefined);
  });
});

describe('toLogs', () => {
  it('should return empty array when series is empty', () => {
    const input = {
      series: [],
      meta: []
    };

    const result = toLogs(input);
    expect(result).toEqual([]);
  });

  it('should transform data into logs format with flattened nested objects', () => {
    const input = {
      series: [
        {
          timestamp: '2023-01-01 10:00:00',
          content: 'Log message 1',
          level: 'error',
          metadata: { source: 'server1', context: { requestId: 'abc123' } }
        },
        {
          timestamp: '2023-01-01 10:01:00',
          content: 'Log message 2',
          level: 'warning',
          metadata: { source: 'server2', context: { requestId: 'def456' } }
        }
      ],
      meta: [
        { name: 'timestamp', type: 'DateTime' },
        { name: 'content', type: 'String' },
        { name: 'level', type: 'String' },
        { name: 'metadata', type: 'Object' }
      ],
      refId: 'A'
    };

    const result = toLogs(input);

    // Check that we get a dataframe array with one item
    expect(result.length).toBe(1);
    
    // Check meta information
    expect(result[0].meta).toEqual({
      type: DataFrameType.LogLines,
      preferredVisualisationType: 'logs'
    });

    // Check that we have proper field structure
    const fields = result[0].fields;
    expect(fields.filter(f => f.name === 'timestamp').length).toBe(1);
    expect(fields.filter(f => f.name === 'body').length).toBe(1);
    expect(fields.filter(f => f.name === 'severity').length).toBe(1);
    expect(fields.filter(f => f.name === 'labels').length).toBe(1);
    
    // Verify that labels contain our flattened objects
    const labelsField = fields.find(f => f.name === 'labels');
    expect(labelsField).toBeDefined();
    if (labelsField && labelsField.values) {
      expect(labelsField.values.length).toBe(2);
      // Check that nested objects were flattened properly
      const firstRowLabels = labelsField.values[0];
      expect(Object.keys(firstRowLabels)).toContain("metadata['source']");
      expect(Object.keys(firstRowLabels)).toContain("metadata['context']");
      expect(firstRowLabels["metadata['source']"]).toBe('server1');
    }
  });

  it('should handle complex nested objects in label fields', () => {
    const input = {
      series: [
        {
          timestamp: '2023-01-01 10:00:00',
          message: 'Error occurred',
          complex_data: { 
            error: { code: 500, message: 'Internal error' },
            performance: { cpu: 80, memory: "1.2GB" }
          }
        }
      ],
      meta: [
        { name: 'timestamp', type: 'DateTime' },
        { name: 'message', type: 'String' },
        { name: 'complex_data', type: 'Object' }
      ],
      refId: 'B'
    };

    const result = toLogs(input);
    
    // Verify results
    expect(result.length).toBe(1);
    
    // Check the labels field contains our flattened objects
    const labelsField = result[0].fields.find(f => f.name === 'labels');
    expect(labelsField).toBeDefined();
    
    if (labelsField && labelsField.values && labelsField.values.length > 0) {
      const labels = labelsField.values[0];
      
      // Check that first-level objects are extracted with quoted key notation
      expect(Object.keys(labels)).toContain("complex_data['error']");
      expect(Object.keys(labels)).toContain("complex_data['performance']");
      
      // Check that deeper objects are stringified
      expect(labels["complex_data['error']"]).toBe('{"code":500,"message":"Internal error"}');
      expect(labels["complex_data['performance']"]).toBe('{"cpu":80,"memory":"1.2GB"}');
    }
  });
}); 