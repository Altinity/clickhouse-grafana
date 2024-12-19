import './wasm_exec.js';
import pako from "pako"

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
      const res = window.applyAdhocFilters && window.applyAdhocFilters(query, adhocFilters, target);
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
      //ts-ignore
      const res =
        window.replaceTimeFilters &&
        window.replaceTimeFilters(
          query,
          {
            from: range.from.toISOString(), // Convert to Unix timestamp
            to: range.to.toISOString(), // Convert to Unix timestamp
          },
          dateTimeType
        );

      resolve(res.sql);
    });
  });
}

export const InitiateWasm = () => {
  if (window.replaceTimeFilters && window.createQuery && window.applyAdhocFilters && window.getAstProperty) {
    return Promise.resolve();
  }

  // Function to asynchronously load WebAssembly
  async function loadWasm(): Promise<void> {
    // Create a new Go object
    const response = await fetch('/public/plugins/vertamedia-clickhouse-datasource/static/backend.wasm.gz')

    // Check if the file is compressed with gzip (browser usually does this automatically)
    const compressedBuffer = await response.arrayBuffer();

    // Decompress the file using pako
    const decompressedBuffer = pako.ungzip(new Uint8Array(compressedBuffer));

    // ts-ignore
    const goWasm = new window.Go();
    const result = await WebAssembly.instantiate(
      // Fetch and instantiate the main.wasm file
      decompressedBuffer,
      // Provide the import object to Go for communication with JavaScript
      goWasm.importObject
    );
    // Run the Go program with the WebAssembly instance
    goWasm.run(result.instance);
  }

  return loadWasm();
};
