import { E2ESelectors } from '@grafana/e2e-selectors';
export const Components = {
  QueryEditor: {
    EditorMode: {
      options: {
        QuerySettings: 'Query Settings2',
        SQLEditor: 'SQL Editor2',
      },
    },
  },
};

export const selectors: { components: E2ESelectors<typeof Components> } = {
  components: Components,
};

