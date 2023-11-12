import { DataSourcePlugin } from '@grafana/data';
import { CHDataSource } from './datasource/datasource';
import { ConfigEditor } from './views/ConfigEditor/ConfigEditor';
import { QueryEditor } from './views/QueryEditor/QueryEditor';
import { CHQuery, CHDataSourceOptions } from './types/types';

export const plugin = new DataSourcePlugin<CHDataSource, CHQuery, CHDataSourceOptions>(CHDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
