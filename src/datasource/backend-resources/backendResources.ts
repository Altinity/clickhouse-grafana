import { TimestampFormat } from '../../types/types';
import { CHDataSource } from '../datasource';
import { TimeRange } from '../datasource.types';

export class BackendResources {
  datasource: CHDataSource;

  constructor(datasource: CHDataSource) {
    this.datasource = datasource;
  }

  async replaceTimeFilters(query: string, range: TimeRange, dateTimeType = TimestampFormat.DateTime): Promise<string> {
    const result: any = await this.datasource.postResource('replace-time-filters', {
      query: query,
      timeRange: {
        from: range.from.toISOString(), // Convert to Unix timestamp
        to: range.to.toISOString(), // Convert to Unix timestamp
      },
      dateTimeType: dateTimeType,
    });

    return result.sql;
  }

  async applyAdhocFilters(query: string, adhocFilters: any[], target: any): Promise<string> {
    if (!adhocFilters || adhocFilters.length === 0) {
      return query;
    }

    const result: any = await this.datasource.postResource('apply-adhoc-filters', {
      query: query,
      adhocFilters: adhocFilters,
      target: target,
    });

    return result.query;
  }

  async getPropertyFromAST(query, propertyName) {
    const result: any = await this.datasource.postResource('get-ast-property', {
      query: query,
      propertyName: propertyName,
    });

    if (result && result.properties) {
      return result.properties;
    }

    return [];
  }
}
