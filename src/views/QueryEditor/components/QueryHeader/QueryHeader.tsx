import React from 'react';
import {Button, RadioButtonGroup} from '@grafana/ui';
import { CHQuery, EditorMode } from '../../../../types/types';
import { SelectableValue } from '@grafana/data';
import { E2ESelectors } from '@grafana/e2e-selectors';

export const Components = {
  QueryEditor: {
    EditorMode: {
      options: {
        QuerySettings: 'Query Settings',
        SQLEditor: 'SQL Editor',
      },
    },
  },
};

export const selectors: { components: E2ESelectors<typeof Components> } = {
  components: Components,
};
interface QueryHeaderProps {
  isAnnotationView: boolean;
  query: CHQuery;
  editorMode: EditorMode;
  setEditorMode: (mode: any) => void;
  onTriggerQuery: () => void;
}

export const QueryHeader = ({ editorMode, setEditorMode,isAnnotationView, onTriggerQuery }: QueryHeaderProps) => {
  const options: Array<SelectableValue<EditorMode>> = [
    { label: selectors.components.QueryEditor.EditorMode.options.QuerySettings, value: EditorMode.Builder },
    { label: selectors.components.QueryEditor.EditorMode.options.SQLEditor, value: EditorMode.SQL },
  ];

  const onEditorModeChange = (editorMode: EditorMode) => {
    setEditorMode(editorMode);
  };
  return (
    <div style={{display: "flex"}}>
      <RadioButtonGroup
        size="sm"
        options={options}
        value={editorMode}
        onChange={(e: EditorMode) => onEditorModeChange(e!)}
      />
      { (editorMode === EditorMode.SQL && !isAnnotationView) ? <Button variant="primary" icon="play" size={'sm'} style={{marginLeft: '10px'}} onClick={onTriggerQuery}>
        Run Query
      </Button> : null }
      { editorMode === EditorMode.Builder ? <Button variant="primary" size={'sm'} icon="arrow-right"  style={{marginLeft: '10px'}} onClick={() => setEditorMode(EditorMode.SQL)} >
        Go to Query
      </Button>: null }
    </div>
  );
};
