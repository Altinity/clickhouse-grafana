import React, { FormEvent, useState } from 'react';
import {
  Button,
  Collapse,
  Field,
  InlineField,
  InlineSwitch,
  Input,
  Label,
  IconButton,
} from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { CHDataSourceOptions, TraceToMetricsTag, TraceToMetricsQuery } from '../../../../types/types';

interface Props extends DataSourcePluginOptionsEditorProps<CHDataSourceOptions> {}

export function TraceToMetrics(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData } = options;
  const tracesToMetrics = jsonData.tracesToMetrics || {};
  
  const [isOpen, setIsOpen] = useState(false);
  const [tags, setTags] = useState<TraceToMetricsTag[]>(tracesToMetrics.tags || []);
  const [queries, setQueries] = useState<TraceToMetricsQuery[]>(tracesToMetrics.queries || []);

  const updateTracesToMetrics = (updates: Partial<typeof tracesToMetrics>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        tracesToMetrics: {
          ...tracesToMetrics,
          ...updates,
        },
      },
    });
  };

  const handleEnabledChange = (event: FormEvent<HTMLInputElement>) => {
    updateTracesToMetrics({ enabled: event.currentTarget.checked });
  };

  const handleDatasourceUidChange = (event: FormEvent<HTMLInputElement>) => {
    updateTracesToMetrics({ datasourceUid: event.currentTarget.value });
  };

  const handleSpanStartTimeShiftChange = (event: FormEvent<HTMLInputElement>) => {
    updateTracesToMetrics({ spanStartTimeShift: event.currentTarget.value });
  };

  const handleSpanEndTimeShiftChange = (event: FormEvent<HTMLInputElement>) => {
    updateTracesToMetrics({ spanEndTimeShift: event.currentTarget.value });
  };

  const addTag = () => {
    const newTags = [...tags, { key: '' }];
    setTags(newTags);
    updateTracesToMetrics({ tags: newTags });
  };

  const updateTag = (index: number, field: 'key' | 'value', value: string) => {
    const newTags = [...tags];
    newTags[index] = { ...newTags[index], [field]: value };
    setTags(newTags);
    updateTracesToMetrics({ tags: newTags });
  };

  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    setTags(newTags);
    updateTracesToMetrics({ tags: newTags });
  };

  const addQuery = () => {
    const newQueries = [...queries, { name: '', query: '' }];
    setQueries(newQueries);
    updateTracesToMetrics({ queries: newQueries });
  };

  const updateQuery = (index: number, field: 'name' | 'query', value: string) => {
    const newQueries = [...queries];
    newQueries[index] = { ...newQueries[index], [field]: value };
    setQueries(newQueries);
    updateTracesToMetrics({ queries: newQueries });
  };

  const removeQuery = (index: number) => {
    const newQueries = queries.filter((_, i) => i !== index);
    setQueries(newQueries);
    updateTracesToMetrics({ queries: newQueries });
  };

  return (
    <div className="gf-form-group">
      <Collapse
        label="Trace to metrics"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        collapsible
      >
        <InlineField
          label="Enable trace to metrics"
          labelWidth={32}
          tooltip="Enable linking from trace spans to metrics"
        >
          <InlineSwitch
            data-test-id="trace-to-metrics-enabled"
            id="tracesToMetricsEnabled"
            value={tracesToMetrics.enabled || false}
            onChange={handleEnabledChange}
          />
        </InlineField>

        {tracesToMetrics.enabled && (
          <>
            <InlineField
              label="Metrics datasource UID"
              labelWidth={32}
              tooltip="UID of the metrics datasource to link to"
            >
              <Input
                data-test-id="trace-to-metrics-datasource-uid"
                value={tracesToMetrics.datasourceUid || ''}
                onChange={handleDatasourceUidChange}
                placeholder="Enter datasource UID"
                width={40}
              />
            </InlineField>

            <InlineField
              label="Span start time shift"
              labelWidth={32}
              tooltip="Shift the start time for the metrics query (e.g., -5m)"
            >
              <Input
                data-test-id="trace-to-metrics-start-shift"
                value={tracesToMetrics.spanStartTimeShift || ''}
                onChange={handleSpanStartTimeShiftChange}
                placeholder="-5m"
                width={20}
              />
            </InlineField>

            <InlineField
              label="Span end time shift"
              labelWidth={32}
              tooltip="Shift the end time for the metrics query (e.g., 5m)"
            >
              <Input
                data-test-id="trace-to-metrics-end-shift"
                value={tracesToMetrics.spanEndTimeShift || ''}
                onChange={handleSpanEndTimeShiftChange}
                placeholder="5m"
                width={20}
              />
            </InlineField>

            <Field label="Tag mappings" description="Map span attributes to metric labels">
              <div>
                {tags.map((tag, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <Input
                      value={tag.key}
                      onChange={(e) => updateTag(index, 'key', e.currentTarget.value)}
                      placeholder="Span attribute (e.g., service.name)"
                      width={30}
                      style={{ marginRight: 8 }}
                    />
                    <Label style={{ margin: '0 8px' }}>→</Label>
                    <Input
                      value={tag.value || ''}
                      onChange={(e) => updateTag(index, 'value', e.currentTarget.value)}
                      placeholder="Metric label (optional)"
                      width={30}
                      style={{ marginRight: 8 }}
                    />
                    <IconButton
                      name="trash-alt"
                      tooltip="Remove tag mapping"
                      onClick={() => removeTag(index)}
                    />
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  icon="plus"
                  onClick={addTag}
                >
                  Add tag mapping
                </Button>
              </div>
            </Field>

            <Field label="Query templates" description="Define query templates with $__tags placeholder">
              <div>
                {queries.map((query, index) => (
                  <div key={index} style={{ marginBottom: 16, padding: 8, border: '1px solid rgba(204, 204, 220, 0.15)', borderRadius: 4 }}>
                    <div style={{ marginBottom: 8 }}>
                      <Input
                        value={query.name}
                        onChange={(e) => updateQuery(index, 'name', e.currentTarget.value)}
                        placeholder="Query name"
                        width={40}
                      />
                      <IconButton
                        name="trash-alt"
                        tooltip="Remove query"
                        onClick={() => removeQuery(index)}
                        style={{ float: 'right' }}
                      />
                    </div>
                    <Input
                      value={query.query}
                      onChange={(e) => updateQuery(index, 'query', e.currentTarget.value)}
                      placeholder="SELECT count() FROM metrics WHERE $__tags"
                      width={80}
                    />
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  icon="plus"
                  onClick={addQuery}
                >
                  Add query template
                </Button>
              </div>
            </Field>
          </>
        )}
      </Collapse>
    </div>
  );
}
