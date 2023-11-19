import { CodeEditor } from '@grafana/ui';
import React from 'react';

export const SQLCodeEditor = ({ height, query, onEditorMount, onSqlChange }) => {
  return (
    <div style={{ position: 'relative', width: '100%', marginTop: '10px' }}>
      <CodeEditor
        aria-label="SQL"
        height={height}
        language="sql"
        value={query.query || ''}
        showMiniMap={false}
        showLineNumbers={true}
        onSave={onSqlChange}
        onBlur={(sql) => onSqlChange(sql)}
        onEditorDidMount={event => {
          console.log(event);
          onEditorMount(event)}
        }
        getSuggestions={() => {
          const variableList = [
            {
              label: '$table',
              detail: 'Selected table name',
              documentation: 'Replaced with selected table name from Query Builder',
              insertText: '$table',
              kind: 'property',
            },
            {
              label: '$dateCol',
              detail: 'Date:Col value',
              documentation: 'Replaced with Date:Col value from Query Builder',
              insertText: '$dateCol',
              kind: 'property',
            },
            {
              label: '$dateTimeCol',
              detail: 'DateTime or TimeStamp value',
              documentation: 'Replaced with Column:DateTime or Column:TimeStamp value from Query Builder',
              insertText: '$dateTimeCol',
              kind: 'property',
            },
            {
              label: '$from',
              detail: 'Timestamp with ms / 1000',
              documentation: 'Replaced with (timestamp with ms)/1000 value of UI selected "Time Range:From"',
              insertText: '$from',
              kind: 'property',
            },
            {
              label: '$to',
              detail: 'Timestamp with ms / 1000',
              documentation: 'Replaced with (timestamp with ms)/1000 value of UI selected "Time Range:To"',
              insertText: '$to',
              kind: 'property',
            },
            {
              label: '$interval',
              detail: 'Selected time interval (seconds)',
              documentation: 'Replaced with selected "Group by time interval" value (as a number of seconds)',
              insertText: '$interval',
              kind: 'property',
            },
            {
              label: '$timeFilter',
              detail: 'Currently selected "Time Range"',
              documentation:
                'Replaced with currently selected "Time Range". Require Column:Date and Column:DateTime or Column:TimeStamp to be selected',
              insertText: '$timeFilter',
              kind: 'property',
            },
            {
              label: '$timeSeries',
              detail: 'ClickHouse construction for time-series data',
              documentation:
                'Replaced with special ClickHouse construction to convert results as time-series data. Use it as "SELECT $timeSeries...". Require Column:DateTime or Column:TimeStamp to be selected',
              insertText: '$timeSeries',
              kind: 'property',
            },
            {
              label: '$naturalTimeSeries',
              detail: 'ClickHouse construction for natural time-series data',
              documentation:
                'Replaced with special ClickHouse construction to convert results as time-series data in logical/natural units. Use it as "SELECT $naturalTimeSeries...". Require Column:DateTime or Column:TimeStamp to be selected',
              insertText: '$naturalTimeSeries',
              kind: 'property',
            },
            {
              label: '$unescape',
              detail: 'Unescapes variable value',
              documentation:
                'Used for multiple-value string variables: "SELECT $unescape($column) FROM requests WHERE $unescape($column) = 5"',
              insertText: '$unescape',
              kind: 'property',
            },
            {
              label: '$adhoc',
              detail: 'Ad-hoc filter',
              documentation: 'Replaced with a rendered ad-hoc filter expression, or "1" if no ad-hoc filters exist',
              insertText: '$adhoc',
              kind: 'property',
            },
            {
              label: '$conditionalTest',
              detail: 'SQL predicate filter expression if $variable non-empty',
              documentation: 'Add `SQL predicate` filter expression only if $variable has non-empty value',
              insertText: '$conditionalTest',
              kind: 'property',
            },
          ];

          return variableList;
        }}
      />
    </div>
  );
};
