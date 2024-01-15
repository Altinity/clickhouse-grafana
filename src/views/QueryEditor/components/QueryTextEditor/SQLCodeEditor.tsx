import React from 'react';
import MonacoEditor from 'react-monaco-editor';
import {LANGUAGE_ID, THEME_NAME} from "./editor/initiateEditor";
import {editor} from "monaco-editor";
import IStandaloneEditorConstructionOptions = editor.IStandaloneEditorConstructionOptions;
export const SQLCodeEditor = ({ query, onSqlChange, onRunQuery }: any) => {
  const options: IStandaloneEditorConstructionOptions = {
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    wrappingStrategy: 'advanced',
    scrollbar: {
      alwaysConsumeMouseWheel: false
    },
    minimap: {
      enabled: false
    },
    overviewRulerLanes: 0
  }


  return (
    <div style={{ position: 'relative', width: '100%', marginTop: '10px'}}  onBlur={onRunQuery}>
      <MonacoEditor
        height={Math.max(query.query.split('\n').length * 18, 150)}
        language={LANGUAGE_ID}
        theme={THEME_NAME}
        value={query.query}
        options={options}
        onChange={onSqlChange}
      />
    </div>
  );
};
