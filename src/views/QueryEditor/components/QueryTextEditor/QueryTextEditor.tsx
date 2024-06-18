import React, { useEffect, useState } from 'react';
import { InlineField, InlineFieldRow, InlineLabel, InlineSwitch, Input, Select, ToolbarButton } from '@grafana/ui';
import ReformattedQuery from './ReformattedQuery';
import QueryMacrosInfo from './QueryMacrosInfo';
import { SQLCodeEditor } from './SQLCodeEditor';
import Scanner from '../../../../datasource/scanner/scanner';

const RESOLUTION_OPTIONS = [
  { value: 1, label: '1/1' },
  { value: 2, label: '1/2' },
  { value: 3, label: '1/3' },
  { value: 4, label: '1/4' },
  { value: 5, label: '1/5' },
  { value: 10, label: '1/10' },
];

const FORMAT_OPTIONS = [
  { label: 'Time series', value: 'time_series' },
  { label: 'Table', value: 'table' },
  { label: 'Logs', value: 'logs' },
  { label: 'Traces', value: 'traces' },
  { label: 'Flame Graph', value: 'flamegraph' },
];

export const QueryTextEditor = ({
 query, height, onEditorMount, onSqlChange, onFieldChange, formattedData, onRunQuery, datasource, isAnnotationView 
}: any) => {
  const [sqlFormattedData, setSqlFormattedData] = useState(formattedData);
  const [fieldValues, setFieldValues] = useState(query);

  useEffect(() => {
    const scanner = new Scanner(formattedData);
    // removed scanner.Format as it contains bugs inherited from v2
    setSqlFormattedData(scanner.raw());
  }, [formattedData]);

  const handleStepChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFieldValues({ ...fieldValues, query: query.query, interval: value });
    onFieldChange({ ...fieldValues, query: query.query, interval: value });
  };

  const handleResolutionChange = (value: number) => {
    setFieldValues({ ...fieldValues, query: query.query, intervalFactor: value });
    onFieldChange({ ...fieldValues, query: query.query, intervalFactor: value });
  };

  const handleRoundChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFieldValues({ ...fieldValues, query: query.query, round: value });
    onFieldChange({ ...fieldValues, query: query.query, round: value });
  };

  const handleFormatChange = (value: string | undefined) => {
    setFieldValues({ ...fieldValues, query: query.query, format: value || '' });
    onFieldChange({ ...fieldValues, query: query.query, format: value });
  };

  const handleToggleField = (fieldName: string) => {
    setFieldValues({ ...fieldValues, query: query.query, [fieldName]: !fieldValues[fieldName] });
    onFieldChange({ ...fieldValues, query: query.query, [fieldName]: !fieldValues[fieldName] });
  };

  return (
    <>
      <SQLCodeEditor datasource={datasource} height={height} onSqlChange={onSqlChange} query={query} onEditorMount={onEditorMount} onRunQuery={onRunQuery} />
      <div className="gf-form" style={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
        <InlineFieldRow>
          <InlineField
            label={<InlineLabel width={18} tooltip="Turn on if you don't like when last data point in time series much lower then previous">Extrapolation</InlineLabel>}
          >
            <InlineSwitch transparent value={fieldValues.extrapolate} onChange={() => handleToggleField('extrapolate')} />
          </InlineField>
          <InlineField
            label={<InlineLabel width={10} tooltip="Leave blank for auto handling based on time range and panel width">Step</InlineLabel>}
          >
            <Input placeholder="" onChange={handleStepChange} value={fieldValues.interval} />
          </InlineField>
          <InlineField
            label={<InlineLabel width={'auto'}>Resolution</InlineLabel>}
          >
            <Select width={'auto'} onChange={(e) => handleResolutionChange(Number(e.value))} options={RESOLUTION_OPTIONS} value={fieldValues.intervalFactor} />
          </InlineField>
          { !isAnnotationView && <InlineField
            label={<InlineLabel width={'auto'}>Format As</InlineLabel>}
          >
            <Select width={'auto'} onChange={(e) => handleFormatChange(e.value)} options={FORMAT_OPTIONS} value={fieldValues.format} />
          </InlineField> }
        </InlineFieldRow>
        <InlineFieldRow>
          <InlineField
            label={<InlineLabel width={18} tooltip="Add /* $__dashboard $__user */ to query">Add metadata</InlineLabel>}
            style={{ height: '100%' }}
          >
            <InlineSwitch width="auto" value={fieldValues.add_metadata} onChange={() => handleToggleField('add_metadata')} transparent />
          </InlineField>
          <InlineField
            label={<InlineLabel width={18} tooltip="Turn off if you would like pass comments in SQL query to server">Skip Comments</InlineLabel>}
            style={{ height: '100%' }}
          >
            <InlineSwitch width="auto" value={fieldValues.skip_comments} onChange={() => handleToggleField('skip_comments')} transparent />
          </InlineField>
          <InlineField
            label={<InlineLabel width={10} tooltip="Set rounding for $from and $to timestamps...">Round</InlineLabel>}
          >
            <Input placeholder="" onChange={handleRoundChange} value={fieldValues.round} />
          </InlineField>
          <InlineField>
            <ToolbarButton variant={'primary'} onClick={() => handleToggleField('showHelp')} isOpen={fieldValues.showHelp}>Show help</ToolbarButton>
          </InlineField>
          <InlineField>
            <ToolbarButton variant={'primary'} onClick={() => handleToggleField('showFormattedSQL')} isOpen={fieldValues.showFormattedSQL}>Show generated SQL</ToolbarButton>
          </InlineField>
        </InlineFieldRow>
        {fieldValues.showFormattedSQL && <ReformattedQuery data={sqlFormattedData} />}
        {fieldValues.showHelp && <QueryMacrosInfo />}
      </div>
    </>
  );
};
