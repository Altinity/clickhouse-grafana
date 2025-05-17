declare global {
  export interface Window {
    createQuery: (data: any) => Promise<any>;
    applyAdhocFilters: (data: any) => Promise<any>;
    getAstProperty: (query: string, propertyName: string) => Promise<any>;
    replaceTimeFilters: (data: any) => Promise<any>;
  }
}

export class ClickHouseGopherJS {
  private static instance: ClickHouseGopherJS;
  private pluginId: string;

  private constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  static getInstance(pluginId: string): ClickHouseGopherJS {
    if (!ClickHouseGopherJS.instance) {
      ClickHouseGopherJS.instance = new ClickHouseGopherJS(pluginId);
    }
    return ClickHouseGopherJS.instance;
  }

  private async ensureInitialized(): Promise<void> {
    // No-op for GopherJS version
    return;
  }

  async createQuery(queryData: any): Promise<any> {
    await this.ensureInitialized();
    return window.createQuery(queryData);
  }

  async applyAdhocFilters(query: string, adhocFilters: any, target: any): Promise<string> {
    await this.ensureInitialized();
    const res = await window.applyAdhocFilters({
      query,
      adhocFilters,
      target
    });
    return res.query;
  }

  async getAstProperty(query: string, propertyName: string): Promise<any> {
    await this.ensureInitialized();
    return window.getAstProperty(query, propertyName);
  }

  async replaceTimeFilters(query: string, range: any, dateTimeType: string): Promise<string> {
    await this.ensureInitialized();
    const res = await window.replaceTimeFilters({
      query,
      timeRange: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      dateTimeType
    });
    return res.sql;
  }
}

export default ClickHouseGopherJS;
