import { getTemplateSrv } from '@grafana/runtime';
import macros from '../components/QueryTextEditor/editor/constants/macros';

/**
 * Detects potential name intersections between Grafana template variables and ClickHouse macros
 * Returns an array of conflicting names
 */
export function detectVariableMacroIntersections(): string[] {
  const templateSrv = getTemplateSrv();
  const variables = templateSrv.getVariables();
  const conflicts: string[] = [];

  const variableNames = variables.map(variable => `$${variable.name}`);

  // Check for intersections with macros
  for (const variableName of variableNames) {
    if (macros.includes(variableName)) {
      conflicts.push(variableName);
    }
  }

  return conflicts;
}

/**
 * Creates a warning message for variable/macro name conflicts
 */
export function createVariableMacroConflictWarning(conflicts: string[]): string {
  if (conflicts.length === 0) {
    return '';
  }

  const conflictList = conflicts.join(', ');
  
  if (conflicts.length === 1) {
    return `Template variable "${conflictList}" has the same name as a ClickHouse macro. This may cause unexpected behavior during query processing.`;
  } else {
    return `Template variables "${conflictList}" have the same names as ClickHouse macros. This may cause unexpected behavior during query processing.`;
  }
}
