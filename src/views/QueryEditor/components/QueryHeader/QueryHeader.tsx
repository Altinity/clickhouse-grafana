import React from 'react';
import { RadioButtonGroup } from '@grafana/ui';
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
  query: CHQuery;
  editorMode: EditorMode;
  setEditorMode: (mode: any) => void;
}

export const QueryHeader = ({ editorMode, setEditorMode }: QueryHeaderProps) => {
  const options: Array<SelectableValue<EditorMode>> = [
    { label: selectors.components.QueryEditor.EditorMode.options.QuerySettings, value: EditorMode.Builder },
    { label: selectors.components.QueryEditor.EditorMode.options.SQLEditor, value: EditorMode.SQL },
  ];

  const onEditorModeChange = (editorMode: EditorMode) => {
    setEditorMode(editorMode);
  };
  return (
    <>
      <RadioButtonGroup
        size="sm"
        options={options}
        value={editorMode}
        onChange={(e: EditorMode) => onEditorModeChange(e!)}
      />
    </>
  );
};
