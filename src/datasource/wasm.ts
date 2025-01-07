import './wasm_exec.js';
import pako from 'pako';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  export interface Window {
    Go: any;
    wasmFibonacciSum: (n: number) => number;
    getAstProperty?: (query: string, propertyName: string) => Promise<any>;
    createQuery?: (any) => Promise<any>;
    replaceTimeFilters: any;
    applyAdhocFilters: any;
  }
}
export {};

export function createQuery(queryData) {
  return new Promise<any>((resolve) => {
    InitiateWasm().then(() => {
      const res = window.createQuery && window.createQuery(queryData);
      resolve(res);
    });
  });
}

export function applyAdhocFilters(query, adhocFilters, target) {
  return new Promise<any>((resolve) => {
    InitiateWasm().then(() => {
      const res = window.applyAdhocFilters && window.applyAdhocFilters({
        query, adhocFilters, target
      });
      resolve(res.query);
    });
  });
}

export function getAstProperty(query, propertyName) {
  return new Promise<any>((resolve) => {
    //ts-ignore
    const res = window.getAstProperty && window.getAstProperty(query, propertyName);
    resolve(res);
  });
}

export function replaceTimeFilters(query, range, dateTimeType) {
  return new Promise<any>((resolve) => {
    InitiateWasm().then(() => {
      setTimeout(() => {
        //ts-ignore
        const res =
          window.replaceTimeFilters &&
          window.replaceTimeFilters({ query,
              timeRange: {
                from: range.from.toISOString(), // Convert to Unix timestamp
                to: range.to.toISOString(), // Convert to Unix timestamp
              },
              dateTimeType:  dateTimeType });

        resolve(res.sql);
      }, 100)
    })
  });
}

export const InitiateWasm = () => {
  if (window.replaceTimeFilters && window.createQuery && window.applyAdhocFilters && window.getAstProperty) {
    return Promise.resolve();
  }

  // Function to asynchronously load WebAssembly
  async function loadWasm(): Promise<void> {
    // Create a new Go object
    const go = new window.Go(); // Defined in wasm_exec.js

    let wasm;

    const compressedBuffer = await fetch('/public/plugins/vertamedia-clickhouse-datasource/static/backend.wasm.gz').then(resp =>
      resp.arrayBuffer()
    )

    const fetchedData = pako.ungzip(new Uint8Array(compressedBuffer));

    WebAssembly.instantiate(fetchedData, go.importObject).then(function (obj) {
      wasm = obj.instance;
      go.run(wasm)
    })

  }

  return loadWasm();
}
