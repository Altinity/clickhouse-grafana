import React from 'react';
import MonacoEditor from 'react-monaco-editor';
import {LANGUAGE_ID, THEME_NAME} from "./editor/initiateEditor";
export const SQLCodeEditor = ({ height, query, onSqlChange }: any) => {
  const options = {
    minimap: {
      enabled: false
    },
    editor: {
      scrollbar : { alwaysConsumeMouseWheel: false, handleMouseWheel: false }
    }
  };


  return (
    <div style={{ position: 'relative', width: '100%', marginTop: '10px' }}>
      <MonacoEditor
        height={height || 300}
        language={LANGUAGE_ID}
        theme={THEME_NAME}
        value={query.query}
        options={options}
        onChange={onSqlChange}
      />
    </div>
  );
};
