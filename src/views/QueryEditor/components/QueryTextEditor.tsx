import React, { useState } from "react";
import {
  CodeEditor,
  InlineField,
  InlineFieldRow,
  InlineLabel,
  InlineSwitch,
  Input,
  Select,
  ToolbarButton,
} from "@grafana/ui";
import ReformattedQuery from "./ReformattedQuery";
import QueryMacrosInfo from "./QueryMacrosInfo";

export const QueryTextEditor = ({ query, height, onEditorMount, onSqlChange, onFieldChange }: any) => {
  console.log(query.extrapolate, query.skip_comments);
  const [fieldValues, setFieldValues] = useState({
    step: "",
    resolution: 1,
    round: "",
    formatAs: "time_series",
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
    setFieldValues({ ...fieldValues, resolution: value });
    onFieldChange({ ...fieldValues, resolution: value });
  };

  const handleRoundChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFieldValues({ ...fieldValues, round: event.target.value });
    onFieldChange({ ...fieldValues, round: event.target.value });
  };

  const handleFormatAsChange = (value: string) => {
    setFieldValues({ ...fieldValues, formatAs: value });
    onFieldChange({ ...fieldValues, formatAs: value });
  };

  const handleExtrapolationChange = (event: boolean) => {
    setFieldValues({ ...fieldValues, extrapolate: !fieldValues.extrapolate});
    onFieldChange({ ...fieldValues, extrapolate: !fieldValues.extrapolate });
  };

  const handleSkipCommentsChange = (value: boolean) => {
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
      <div style={{ position: "relative", width: "100%", marginTop: "10px" }}>
        <CodeEditor
          aria-label="SQL"
          height={height}
          language="sql"
          value={query.query || ""}
          showMiniMap={false}
          showLineNumbers={true}
          onSave={onSqlChange}
          onBlur={(sql) => onSqlChange(sql)}
          onEditorDidMount={onEditorMount}
        />
      </div>
      <div className="gf-form" style={{ display: "flex", flexDirection: "column", marginTop: "10px" }}>
        <InlineFieldRow>
          <InlineField label={"Step"} transparent>
            <Input placeholder="Label" onChange={handleStepChange} value={fieldValues.step} />
          </InlineField>
          <InlineField label={"Resolution"} transparent>
            <Select
              width={16}
              onChange={(e) => handleResolutionChange(Number(e.value))}
              options={[
                { value: 1, label: "1/1" },
                { value: 2, label: "1/2" },
                { value: 3, label: "1/3" },
                { value: 4, label: "1/4" },
                { value: 5, label: "1/5" },
                { value: 10, label: "1/10" },
              ]}
              value={fieldValues.resolution.toString()}
            />
          </InlineField>
          <InlineField label="Round" transparent>
            <Input placeholder="Label" onChange={handleRoundChange} value={fieldValues.round} />
          </InlineField>
        </InlineFieldRow>
        <InlineFieldRow>
          <InlineField label="Format as" transparent>
            <Select
              width={16}
              onChange={(e) => handleFormatAsChange(e.value)}
              options={[
                { label: "Time series", value: "time_series" },
                { label: "Table", value: "table" },
                { label: "Logs", value: "logs" },
              ]}
              value={fieldValues.formatAs}
            />
          </InlineField>
          <InlineField
            label={<InlineLabel width="auto" tooltip="Tooltip content" transparent> Extrapolation </InlineLabel>}
            transparent
          >
            <InlineSwitch value={fieldValues.extrapolate} onChange={handleExtrapolationChange} transparent />
          </InlineField>
          <InlineField
            label={<InlineLabel width="auto" tooltip="Tooltip content" transparent> Skip Comments </InlineLabel>}
            style={{ height: "100%" }}
            transparent
          >
            <InlineSwitch value={fieldValues.skip_comments} onChange={handleSkipCommentsChange} transparent />
          </InlineField>
          <InlineField transparent>
            <ToolbarButton onClick={handleShowHelpChange} isOpen={fieldValues.showHelp}>
              Show help
            </ToolbarButton>
          </InlineField>
          <InlineField transparent>
            <ToolbarButton onClick={handleShowFormattedSQLChange} isOpen={fieldValues.showFormattedSQL}>
              Show reformatted SQL
            </ToolbarButton>
          </InlineField>
          <InlineField transparent>
            <ToolbarButton>Generate query</ToolbarButton>
          </InlineField>
        </InlineFieldRow>
        {fieldValues.showFormattedSQL && <ReformattedQuery />}
        {fieldValues.showHelp && <QueryMacrosInfo />}
      </div>
    </>
  );
};
