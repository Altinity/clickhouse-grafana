import './wasm_exec.js';

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

export function createQueryHandler(queryData) {
  return new Promise<any>((resolve) => {
    console.log('Starting create query calculation...');

    // Call the wasmFibonacciSum function from Go
    //ts-ignore
    const res = window.createQuery && window.createQuery(queryData);
    console.log('DONE get ast calculation...', res);

    resolve(res);
  });
}

export function handleApplyAdhocFilters(...parameters) {
  return new Promise<any>((resolve) => {
    console.log('Starting handleApplyAdhocFilters calculation...');

    // Call the wasmFibonacciSum function from Go
    //ts-ignore
    const res = window.applyAdhocFilters && window.applyAdhocFilters(...parameters);
    console.log('DONE handleApplyAdhocFilters calculation...', res);

    resolve(res);
  });
}

export function getAstProperty(query, propertyName) {
  return new Promise<any>((resolve) => {
    console.log('Starting getAstProperty calculation...');

    //ts-ignore
    const res = window.getAstProperty && window.getAstProperty(query, propertyName);
    console.log('DONE getAstProperty calculation...', res);

    resolve(res);
  });
}

export function replaceTimeFilters(query, range, dateTimeType) {
  return new Promise<any>((resolve) => {
    console.log('Starting replaceTimeFilters calculation...');

    // Call the wasmFibonacciSum function from Go
    //ts-ignore
    const res = window.replaceTimeFilters && window.replaceTimeFilters(
      query,
      {
        from: range.from.toISOString(), // Convert to Unix timestamp
        to: range.to.toISOString(), // Convert to Unix timestamp
      },
      dateTimeType,
    );
    console.log('DONE replaceTimeFilters calculation...', res);

    resolve(res);
  });
}

export const InitiateWasm = () => {
  if (window.replaceTimeFilters && window.createQuery && window.applyAdhocFilters && window.getAstProperty) {
    return Promise.resolve()
  }

  // Function to asynchronously load WebAssembly
  async function loadWasm(): Promise<void> {
    // Create a new Go object
    // ts-ignore
    const goWasm = new window.Go();
    const result = await WebAssembly.instantiateStreaming(
      // Fetch and instantiate the main.wasm file
      fetch('/public/plugins/vertamedia-clickhouse-datasource/static/backend.wasm'),
      // Provide the import object to Go for communication with JavaScript
      goWasm.importObject
    );
    // Run the Go program with the WebAssembly instance
    goWasm.run(result.instance);
  }

  return loadWasm();
};
