import {SelectableValue} from "@grafana/data";
import {DatasourceMode} from "../../../../types/types";

export interface Query {
  extrapolate: boolean;
  interval?: string;
  intervalFactor?: number;
  round?: string;
  add_metadata?: boolean;
  skip_comments?: boolean;
  nullifySparse?: boolean;
  useWindowFuncForMacros?: boolean;
  format: string;
  contextWindowSize?: string;
  showHelp: boolean;
  showFormattedSQL: boolean;
  datasourceMode?: DatasourceMode;
}

export interface AdhocFilter {
  key: string;
  operator: string;
  value: string;
}

export interface AdhocFilterTagsProps {
  adhocFilters: AdhocFilter[];
  areAdHocFiltersAvailable: boolean;
  onFieldChange: (params: { fieldName: string; value: any }) => void;
}

export interface SwitchProps {
  query: Query;
  onChange: () => void;
}

export interface InputProps {
  query: Query;
  handleStepChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface ResolutionInputProps {
  query: Query;
  handleResolutionChange: (value: number) => void;
}

export interface RoundInputProps {
  query: Query;
  handleRoundChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface SelectProps {
  query: Query;
  onChange: (e:  SelectableValue<string>) => void;
}

export interface ToolbarButtonsProps {
  showHelp: boolean;
  showFormattedSQL: boolean;
  onToggleHelp: () => void;
  onToggleSQL: () => void;
}

export interface QueryTextEditorProps {
  query: Query;
  onSqlChange: (sql: string) => void;
  onFieldChange: (params: { fieldName: string; value: any }) => void;
  formattedData: string;
  onRunQuery: () => void;
  datasource: any;
  isAnnotationView: boolean;
  adhocFilters: AdhocFilter[];
  areAdHocFiltersAvailable: boolean;
}

export interface QueryHandlersProps {
  onFieldChange: (params: { fieldName: string; value: any }) => void;
  query: Query;
}
