import React from 'react';
import Editor from '@monaco-editor/react';

export const SQLCodeEditor = ({ height, query, onEditorMount, onSqlChange }: any) => {

  return (
    <div style={{ position: 'relative', width: '100%', marginTop: '10px' }}>
      <Editor
        height="200px"
        defaultLanguage="sql"
        language={'sql'}
        theme="vs-dark"
        value={query.query}
        options={{
          minimap: {
            autohide: true,
          },
        }}
        onChange={onSqlChange}
      />
    </div>
  );
};
