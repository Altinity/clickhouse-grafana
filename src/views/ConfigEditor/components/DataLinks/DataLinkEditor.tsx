import React, { useMemo } from 'react';
import { CodeEditor, IconButton, InlineField, Input, Select } from '@grafana/ui';
import { DataSourcePicker, getDataSourceSrv } from '@grafana/runtime';
import { SelectableValue } from '@grafana/data';
import { CHFormat, DataLinkConfig } from '../../../../datasource/datalinks/types';
import { isClickHouseTarget } from '../../../../datasource/datalinks';

const FORMAT_OPTIONS: Array<SelectableValue<CHFormat>> = [
  { label: 'Table', value: 'table' },
  { label: 'Logs', value: 'logs' },
  { label: 'Traces', value: 'traces' },
  { label: 'Time series', value: 'time_series' },
  { label: 'Flamegraph', value: 'flamegraph' },
];

const LABEL_WIDTH = 18;

interface Props {
  dataLink: DataLinkConfig;
  onChange: (updated: DataLinkConfig) => void;
  onDelete: () => void;
}

export function DataLinkEditor({ dataLink, onChange, onDelete }: Props) {
  const isCHTarget = useMemo(() => {
    return isClickHouseTarget(dataLink.targetDatasourceUid);
  }, [dataLink.targetDatasourceUid]);

  const targetMissing = useMemo(() => {
    if (!dataLink.targetDatasourceUid) return false;
    return !getDataSourceSrv().getInstanceSettings(dataLink.targetDatasourceUid);
  }, [dataLink.targetDatasourceUid]);

  const isExternal = !!dataLink.url;

  return (
    <div
      style={{
        border: '1px solid var(--border-weak)',
        borderRadius: 4,
        padding: '8px 12px',
        marginBottom: 8,
        maxWidth: 900,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <InlineField
              label="Field name"
              labelWidth={LABEL_WIDTH}
              tooltip="Exact column name (case-sensitive). On logs format, columns referenced here are auto-promoted into top-level fields (no need to alias as body)."
            >
              <Input
                width={28}
                value={dataLink.fieldName}
                placeholder="trace_id"
                onChange={(e) => onChange({ ...dataLink, fieldName: e.currentTarget.value })}
              />
            </InlineField>
            <InlineField label="Title" labelWidth={10}>
              <Input
                width={30}
                value={dataLink.title}
                placeholder="View trace"
                onChange={(e) => onChange({ ...dataLink, title: e.currentTarget.value })}
              />
            </InlineField>
          </div>

          <InlineField
            label="External URL"
            labelWidth={LABEL_WIDTH}
            tooltip="Optional. If set, this becomes a plain URL link and the Target datasource / Query fields below are ignored. ${__value.raw} and dashboard variables are interpolated by Grafana at click time."
            grow
          >
            <Input
              value={dataLink.url ?? ''}
              placeholder="https://jaeger.example.com/trace/${__value.raw}  (leave empty for an internal cross-datasource link)"
              onChange={(e) => onChange({ ...dataLink, url: e.currentTarget.value })}
            />
          </InlineField>

          {!isExternal && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                <InlineField
                  label="Target"
                  labelWidth={LABEL_WIDTH}
                  invalid={targetMissing}
                  error={targetMissing ? 'Target datasource not found — uid does not exist in this Grafana instance' : undefined}
                >
                  <div style={{ width: 260 }}>
                    <DataSourcePicker
                      current={dataLink.targetDatasourceUid}
                      onChange={(ds) => onChange({ ...dataLink, targetDatasourceUid: ds.uid ?? '' })}
                      noDefault
                    />
                  </div>
                </InlineField>
                {isCHTarget && (
                  <InlineField label="Format" labelWidth={10}>
                    <Select
                      width={20}
                      options={FORMAT_OPTIONS}
                      value={dataLink.format ?? 'table'}
                      onChange={(v) => onChange({ ...dataLink, format: (v.value ?? 'table') as CHFormat })}
                    />
                  </InlineField>
                )}
              </div>
            </>
          )}
        </div>
        <IconButton
          name="trash-alt"
          aria-label="Remove"
          tooltip="Remove this data link"
          variant="destructive"
          onClick={onDelete}
        />
      </div>
      {!isExternal && (
        <InlineField
          label="Query"
          labelWidth={LABEL_WIDTH}
          tooltip="Supports ${__value.raw}, ${__data.fields.<name>}, $__from, $__to, and dashboard variables. Interpolated by Grafana at click time."
          grow
        >
          <div style={{ width: '100%' }}>
            <CodeEditor
              language="sql"
              height={80}
              value={dataLink.query}
              onBlur={(value) => onChange({ ...dataLink, query: value })}
              showMiniMap={false}
              showLineNumbers={false}
            />
          </div>
        </InlineField>
      )}
    </div>
  );
}
