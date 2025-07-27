import { getAdhocFilters } from './getAdHocFilters';

// Mock Grafana runtime
const mockTemplateSrv = {
  getVariables: jest.fn(),
  replace: jest.fn(),
};

jest.mock('@grafana/runtime', () => ({
  getTemplateSrv: () => mockTemplateSrv,
}));

describe('getAdhocFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Direct datasource UIDs', () => {
    it('should return filters for matching direct UID', () => {
      const variables = [
        {
          name: 'query0',
          type: 'adhoc',
          datasource: {
            type: 'vertamedia-clickhouse-datasource',
            uid: 'ClickHouse'
          },
          filters: [
            { key: 'status', value: 'active', operator: '=' }
          ]
        }
      ];

      mockTemplateSrv.getVariables.mockReturnValue(variables);

      const result = getAdhocFilters('datasourceName', 'ClickHouse');

      expect(result).toEqual([
        { key: 'status', value: 'active', operator: '=' }
      ]);
    });

    it('should skip filters for non-matching direct UID', () => {
      const variables = [
        {
          name: 'query0',
          type: 'adhoc',
          datasource: {
            type: 'vertamedia-clickhouse-datasource',
            uid: 'OtherDataSource'
          },
          filters: [
            { key: 'status', value: 'active', operator: '=' }
          ]
        }
      ];

      mockTemplateSrv.getVariables.mockReturnValue(variables);

      const result = getAdhocFilters('datasourceName', 'ClickHouse');

      expect(result).toEqual([]);
    });
  });

  describe('Variable datasource UIDs (Issue #805)', () => {
    it('should resolve variable UID and return filters when matching', () => {
      const variables = [
        {
          name: 'query1',
          type: 'datasource',
          current: {
            value: 'P788589A3A7614F2B',
            text: 'clickhouse-direct'
          }
        },
        {
          name: 'query2',
          type: 'adhoc',
          datasource: {
            uid: '${query1}',
            type: 'vertamedia-clickhouse-datasource'
          },
          filters: [
            { key: 'attributes', value: '123', operator: '!=' }
          ]
        }
      ];

      mockTemplateSrv.getVariables.mockReturnValue(variables);
      mockTemplateSrv.replace.mockReturnValue('P788589A3A7614F2B');

      const result = getAdhocFilters('datasourceName', 'P788589A3A7614F2B');

      expect(mockTemplateSrv.replace).toHaveBeenCalledWith('${query1}');
      expect(result).toEqual([
        { key: 'attributes', value: '123', operator: '!=' }
      ]);
    });

    it('should handle variable resolution failure gracefully', () => {
      const variables = [
        {
          name: 'query2',
          type: 'adhoc',
          datasource: {
            uid: '${nonexistent}',
            type: 'vertamedia-clickhouse-datasource'
          },
          filters: [
            { key: 'attributes', value: '123', operator: '!=' }
          ]
        }
      ];

      mockTemplateSrv.getVariables.mockReturnValue(variables);
      mockTemplateSrv.replace.mockImplementation(() => {
        throw new Error('Variable not found');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = getAdhocFilters('datasourceName', 'P788589A3A7614F2B');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to resolve datasource variable:',
        '${nonexistent}',
        expect.any(Error)
      );
      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should not attempt resolution for UIDs without variables', () => {
      const variables = [
        {
          name: 'query0',
          type: 'adhoc',
          datasource: {
            uid: 'DirectUID',
            type: 'vertamedia-clickhouse-datasource'
          },
          filters: [
            { key: 'status', value: 'active', operator: '=' }
          ]
        }
      ];

      mockTemplateSrv.getVariables.mockReturnValue(variables);

      const result = getAdhocFilters('datasourceName', 'DirectUID');

      expect(mockTemplateSrv.replace).not.toHaveBeenCalled();
      expect(result).toEqual([
        { key: 'status', value: 'active', operator: '=' }
      ]);
    });
  });

  describe('Edge cases', () => {
    it('should skip variables without datasource', () => {
      const variables = [
        {
          name: 'query0',
          type: 'adhoc',
          datasource: null,
          filters: [
            { key: 'status', value: 'active', operator: '=' }
          ]
        }
      ];

      mockTemplateSrv.getVariables.mockReturnValue(variables);

      const result = getAdhocFilters('datasourceName', 'ClickHouse');

      expect(result).toEqual([]);
    });

    it('should skip variables without datasource UID', () => {
      const variables = [
        {
          name: 'query0',
          type: 'adhoc',
          datasource: {
            type: 'vertamedia-clickhouse-datasource'
            // uid is missing
          },
          filters: [
            { key: 'status', value: 'active', operator: '=' }
          ]
        }
      ];

      mockTemplateSrv.getVariables.mockReturnValue(variables);

      const result = getAdhocFilters('datasourceName', 'ClickHouse');

      expect(result).toEqual([]);
    });

    it('should combine filters from multiple matching variables', () => {
      const variables = [
        {
          name: 'query0',
          type: 'adhoc',
          datasource: {
            uid: 'ClickHouse',
            type: 'vertamedia-clickhouse-datasource'
          },
          filters: [
            { key: 'status', value: 'active', operator: '=' }
          ]
        },
        {
          name: 'query2',
          type: 'adhoc',
          datasource: {
            uid: '${query1}',
            type: 'vertamedia-clickhouse-datasource'
          },
          filters: [
            { key: 'role', value: 'admin', operator: '=' }
          ]
        }
      ];

      mockTemplateSrv.getVariables.mockReturnValue(variables);
      mockTemplateSrv.replace.mockReturnValue('ClickHouse');

      const result = getAdhocFilters('datasourceName', 'ClickHouse');

      expect(result).toEqual([
        { key: 'status', value: 'active', operator: '=' },
        { key: 'role', value: 'admin', operator: '=' }
      ]);
    });

    it('should handle empty filters array', () => {
      const variables = [
        {
          name: 'query0',
          type: 'adhoc',
          datasource: {
            uid: 'ClickHouse',
            type: 'vertamedia-clickhouse-datasource'
          },
          filters: []
        }
      ];

      mockTemplateSrv.getVariables.mockReturnValue(variables);

      const result = getAdhocFilters('datasourceName', 'ClickHouse');

      expect(result).toEqual([]);
    });
  });
});
