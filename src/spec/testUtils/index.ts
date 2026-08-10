import { fireEvent, screen } from '@testing-library/react';

// jsdom shims required by @grafana/ui (matchMedia is shimmed globally in .config/jest-setup.js)
if (!(window as any).ResizeObserver) {
  (window as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (!(window as any).IntersectionObserver) {
  (window as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

export const makeOptions = (jsonData: any = {}, overrides: any = {}) => ({
  id: 1,
  uid: 'uid-1',
  orgId: 1,
  name: 'clickhouse-test',
  type: 'vertamedia-clickhouse-datasource',
  typeName: 'ClickHouse',
  typeLogoUrl: '',
  access: 'proxy',
  url: '',
  user: '',
  database: '',
  basicAuth: '',
  basicAuthUser: '',
  isDefault: false,
  readOnly: false,
  withCredentials: false,
  version: 2,
  secureJsonFields: {},
  secureJsonData: {},
  jsonData: { dataSourceUrl: '', ...jsonData },
  ...overrides,
});

export const makeQuery = (overrides: any = {}) => ({
  refId: 'A',
  query: '',
  ...overrides,
});

// Grafana Select: open menu via keyboard, then click the option by its text
export const selectOption = async (input: HTMLElement, optionText: string) => {
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.click(await screen.findByText(optionText));
};
