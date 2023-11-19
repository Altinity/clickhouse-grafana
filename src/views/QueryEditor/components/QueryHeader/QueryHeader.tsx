import React from 'react';
import {Button, RadioButtonGroup} from '@grafana/ui';
import {CHQuery, EditorMode} from '../../../../types/types';
import {SelectableValue} from '@grafana/data';
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
  onChange: (query: CHQuery) => void;
  onRunQuery: () => void;
}

export const QueryHeader = ({ query, onChange, onRunQuery }: QueryHeaderProps) => {
  const options: Array<SelectableValue<EditorMode>> = [
    { label: selectors.components.QueryEditor.EditorMode.options.QuerySettings, value: EditorMode.Builder },
    { label: selectors.components.QueryEditor.EditorMode.options.SQLEditor, value: EditorMode.SQL },
  ];
  let currentEditorMode: EditorMode = (typeof query.editorMode !== 'undefined' ) ? query.editorMode: (query.rawQuery ? EditorMode.SQL : EditorMode.Builder);
  const [currentEditorModeState, setEditorMode] = React.useState<EditorMode>(currentEditorMode)
  const onEditorModeChange = (editorMode: EditorMode) => {
    query.editorMode = editorMode
    setEditorMode(editorMode)
    onChange(query)
  }
  return (
    <>
      <RadioButtonGroup size="sm" options={options} value={currentEditorModeState} onChange={(e) => onEditorModeChange(e!)} />
      {/*<Button variant="primary" icon="play" size="sm" onClick={onRunQuery}>*/}
      {/*  Run query*/}
      {/*</Button>*/}
    </>
  )
}
