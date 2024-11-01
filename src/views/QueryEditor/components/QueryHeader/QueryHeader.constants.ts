import {SelectableValue} from "@grafana/data";
import {EditorMode} from "../../../../types/types";
import {E2ESelectors} from "@grafana/e2e-selectors";

const Components = {
  QueryEditor: {
    EditorMode: {
      options: {
        QuerySettings: 'Query Settings',
        SQLEditor: 'SQL Editor',
      },
    },
  },
};

const selectors: { components: E2ESelectors<typeof Components> } = {
  components: Components,
};

export const QueryHeaderTabs: Array<SelectableValue<EditorMode>> = [
  { label: selectors.components.QueryEditor.EditorMode.options.QuerySettings, value: EditorMode.Builder },
  { label: selectors.components.QueryEditor.EditorMode.options.SQLEditor, value: EditorMode.SQL },
];
