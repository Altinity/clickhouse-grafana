import React from 'react';
import { Button } from '@grafana/ui';
import { DataLinkConfig } from '../../../../datasource/datalinks/types';
import { DataLinkEditor } from './DataLinkEditor';

interface Props {
  dataLinks: DataLinkConfig[];
  onChange: (next: DataLinkConfig[]) => void;
}

const EMPTY_LINK: DataLinkConfig = {
  fieldName: '',
  title: '',
  targetDatasourceUid: '',
  query: '',
};

export function DataLinksSection({ dataLinks, onChange }: Props) {
  const onAdd = () => onChange([...dataLinks, { ...EMPTY_LINK }]);
  const onUpdate = (index: number, updated: DataLinkConfig) => {
    const next = dataLinks.slice();
    next[index] = updated;
    onChange(next);
  };
  const onDelete = (index: number) => {
    onChange(dataLinks.filter((_, i) => i !== index));
  };

  return (
    <section style={{ marginTop: 16 }}>
      <h3>Data Links</h3>
      <p style={{ color: 'var(--text-secondary)' }}>
        Attach clickable links to query result fields. Configured links open the target datasource in Explore with the chosen query.
      </p>

      {dataLinks.length === 0 ? (
        <p style={{ fontStyle: 'italic' }}>
          No data links configured. Add one to enable cross-datasource navigation from query results.
        </p>
      ) : (
        dataLinks.map((dl, i) => (
          <DataLinkEditor
            key={i}
            dataLink={dl}
            onChange={(updated) => onUpdate(i, updated)}
            onDelete={() => onDelete(i)}
          />
        ))
      )}

      <Button variant="secondary" size="sm" icon="plus" onClick={onAdd}>
        Add data link
      </Button>
    </section>
  );
}
