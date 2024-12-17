import './wasm_exec.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  export interface Window {
    Go: any;
    wasmFibonacciSum: (n: number) => number;
    getAstProperty: (query: string, propertyName: string) => Promise<any>;
  }
}
export {};

export function handleGetAstProperty() {
  return new Promise<number>((resolve) => {
    console.log('Starting get ast calculation...');

    // Call the wasmFibonacciSum function from Go
    //ts-ignore
    const res = window.getAstProperty('123', 'select');
    console.log('DONE get ast calculation...', res);

    resolve(res);
  });
}

export const InitiateWasm = () => {
// Function to asynchronously load WebAssembly
  async function loadWasm(): Promise<void> {
    // Create a new Go object
    // ts-ignore
    const goWasm = new window.Go();
    const result = await WebAssembly.instantiateStreaming(
      // Fetch and instantiate the main.wasm file
      fetch('/public/plugins/vertamedia-clickhouse-datasource/static/ast_property2.wasm'),
      // Provide the import object to Go for communication with JavaScript
      goWasm.importObject
    );
    // Run the Go program with the WebAssembly instance
    goWasm.run(result.instance);
  }

  return loadWasm();
};
