import React, { useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';

export const SQLCodeEditor = ({ height, query, onEditorMount, onSqlChange }: any) => {
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      console.log('here is the monaco instance:', monaco);
    }
  }, [monaco]);

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
        // showLineNumbers={true}
        // editorDidMount={editorDidMount}
        // editorWillMount={(monaco => console.log('>>>>', monaco)}
      />
    </div>
  );
};
