import React, { ChangeEvent } from 'react';
import { InlineField, Input } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { CHDataSourceOptions, CHQuery } from '../types';

type CHQueryEditorProps = QueryEditorProps<DataSource, CHQuery, CHDataSourceOptions>;

export function QueryEditor({   query, onChange, onRunQuery }: CHQueryEditorProps) {
  const onQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, query: event.target.value });
    onRunQuery();
  };

  return (
    <div className="gf-form">
      <InlineField label="Query Text" labelWidth={16}>
        <Input onChange={onQueryTextChange} value={query.query || ''} />
      </InlineField>
    </div>
  );
}
