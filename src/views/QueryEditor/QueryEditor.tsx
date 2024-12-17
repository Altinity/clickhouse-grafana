import React, { useEffect, useState } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { CHDataSource } from '../../datasource/datasource';
import { CHDataSourceOptions, CHQuery, EditorMode } from '../../types/types';
import { QueryHeader } from './components/QueryHeader/QueryHeader';
import { QueryTextEditor } from './components/QueryTextEditor/QueryTextEditor';
import { QueryBuilder } from './components/QueryBuilder/QueryBuilder';
import { Alert } from '@grafana/ui';
import { useQueryState } from './hooks/useQueryState';
import { useFormattedData } from './hooks/useFormattedData';
import { initializeQueryDefaults } from './helpers/initializeQueryDefaults';
import './QueryEditor.css';
import { getAdhocFilters } from './helpers/getAdHocFilters';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  export interface Window {
    Go: any;
    wasmFibonacciSum: (n: number) => number;
  }
}
export {};

function wasmFibonacciSum(n: number) {
  return new Promise<number>((resolve) => {
    // Call the wasmFibonacciSum function from Go
    //ts-ignore
    const res = window.wasmFibonacciSum(n);
    resolve(res);
  });
}

export function QueryEditor(props: QueryEditorProps<CHDataSource, CHQuery, CHDataSourceOptions>) {

  const [isWasmLoaded, setIsWasmLoaded] = useState(false);
  const [wasmResult, setWasmResult] = useState<number | null>(null);

  // useEffect hook to load WebAssembly when the component mounts
  useEffect(() => {
    // Function to asynchronously load WebAssembly
    async function loadWasm(): Promise<void> {
      // Create a new Go object
      // ts-ignore
      const goWasm = new window.Go();
      const result = await WebAssembly.instantiateStreaming(
        // Fetch and instantiate the main.wasm file
        fetch('/public/plugins/vertamedia-clickhouse-datasource/static/main.wasm'),
        // Provide the import object to Go for communication with JavaScript
        goWasm.importObject
      );
      // Run the Go program with the WebAssembly instance
      goWasm.run(result.instance);
      setIsWasmLoaded(true);
    }

    loadWasm();
  }, []);

  // Function to handle button click and initiate WebAssembly calculation
  const handleClickButton = async () => {
    const n = 10;  // Choose a value for n

    console.log('Starting WebAssembly calculation...');
    const wasmStartTime = performance.now();

    try {
      // Call the wasmFibonacciSum function asynchronously
      const result = await wasmFibonacciSum(n);
      setWasmResult(result);
      console.log('WebAssembly Result:', result);
    } catch (error) {
      console.error('WebAssembly Error:', error);
    }

    const wasmEndTime = performance.now();
    console.log(`WebAssembly Calculation Time: ${wasmEndTime - wasmStartTime} milliseconds`);
  };


  const { datasource, query, onChange, onRunQuery } = props;
  const isAnnotationView = !props.app;
  const initializedQuery = initializeQueryDefaults(query, isAnnotationView, datasource, onChange);
  const [formattedData, error] = useFormattedData(initializedQuery, datasource);
  const [editorMode, setEditorMode] = useState(initializedQuery.editorMode || EditorMode.Builder);
  useQueryState(query, onChange, datasource);

  const onSqlChange = (sql: string) => onChange({ ...initializedQuery, query: sql });
  const onFieldChange = (field: any) => onChange({ ...initializedQuery, [field.fieldName]: field.value });
  const onTriggerQuery = () => onRunQuery();

  // @ts-ignore
  const adHocFilters = getAdhocFilters(datasource?.name, query.datasource?.uid);
  // @ts-ignore
  const adHocFiltersKey = adHocFilters.map(({ key, operator, value }) => `${key}${operator}${value}`).join(',');
  const areAdHocFiltersAvailable = !!adHocFilters.length;

  useEffect(() => {
    if (props.app !== 'explore') {
      onChange({ ...initializedQuery, adHocFilters: adHocFilters });
    }

    // eslint-disable-next-line
  }, [props.app, adHocFiltersKey]);

  return (
    <>
      {isWasmLoaded && <p>Wasm Loaded</p>}
      {!isWasmLoaded && <p>Wasm not Loaded</p>}

      <button onClick={handleClickButton}>Handle Click Wasm</button>
      {wasmResult !== null && (
        <div>
          <p>WebAssembly Result: {wasmResult}</p>
        </div>
      )}
      <QueryHeader
        query={initializedQuery}
        datasource={datasource}
        editorMode={editorMode}
        setEditorMode={setEditorMode}
        isAnnotationView={isAnnotationView}
        onTriggerQuery={onTriggerQuery}
        onChange={onChange}
      />
      {error ? <Alert title={error} elevated style={{ marginTop: '5px', marginBottom: '5px' }} /> : null}
      {editorMode === EditorMode.Builder && (
        <QueryBuilder
          query={initializedQuery}
          datasource={datasource}
          onChange={(items: CHQuery) => onChange({ ...items })}
          onRunQuery={onTriggerQuery}
        />
      )}
      {editorMode === EditorMode.SQL && (
        <QueryTextEditor
          adhocFilters={initializedQuery.adHocFilters}
          areAdHocFiltersAvailable={areAdHocFiltersAvailable}
          query={initializedQuery}
          onSqlChange={onSqlChange}
          onRunQuery={onTriggerQuery}
          onFieldChange={onFieldChange}
          formattedData={formattedData}
          datasource={datasource}
          isAnnotationView={isAnnotationView}
        />
      )}
    </>
  );
}
