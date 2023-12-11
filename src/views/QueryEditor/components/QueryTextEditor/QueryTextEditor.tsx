import React, { useState } from 'react';
import { InlineField, InlineFieldRow, InlineLabel, InlineSwitch, Input, Select, ToolbarButton } from '@grafana/ui';
import ReformattedQuery from './ReformattedQuery';
import QueryMacrosInfo from './QueryMacrosInfo';
import { SQLCodeEditor } from './SQLCodeEditor';

export const QueryTextEditor = ({ query, height, onEditorMount, onSqlChange, onFieldChange, formattedData }: any) => {
  const [fieldValues, setFieldValues] = useState({
    step: '',
    intervalFactor: 1,
    round: '',
    formatAs: 'time_series',
    extrapolate: query.extrapolate,
    skip_comments: query.skip_comments,
    showFormattedSQL: false,
    showHelp: false,
  });

  const handleStepChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFieldValues({ ...fieldValues, step: event.target.value });
    onFieldChange({ ...fieldValues, step: event.target.value });
  };

  const handleResolutionChange = (value: number) => {
    setFieldValues({ ...fieldValues, intervalFactor: value });
    onFieldChange({ ...fieldValues, intervalFactor: value });
  };

  const handleRoundChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFieldValues({ ...fieldValues, round: event.target.value });
    onFieldChange({ ...fieldValues, round: event.target.value });
  };

  const handleFormatAsChange = (value: string | undefined) => {
    // @ts-ignore
    setFieldValues({ ...fieldValues, formatAs: value });
    onFieldChange({ ...fieldValues, formatAs: value });
  };

  const handleExtrapolationChange = () => {
    setFieldValues({ ...fieldValues, extrapolate: !fieldValues.extrapolate });
    onFieldChange({ ...fieldValues, extrapolate: !fieldValues.extrapolate });
  };

  const handleSkipCommentsChange = () => {
    setFieldValues({ ...fieldValues, skip_comments: !fieldValues.skip_comments });
    onFieldChange({ ...fieldValues, skip_comments: !fieldValues.skip_comments });
  };

  const handleShowFormattedSQLChange = () => {
    setFieldValues({ ...fieldValues, showFormattedSQL: !fieldValues.showFormattedSQL });
    onFieldChange({ ...fieldValues, showFormattedSQL: !fieldValues.showFormattedSQL });
  };

  const handleShowHelpChange = () => {
    setFieldValues({ ...fieldValues, showHelp: !fieldValues.showHelp });
    onFieldChange({ ...fieldValues, showHelp: !fieldValues.showHelp });
  };

  return (
    <>
      <SQLCodeEditor height={height} onSqlChange={onSqlChange} query={query} onEditorMount={onEditorMount} />
      <div className="gf-form" style={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
        <InlineFieldRow>
          <InlineField
            label={
              <InlineLabel width={18} tooltip="Turn on if you don't like when last data point in time series much lower then previous" >
                {' '}
                Extrapolation{' '}
              </InlineLabel>
            }

          >
            <InlineSwitch transparent value={fieldValues.extrapolate} onChange={handleExtrapolationChange}  />
          </InlineField>
          <InlineField
            label={
              <InlineLabel width={10}  tooltip={'Leave blank for auto handling based on time range and panel width'} >
                Step
              </InlineLabel>
            }
            
          >
            <Input placeholder="" onChange={handleStepChange} value={fieldValues.step} />
          </InlineField>
          <InlineField
            label={
              <InlineLabel width={'auto'} >
                Resolution
              </InlineLabel>
            }
            
          >
            <Select
              width={'auto'}
              onChange={(e) => handleResolutionChange(Number(e.value))}
              options={[
                { value: 1, label: '1/1' },
                { value: 2, label: '1/2' },
                { value: 3, label: '1/3' },
                { value: 4, label: '1/4' },
                { value: 5, label: '1/5' },
                { value: 10, label: '1/10' },
              ]}
              value={fieldValues.intervalFactor}
            />
          </InlineField>
          <InlineField
            label={
              <InlineLabel width={'auto'} >
                Format As
              </InlineLabel>
            }

          >
            <Select
              width={'auto'}
              onChange={(e) => handleFormatAsChange(e.value)}
              options={[
                { label: 'Time series', value: 'time_series' },
                { label: 'Table', value: 'table' },
                { label: 'Logs', value: 'logs' },
              ]}
              value={fieldValues.formatAs}
            />
          </InlineField>
        </InlineFieldRow>
        <InlineFieldRow>
          <InlineField
            label={
              <InlineLabel width={18} tooltip="Turn off if you would like pass comments in SQL query to server" >
                {' '}
                Skip Comments{' '}
              </InlineLabel>
            }
            style={{ height: '100%' }}

          >
            <InlineSwitch
              width="auto"
              value={fieldValues.skip_comments}
              onChange={handleSkipCommentsChange}
              transparent
            />
          </InlineField>
          <InlineField
            label={
              <InlineLabel width={10} tooltip={<div>
                Set rounding for `$from` and `$to` timestamps.<br/>
                For example, if set `1m` - both `$from` and `$to` will be rounded to beginning of minute.<br/><br/>
                Or set to `$step` to automatically adjust according to `Step * Resolution` value. <br/><br/>
                It will make all requests similar during one minute which is good for caching.
              </div>} >
                Round
              </InlineLabel>
            }

          >
            <Input placeholder="" onChange={handleRoundChange} value={fieldValues.round} />
          </InlineField>
          <InlineField >
            <ToolbarButton variant={'primary'} onClick={handleShowHelpChange} isOpen={fieldValues.showHelp}>
              Show help
            </ToolbarButton>
          </InlineField>
          <InlineField >
            <ToolbarButton
              variant={'primary'}
              onClick={handleShowFormattedSQLChange}
              isOpen={fieldValues.showFormattedSQL}
            >
              Show generated SQL
            </ToolbarButton>
          </InlineField>
          <InlineField  tooltip={'Reformat SQL query as ClickHouse do.'}>
            <ToolbarButton variant={'primary'}>Reformat Query</ToolbarButton>
          </InlineField>
        </InlineFieldRow>
        <InlineFieldRow>
          {/*<InlineField >*/}
          {/*  <ToolbarButton variant={'primary'} onClick={handleShowHelpChange} isOpen={fieldValues.showHelp}>*/}
          {/*    Show help*/}
          {/*  </ToolbarButton>*/}
          {/*</InlineField>*/}
          {/*<InlineField >*/}
          {/*  <ToolbarButton*/}
          {/*    variant={'primary'}*/}
          {/*    onClick={handleShowFormattedSQLChange}*/}
          {/*    isOpen={fieldValues.showFormattedSQL}*/}
          {/*  >*/}
          {/*    Show generated SQL*/}
          {/*  </ToolbarButton>*/}
          {/*</InlineField>*/}
        </InlineFieldRow>
        {fieldValues.showFormattedSQL && <ReformattedQuery data={formattedData} />}
        {fieldValues.showHelp && <QueryMacrosInfo />}
      </div>
    </>
  );
};
