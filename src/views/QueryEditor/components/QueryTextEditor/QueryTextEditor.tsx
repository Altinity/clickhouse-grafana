import React, { useEffect, useState } from 'react';
import { InlineFieldRow } from '@grafana/ui';
import { SQLCodeEditor } from './SQLCodeEditor';
import { FormattedSQL } from './FormattedSQL';
import QueryMacrosInfo from './QueryMacrosInfo';
import { useQueryHandlers } from './hooks/useQueryHandlers';
import { QueryTextEditorProps } from './types';
import {
  AdhocFilterTags,
  ExtrapolationSwitch,
  StepInput,
  ResolutionsInput,
  RoundInput,
  MetadataSwitch,
  SkipCommentsSwitch,
  UseWindowFunctionSwitch,
  FormatAsSelect,
  ContextWindowSizeSelect,
  ToolbarButtons,
} from './components';
import {DatasourceMode} from "../../../../types/types";

export const QueryTextEditor: React.FC<QueryTextEditorProps> = ({
  query,
  onSqlChange,
  onFieldChange,
  formattedData,
  onRunQuery,
  datasource,
  isAnnotationView,
  adhocFilters,
  areAdHocFiltersAvailable,
}) => {
  const [sqlFormattedData, setSqlFormattedData] = useState(formattedData);
  const handlers = useQueryHandlers({ onFieldChange, query });

  useEffect(() => {
    setSqlFormattedData(formattedData);
    // eslint-disable-next-line
  }, [formattedData]);

  return (
    <>
      <SQLCodeEditor
        datasource={datasource}
        onSqlChange={onSqlChange}
        query={query}
        onRunQuery={onRunQuery}
      />
      <AdhocFilterTags
        adhocFilters={adhocFilters}
        areAdHocFiltersAvailable={areAdHocFiltersAvailable}
        onFieldChange={onFieldChange}
      />
      <div className="gf-form" style={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
        <InlineFieldRow>
          <ExtrapolationSwitch
            query={query}
            onChange={() => handlers.handleToggleField('extrapolate')}
          />
          <StepInput
            query={query}
            handleStepChange={handlers.handleStepChange}
          />
          <ResolutionsInput
            query={query}
            handleResolutionChange={handlers.handleResolutionChange}
          />
          <RoundInput
            query={query}
            handleRoundChange={handlers.handleRoundChange}
          />
        </InlineFieldRow>
        <InlineFieldRow>
          <MetadataSwitch
            query={query}
            onChange={() => handlers.handleToggleField('add_metadata')}
          />
          <SkipCommentsSwitch
            query={query}
            onChange={() => handlers.handleToggleField('skip_comments')}
          />
          <UseWindowFunctionSwitch
            query={query}
            onChange={() => handlers.handleToggleField('useWindowFuncForMacros')}
          />
        </InlineFieldRow>
        <InlineFieldRow>
          {(!isAnnotationView && query.datasourceMode !== DatasourceMode.Variable) && (
            <FormatAsSelect
              query={query}
              onChange={(e: any) => handlers.handleFormatChange(e.value)}
            />
          )}
          {query.format === 'logs' && (
            <ContextWindowSizeSelect
              query={query}
              onChange={(e: any) => handlers.handleContextWindowChange(e.value)}
            />
          )}
          <ToolbarButtons
            showHelp={query.showHelp}
            showFormattedSQL={query.showFormattedSQL}
            onToggleHelp={() => handlers.handleToggleField('showHelp')}
            onToggleSQL={() => handlers.handleToggleField('showFormattedSQL')}
          />
        </InlineFieldRow>
        <FormattedSQL sql={sqlFormattedData} showFormattedSQL={query.showFormattedSQL} />
        {query.showHelp && <QueryMacrosInfo />}
      </div>
    </>
  );
};
