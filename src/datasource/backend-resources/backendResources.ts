import { TimestampFormat } from '../../types/types';
import { CHDataSource } from '../datasource';
import { TimeRange } from '../datasource.types';

export class BackendResources {
  datasource: CHDataSource;

  constructor(datasource: CHDataSource) {
    this.datasource = datasource;
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
