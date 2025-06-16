import { BackendSrv, getBackendSrv } from '@grafana/runtime';

export class ClickHouseResourceClient {
  private static instance: ClickHouseResourceClient;
  private datasourceUid = '';
  private backendSrv: BackendSrv;

  private constructor() {
    this.backendSrv = getBackendSrv();
  }

  static getInstance(): ClickHouseResourceClient {
    if (!ClickHouseResourceClient.instance) {
      ClickHouseResourceClient.instance = new ClickHouseResourceClient();
    }
    return ClickHouseResourceClient.instance;
  }

  setDatasourceUid(uid: string): void {
    this.datasourceUid = uid;
  }

  private async callResource(path: string, data: any): Promise<any> {
    if (!this.datasourceUid) {
      throw new Error('Datasource UID not set. Call setDatasourceUid() first.');
    }

    return new Promise((resolve, reject) => {
      this.backendSrv.fetch({
        url: `/api/datasources/uid/${this.datasourceUid}/resources/${path}`,
        method: 'POST',
        data: data,
      }).subscribe(
        (response) => {
          resolve(response.data);
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  async createQuery(queryData: any): Promise<any> {
    return this.callResource('createQuery', queryData);
  }

  async applyAdhocFilters(query: string, adhocFilters: any, target: any): Promise<string> {
    const response = await this.callResource('applyAdhocFilters', {
      query,
      adhocFilters,
      target
    });
    return response.query;
  }

  async getAstProperty(query: string, propertyName: string): Promise<any> {
    return this.callResource('getAstProperty', {
      query,
      propertyName
    });
  }

  async replaceTimeFilters(query: string, range: any, dateTimeType: string): Promise<string> {
    const response = await this.callResource('replaceTimeFilters', {
      query,
      timeRange: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      dateTimeType
    });
    return response.sql;
  }
}

export default ClickHouseResourceClient;
