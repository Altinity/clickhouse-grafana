import { TimestampFormat } from '../../types/types';
import { CHDataSource } from '../datasource';
import { TimeRange } from '../datasource.types';
import {SimpleCache} from "../helpers/PersistentCache";

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


    const requestParameters = {
      query: query,
      adhocFilters: adhocFilters,
      target: {
        database: target.database,
        table: target.table,
      },
    };

    // const userCache = new PersistentCacheManager<string, any, any>(
    //   "apply-adhoc-filters", // Key in sessionStorage
    //   (parameters) => JSON.stringify(parameters) // Function to extract unique identifier
    // );
    //
    // console.log('pre cache', userCache.cache)
    // const cachedResult = await userCache.get(requestParameters);
    // await userCache.set(requestParameters, {'test': 'test'});
    //
    // const cachedResult2 = await userCache.get(requestParameters);
    //
    // console.log('Cached result', cachedResult, cachedResult2)
    const cache = new SimpleCache();

    const cachedResult = cache.get('apply-adhoc-filters', requestParameters);

    if (cachedResult) {
      return cachedResult.query;
    }

    const result: any = await this.datasource.postResource('apply-adhoc-filters', requestParameters);

    cache.set('apply-adhoc-filters', requestParameters, result);
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
