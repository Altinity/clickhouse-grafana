import React, { useState } from 'react';
import {
  Button,
  Collapse,
  Field,
  InlineField,
  InlineSwitch,
  Input,
  Label,
  IconButton,
  Select,
  Alert,
} from '@grafana/ui';
import { DataLinksConfig as DataLinksConfigType, CHQuery } from '../../../../types/types';
import { SelectableValue } from '@grafana/data';

interface Props {
  query: CHQuery;
  onChange: (query: CHQuery) => void;
  datasources: Array<SelectableValue<string>>; // Available datasources for dropdown
}

export function DataLinksConfig(props: Props) {
  const { query, onChange, datasources } = props;
  const dataLinks: DataLinksConfigType | undefined = query.dataLinks;
  const [isOpen, setIsOpen] = useState(false);

  // Helper to update dataLinks in query
  const updateDataLinks = (updates: Partial<DataLinksConfigType>) => {
    const currentDataLinks: DataLinksConfigType = dataLinks || {
      enabled: false,
      targetDatasourceUid: '',
    };

    onChange({
      ...query,
      dataLinks: {
        ...currentDataLinks,
        ...updates,
      },
    });
  };

  const handleEnabledChange = (event: React.FormEvent<HTMLInputElement>) => {
    updateDataLinks({ enabled: event.currentTarget.checked });
  };

  const handleDatasourceChange = (value: SelectableValue<string>) => {
    updateDataLinks({
      targetDatasourceUid: value.value || '',
      targetDatasourceName: value.label || ''
    });
  };

  const handleTimeShiftChange = (field: 'start' | 'end', value: string) => {
    const currentTimeShift = dataLinks?.timeShift || { start: '', end: '' };
    updateDataLinks({
      timeShift: {
        ...currentTimeShift,
        [field]: value,
      },
    });
  };

  const addFieldMapping = () => {
    const mappings = dataLinks?.fieldMappings || [];
    updateDataLinks({
      fieldMappings: [...mappings, { sourceField: '', targetField: '', useInQuery: true }],
    });
  };

  const updateFieldMapping = (index: number, field: string, value: string | boolean) => {
    const mappings = [...(dataLinks?.fieldMappings || [])];
    mappings[index] = { ...mappings[index], [field]: value };
    updateDataLinks({ fieldMappings: mappings });
  };

  const removeFieldMapping = (index: number) => {
    const mappings = (dataLinks?.fieldMappings || []).filter((_, i) => i !== index);
    updateDataLinks({ fieldMappings: mappings });
  };

  const addQueryTemplate = () => {
    const templates = dataLinks?.queryTemplates || [];
    updateDataLinks({
      queryTemplates: [...templates, { name: '', query: '' }],
    });
  };

  const updateQueryTemplate = (index: number, field: 'name' | 'query', value: string) => {
    const templates = [...(dataLinks?.queryTemplates || [])];
    templates[index] = { ...templates[index], [field]: value };
    updateDataLinks({ queryTemplates: templates });
  };

  const removeQueryTemplate = (index: number) => {
    const templates = (dataLinks?.queryTemplates || []).filter((_, i) => i !== index);
    updateDataLinks({ queryTemplates: templates });
  };

  // Only show for traces format
  const isTracesFormat = query.format === 'traces';

  if (!isTracesFormat) {
    return null;
  }

  return (
    <div style={{ marginTop: '8px', marginBottom: '8px' }}>
      <Collapse
        label="Data Links (Trace to Metrics)"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        collapsible
      >
        <div style={{ padding: '8px 0' }}>
          <Alert title="Panel-level configuration" severity="info" style={{ marginBottom: '16px' }}>
            Configure data links for this panel. This overrides datasource-level settings.
          </Alert>

          <InlineField
            label="Enable data links"
            labelWidth={24}
            tooltip="Enable linking from traces to metrics"
          >
            <InlineSwitch
              value={dataLinks?.enabled || false}
              onChange={handleEnabledChange}
            />
          </InlineField>

          {dataLinks?.enabled && (
            <>
              <InlineField
                label="Target datasource"
                labelWidth={24}
                tooltip="Datasource to link to (usually a metrics datasource)"
              >
                <Select
                  width={40}
                  options={datasources}
                  value={datasources.find(d => d.value === dataLinks?.targetDatasourceUid)}
                  onChange={handleDatasourceChange}
                  placeholder="Select datasource"
                />
              </InlineField>

              <InlineField
                label="Time range: Start shift"
                labelWidth={24}
                tooltip="Shift the start time for the linked query (e.g., -5m, -1h)"
              >
                <Input
                  value={dataLinks?.timeShift?.start || ''}
                  onChange={(e) => handleTimeShiftChange('start', e.currentTarget.value)}
                  placeholder="-5m"
                  width={20}
                />
              </InlineField>

              <InlineField
                label="Time range: End shift"
                labelWidth={24}
                tooltip="Shift the end time for the linked query (e.g., 5m, 1h)"
              >
                <Input
                  value={dataLinks?.timeShift?.end || ''}
                  onChange={(e) => handleTimeShiftChange('end', e.currentTarget.value)}
                  placeholder="5m"
                  width={20}
                />
              </InlineField>

              <Field
                label="Field mappings"
                description="Map span attributes to metric labels (e.g., service.name → service)"
              >
                <div>
                  {(dataLinks?.fieldMappings || []).map((mapping, index) => (
                    <div
                      key={index}
                      style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}
                    >
                      <Input
                        value={mapping.sourceField}
                        onChange={(e) => updateFieldMapping(index, 'sourceField', e.currentTarget.value)}
                        placeholder="Span attribute (e.g., service.name)"
                        width={30}
                      />
                      <Label style={{ margin: 0, minWidth: 20, textAlign: 'center' }}>→</Label>
                      <Input
                        value={mapping.targetField || ''}
                        onChange={(e) => updateFieldMapping(index, 'targetField', e.currentTarget.value)}
                        placeholder="Metric label (optional)"
                        width={30}
                      />
                      <IconButton
                        name="trash-alt"
                        tooltip="Remove mapping"
                        onClick={() => removeFieldMapping(index)}
                      />
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" icon="plus" onClick={addFieldMapping}>
                    Add field mapping
                  </Button>
                </div>
              </Field>

              <Field
                label="Query templates"
                description="Define query templates with $__tags placeholder for span attributes"
              >
                <div>
                  {(dataLinks?.queryTemplates || []).map((template, index) => (
                    <div
                      key={index}
                      style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}
                    >
                      <Input
                        value={template.name}
                        onChange={(e) => updateQueryTemplate(index, 'name', e.currentTarget.value)}
                        placeholder="Query name (e.g., Request Rate)"
                        width={25}
                      />
                      <Input
                        value={template.query}
                        onChange={(e) => updateQueryTemplate(index, 'query', e.currentTarget.value)}
                        placeholder="SELECT count() FROM metrics WHERE $__tags"
                        style={{ flex: 1 }}
                      />
                      <IconButton
                        name="trash-alt"
                        tooltip="Remove query"
                        onClick={() => removeQueryTemplate(index)}
                      />
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" icon="plus" onClick={addQueryTemplate}>
                    Add query template
                  </Button>
                </div>
              </Field>
            </>
          )}
        </div>
      </Collapse>
    </div>
  );
}
