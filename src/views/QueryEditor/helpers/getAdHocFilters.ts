import { getTemplateSrv } from '@grafana/runtime';
import { AdHocVariableModel } from '@grafana/data';

export const getAdhocFilters = (datasourceName, datasourceUid: any) => {
  const templateSrv = getTemplateSrv();
  const adhocVariables: any[] = templateSrv
    .getVariables()
    .filter((variable) => variable.type === 'adhoc') as AdHocVariableModel[];
  let filters: AdHocVariableModel[] = [];
  
  for (const variable of adhocVariables) {
    let variableUid = variable.datasource?.uid;
    
    if (!variableUid) {
      continue;
    }
    
    // Resolve variable references if present
    if (typeof variableUid === 'string' && variableUid.includes('$')) {
      try {
        // Replace variables in the UID (e.g., ${query1} -> P788589A3A7614F2B)
        variableUid = templateSrv.replace(variableUid);
      } catch (e) {
        // If variable resolution fails, skip this filter
        console.warn('Failed to resolve datasource variable:', variableUid, e);
        continue;
      }
    }
    
    // Now compare resolved UIDs
    if (variableUid === datasourceUid) {
      filters = filters.concat(variable.filters);
    }
  }
  
  return filters;
};
