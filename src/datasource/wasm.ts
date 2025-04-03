import './wasm_exec';
import pako from 'pako';

declare global {
  export interface Window {
    Go: any;
    getAstProperty?: (query: string, propertyName: string) => Promise<any>;
    createQuery?: (any) => Promise<any>;
    replaceTimeFilters: any;
    applyAdhocFilters: any;
  }
}

export class ClickHouseWasm {
  private static instance: ClickHouseWasm;
  private initialized = false;
  private pluginId: string;

  private constructor(pluginId: string) {
    this.pluginId = pluginId
  }

  static getInstance(pluginId: string): ClickHouseWasm {
    if (!ClickHouseWasm.instance) {
      ClickHouseWasm.instance = new ClickHouseWasm(pluginId);
    }
    return ClickHouseWasm.instance;
  }

  async initialize(pluginId: string): Promise<void> {
    if (this.initialized || (window.replaceTimeFilters && window.createQuery && 
        window.applyAdhocFilters && window.getAstProperty)) {
      return;
    }

    const go = new window.Go();
    const compressedBuffer = await fetch(`/public/plugins/${pluginId}/static/backend.wasm.gz`)
      .then(resp => resp.arrayBuffer());

    const fetchedData = pako.ungzip(new Uint8Array(compressedBuffer));
    const obj = await WebAssembly.instantiate(fetchedData, go.importObject);
    go.run(obj.instance);
    this.initialized = true;
  }

  async createQuery(queryData: any): Promise<any> {
    console.log(queryData)
    await this.ensureInitialized();
    return window.createQuery?.(queryData);
  }

  async applyAdhocFilters(query: string, adhocFilters: any, target: any): Promise<string> {
    await this.ensureInitialized();
    const res = await window.applyAdhocFilters?.({
      query,
      adhocFilters,
      target
    });
    return res.query;
  }

  async getAstProperty(query: string, propertyName: string): Promise<any> {
    await this.ensureInitialized();
    return window.getAstProperty?.(query, propertyName);
  }

  async replaceTimeFilters(query: string, range: any, dateTimeType: string): Promise<string> {
    await this.ensureInitialized();
    const res = await window.replaceTimeFilters?.({
      query,
      timeRange: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      dateTimeType
    });
    return res.sql;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize(this.pluginId);
    }
  }
}

export default ClickHouseWasm;
