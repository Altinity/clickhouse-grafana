import { DataSourcePlugin } from '@grafana/data';
import { CHDataSource } from './datasource/datasource';
import { ConfigEditor } from './views/ConfigEditor/ConfigEditor';
import { QueryEditorWithNotifications } from './views/QueryEditor/QueryEditorWithNotifications';
import { CHDataSourceOptions, CHQuery } from './types/types';

export const plugin = new DataSourcePlugin<CHDataSource, CHQuery, CHDataSourceOptions>(CHDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditorWithNotifications);
