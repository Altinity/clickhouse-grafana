import React, { useEffect, useState } from 'react';
import {
  InlineField,
  InlineFieldRow,
  InlineLabel,
  InlineSwitch,
  Input,
  Select,
  TagsInput,
  ToolbarButton,
} from '@grafana/ui';
import QueryMacrosInfo from './QueryMacrosInfo';
import { SQLCodeEditor } from './SQLCodeEditor';
import {FormattedSQL} from "./FormattedSQL";

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
  query,
  onSqlChange,
  onFieldChange,
  formattedData,
  onRunQuery,
  datasource,
  isAnnotationView,
  adhocFilters,
  areAdHocFiltersAvailable,
}: any) => {
  const [sqlFormattedData, setSqlFormattedData] = useState(formattedData);

  useEffect(() => {
    setSqlFormattedData(formattedData);
    // eslint-disable-next-line
  }, [formattedData]);

  const handleStepChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    onFieldChange({ fieldName: 'interval', value: value });
  };

  const handleResolutionChange = (value: number) => {
    onFieldChange({ fieldName: 'intervalFactor', value: value });
  };

  const handleRoundChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    onFieldChange({ fieldName: 'round', value: value });
  };

  const handleFormatChange = (value: string | undefined) => {
    onFieldChange({ fieldName: 'format', value: value });
  };

  const handleContextWindowChange = (value: string | undefined) => {
    onFieldChange({ fieldName: 'contextWindowSize', value: value });
  };

  const handleToggleField = (fieldName: string) => {
    onFieldChange({ fieldName: fieldName, value: !query[fieldName] });
  };

  return (
    <>
      <SQLCodeEditor datasource={datasource} onSqlChange={onSqlChange} query={query} onRunQuery={onRunQuery} />
      {!areAdHocFiltersAvailable && adhocFilters.length > 0 && (
        <TagsInput
          className={'adhoc-filters-tags'}
          tags={adhocFilters.map((filter: any, index: number) => `${filter.key} ${filter.operator} ${filter.value}`)}
          onChange={(tagsList) => {
            onFieldChange({
              fieldName: 'adHocFilters',
              value: tagsList.map((item: string) => {
                const [key, operator, value] = item.split(' ');

                return { key, operator, value };
              }),
            });
          }}
        />
      )}
      <div className="gf-form" style={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
        <InlineFieldRow>
          <InlineField
            label={
              <InlineLabel
                width={18}
                tooltip="Turn on if you don't like when last data point in time series much lower then previous"
              >
                Extrapolation
              </InlineLabel>
            }
          >
            <InlineSwitch
              transparent
              data-testid="extrapolate-switch"
              value={query.extrapolate}
              onChange={() => handleToggleField('extrapolate')}
            />
          </InlineField>
          <InlineField
            label={
              <InlineLabel width={10} tooltip="Leave blank for auto handling based on time range and panel width">
                Step
              </InlineLabel>
            }
          >
            <Input placeholder="" onChange={handleStepChange} data-testid="interval-input" value={query.interval} />
          </InlineField>
          <InlineField label={<InlineLabel width={'auto'}>Resolution</InlineLabel>}>
            <Select
              width={'auto'}
              data-testid="resolution-select"
              onChange={(e) => handleResolutionChange(Number(e.value))}
              options={RESOLUTION_OPTIONS}
              value={query.intervalFactor}
            />
          </InlineField>
          <InlineField
            label={
              <InlineLabel width={10} tooltip="Set rounding for $from and $to timestamps...">
                Round
              </InlineLabel>
            }
          >
            <Input data-testid="round-input" placeholder="" onChange={handleRoundChange} value={query.round} />
          </InlineField>
        </InlineFieldRow>
        <InlineFieldRow>
          <InlineField
            label={
              <InlineLabel width={18} tooltip="Add /* $__dashboard $__user */ to query">
                Add metadata
              </InlineLabel>
            }
            style={{ height: '100%' }}
          >
            <InlineSwitch
              data-testid="metadata-switch"
              width="auto"
              value={query.add_metadata}
              onChange={() => handleToggleField('add_metadata')}
              transparent
            />
          </InlineField>
          <InlineField
            label={
              <InlineLabel width={18} tooltip="Turn off if you would like pass comments in SQL query to server">
                Skip Comments
              </InlineLabel>
            }
            style={{ height: '100%' }}
          >
            <InlineSwitch
              data-testid="skip-comments-switch"
              width="auto"
              value={query.skip_comments}
              onChange={() => handleToggleField('skip_comments')}
              transparent
            />
          </InlineField>
          <InlineField
            label={
              <InlineLabel width={23} tooltip="Turn off if you would like use `runnindDifference` and `neighbor` functions for macros">
                Use window functions
              </InlineLabel>
            }
            style={{ height: '100%' }}
          >
            <InlineSwitch
              data-testid="use-window-func-for-macros"
              width="auto"
              value={query.useWindowFuncForMacros}
              onChange={() => handleToggleField('useWindowFuncForMacros')}
              transparent
            />
          </InlineField>
        </InlineFieldRow>
        <InlineFieldRow>
          {!isAnnotationView && (
            <InlineField label={<InlineLabel width={'auto'}>Format As</InlineLabel>}>
              <Select
                width={'auto'}
                data-testid="format-as-select"
                onChange={(e) => handleFormatChange(e.value)}
                options={FORMAT_OPTIONS}
                value={query.format}
              />
            </InlineField>
          )}
          {query.format === 'logs' && (
            <InlineField label={<InlineLabel width={'auto'}>Context window</InlineLabel>}>
              <Select
                width={'auto'}
                data-testid="context-window-size-select"
                onChange={(e) => handleContextWindowChange(e.value)}
                options={['10', '20', '50', '100'].map((value) => ({ label: value + ' entries', value }))}
                value={query.contextWindowSize}
              />
            </InlineField>
          )}
          <InlineField>
            <ToolbarButton variant={'primary'} onClick={() => handleToggleField('showHelp')} isOpen={query.showHelp}>
              Show help
            </ToolbarButton>
          </InlineField>
          <InlineField>
            <ToolbarButton
              variant={'primary'}
              onClick={() => handleToggleField('showFormattedSQL')}
              isOpen={query.showFormattedSQL}
            >
              Show generated SQL
            </ToolbarButton>
          </InlineField>
        </InlineFieldRow>
        <FormattedSQL sql={sqlFormattedData} showFormattedSQL={query.showFormattedSQL} />
        {query.showHelp && <QueryMacrosInfo />}
      </div>
    </>
  );
};
