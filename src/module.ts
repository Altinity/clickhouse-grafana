import { DataSourcePlugin } from '@grafana/data';
import { CHDataSource } from './datasource/datasource';
import { ConfigEditor } from './views/ConfigEditor/ConfigEditor';
import { QueryEditor } from './views/QueryEditor/QueryEditor';
import { CHDataSourceOptions, CHQuery } from './types/types';
import './wasm_exec.js';  // Import the wasm_exec.js file for Go-Wasm compatibility

export const plugin = new DataSourcePlugin<CHDataSource, CHQuery, CHDataSourceOptions>(CHDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
