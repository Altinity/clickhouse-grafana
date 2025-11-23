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

  // Show for formats that support data links
  const supportedFormats = ['time_series', 'logs', 'traces', 'flamegraph', 'table'];
  const isFormatSupported = supportedFormats.includes(query.format);

  if (!isFormatSupported) {
    return null;
  }

  // Format-specific helper text
  const getFormatHelperText = () => {
    switch (query.format) {
      case 'time_series':
        return 'Configure links for data points in time series. Links appear when clicking on the graph.';
      case 'logs':
        return 'Configure links for log entries. Links appear in the log line context menu.';
      case 'traces':
        return 'Configure links for trace spans. Links appear when clicking on spans.';
      case 'flamegraph':
        return 'Configure links for flamegraph nodes. Links appear when clicking on function names.';
      case 'table':
        return 'Configure links for table cells. Links appear when clicking on cell values.';
      default:
        return 'Configure data links for this visualization.';
    }
  };

  const getFormatExamples = () => {
    switch (query.format) {
      case 'time_series':
        return {
          fieldMapping: 'e.g., server_name, cluster',
          queryExample: 'SELECT * FROM logs WHERE host = \'${server_name}\' AND $timeFilter'
        };
      case 'logs':
        return {
          fieldMapping: 'e.g., trace_id, service_name',
          queryExample: 'SELECT * FROM traces WHERE traceID = \'${trace_id}\''
        };
      case 'traces':
        return {
          fieldMapping: 'e.g., service.name, http.method',
          queryExample: 'SELECT count() FROM metrics WHERE $__tags AND $timeFilter'
        };
      case 'flamegraph':
        return {
          fieldMapping: 'e.g., function_name, level',
          queryExample: 'SELECT * FROM traces WHERE operationName = \'${function_name}\''
        };
      case 'table':
        return {
          fieldMapping: 'e.g., user_id, session_id',
          queryExample: 'SELECT * FROM events WHERE user_id = \'${user_id}\' AND $timeFilter'
        };
      default:
        return {
          fieldMapping: 'e.g., field_name',
          queryExample: 'SELECT * FROM table WHERE field = \'${field_name}\''
        };
    }
  };

  const formatExamples = getFormatExamples();

  return (
    <div style={{ marginTop: '8px', marginBottom: '8px' }}>
      <Collapse
        label="Data Links"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        collapsible
      >
        <div style={{ padding: '8px 0' }}>
          <Alert title="Panel-level configuration" severity="info" style={{ marginBottom: '16px' }}>
            {getFormatHelperText()}
          </Alert>

          <InlineField
            label="Enable data links"
            labelWidth={24}
            tooltip="Enable navigation links from this visualization to other panels/datasources"
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
                tooltip="Datasource to link to (can be same or different datasource)"
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
                description={`Map fields to query variables (${formatExamples.fieldMapping})`}
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
                        placeholder={`Source field (${formatExamples.fieldMapping.split(',')[0].trim()})`}
                        width={30}
                      />
                      <Label style={{ margin: 0, minWidth: 20, textAlign: 'center' }}>→</Label>
                      <Input
                        value={mapping.targetField || ''}
                        onChange={(e) => updateFieldMapping(index, 'targetField', e.currentTarget.value)}
                        placeholder="Target variable (optional)"
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
                description="Define query templates with $__tags placeholder for field mappings"
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
                        placeholder="Query name"
                        width={25}
                      />
                      <Input
                        value={template.query}
                        onChange={(e) => updateQueryTemplate(index, 'query', e.currentTarget.value)}
                        placeholder={formatExamples.queryExample}
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
