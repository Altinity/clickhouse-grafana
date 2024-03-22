import React from 'react';
import {initiateEditor, LANGUAGE_ID, THEME_NAME} from "./editor/initiateEditor";
import {CodeEditor} from "@grafana/ui";

export const SQLCodeEditor = ({ query, onSqlChange, onRunQuery, datasource }: any) => {
  const options: any = {
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
    <div style={{ position: 'relative', width: '100%', marginTop: '10px'}} >
      <CodeEditor
        height={Math.max(query.query.split('\n').length * 18, 150)}
        value={query.query}
        language={LANGUAGE_ID}
        monacoOptions={options}
        onBeforeEditorMount={() => {
          // @ts-ignore
          initiateEditor(datasource.templateSrv.getVariables().map(item => `${item.name}`), window.monaco)
          setTimeout(() => {
            // @ts-ignore
            window.monaco.editor.setTheme(THEME_NAME)
          }, 10)
        }}
        onChange={onSqlChange}
        onBlur={onRunQuery}
      />
    </div>
  );
};
