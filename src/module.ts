import { DataSourcePlugin } from '@grafana/data';
import { CHDataSource } from './datasource';
import { ConfigEditor } from './views/ConfigEditor';
import { QueryEditor } from './views/QueryEditor';
import { CHQuery, CHDataSourceOptions } from './types';

export const plugin = new DataSourcePlugin<CHDataSource, CHQuery, CHDataSourceOptions>(CHDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
