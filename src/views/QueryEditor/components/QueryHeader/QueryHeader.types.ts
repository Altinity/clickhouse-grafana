import { CHQuery, EditorMode } from '../../../../types/types';
import { CHDataSource } from '../../../../datasource/datasource';

export interface QueryHeaderProps {
  isAnnotationView: boolean;
  query: CHQuery;
  editorMode: EditorMode;
  setEditorMode: (mode: any) => void;
  onTriggerQuery: () => void;
  datasource: CHDataSource;
  onChange: any;
}
