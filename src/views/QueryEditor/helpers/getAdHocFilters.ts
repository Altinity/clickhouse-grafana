import { getTemplateSrv } from '@grafana/runtime';
import { AdHocVariableModel } from '@grafana/data';

export const getAdhocFilters = (datasourceName, datasourceUid: any) => {
  const templateSrv = getTemplateSrv();
  const adhocVariables: any[] = templateSrv
    .getVariables()
    .filter((variable) => variable.type === 'adhoc') as AdHocVariableModel[];
  let filters: AdHocVariableModel[] = [];
  // ts-ignore
  for (const variable of adhocVariables) {
    const variableUid = variable.datasource?.uid;

    if (variableUid === datasourceUid) {
      filters = filters.concat(variable.filters);
    }
  }

  return filters;
};
