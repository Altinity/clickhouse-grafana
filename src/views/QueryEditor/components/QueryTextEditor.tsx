import React, {useState} from "react";
import {CodeEditor, InlineField, InlineFieldRow, InlineLabel, InlineSwitch, Input, Select, ToolbarButton} from "@grafana/ui";
import ReformattedQuery from "./ReformattedQuery";
import QueryMacrosInfo from "./QueryMacrosInfo";

export const QueryTextEditor = ({query, height, onEditorMount, onSqlChange}: any) => {
  const [showFormattedSQL, setShowFormattedSQL] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  return <>
    <div style={{position:"relative",width:"100%", marginTop: '10px'}}>
      <CodeEditor
        aria-label="SQL"
        height={height}
        language="sql"
        value={query.query || ''}
        showMiniMap={false}
        showLineNumbers={true}
        onSave={onSqlChange}
        onBlur={(sql) => onSqlChange(sql)}
        onEditorDidMount={onEditorMount}
      />
    </div>
    <div className="gf-form" style={{display: 'flex', flexDirection:"column", marginTop: '10px'}}>
      <InlineFieldRow>
        <InlineField label={'Step'} transparent>
          <Input placeholder="Label" />
        </InlineField>
        <InlineField label={'Resolution'} transparent>
          <Select
            width={16}
            onChange={() => {}}
            options={[
              { value: 0, label: '1/1' },
              { value: 1, label: '1/2' },
              { value: 2, label: '1/3' },
              { value:3, label: '1/4' },
              { value: 4, label: '1/5' },
              { value: 5, label: '1/10' },
            ]}
          />
        </InlineField>
        <InlineField label="Round" transparent>
          <Input placeholder="Label" />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label="Format as" transparent>
          <Select
            width={16}
            onChange={() => {}}
            options={[
              {label: 'Time series', value: 'time_series'},
              {label: 'Table', value: 'table'},
              {label: 'Logs', value: 'logs'},
            ]}
          />
        </InlineField>
        <InlineField label={<InlineLabel width="auto" tooltip="Tooltip content" transparent>
          Extrapolation
        </InlineLabel>} transparent>
          <InlineSwitch value={true} onChange={() => {}} transparent/>
        </InlineField>
        <InlineField label={<InlineLabel width="auto" tooltip="Tooltip content" transparent>
          Skip Comments
        </InlineLabel>} style={{height: "100%"}} transparent>
          <InlineSwitch value={true} onChange={() => {}} transparent/>
        </InlineField>
        <InlineField transparent>
          <ToolbarButton
            onClick={() => setShowHelp(!showHelp)}
            isOpen={showHelp}
          >
            Show help
          </ToolbarButton>
        </InlineField>
        <InlineField transparent>
          <ToolbarButton
            isOpen={showFormattedSQL}
            onClick={() => setShowFormattedSQL(!showFormattedSQL)}
          >
            Show reformated SQL
          </ToolbarButton>
        </InlineField>
        <InlineField transparent>
          <ToolbarButton>
            Generate query
          </ToolbarButton>
        </InlineField>
      </InlineFieldRow>
      { showFormattedSQL && <ReformattedQuery/>}
      { showHelp && <QueryMacrosInfo/>}
    </div>
  </>
}
