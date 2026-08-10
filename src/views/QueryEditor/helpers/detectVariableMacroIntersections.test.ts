import {
  detectVariableMacroIntersections,
  createVariableMacroConflictWarning,
} from './detectVariableMacroIntersections';

const mockTemplateSrv = { getVariables: jest.fn() };

jest.mock('@grafana/runtime', () => ({
  getTemplateSrv: () => mockTemplateSrv,
}));

describe('detectVariableMacroIntersections', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns [] when there are no variables', () => {
    mockTemplateSrv.getVariables.mockReturnValue([]);
    expect(detectVariableMacroIntersections()).toEqual([]);
  });

  it('detects a variable colliding with a macro ($ is prepended before compare)', () => {
    mockTemplateSrv.getVariables.mockReturnValue([{ name: 'table' }, { name: 'rate' }]);
    expect(detectVariableMacroIntersections()).toEqual(['$table', '$rate']);
  });

  it('ignores non-conflicting variables', () => {
    mockTemplateSrv.getVariables.mockReturnValue([{ name: 'my_var' }, { name: 'env' }]);
    expect(detectVariableMacroIntersections()).toEqual([]);
  });
});

describe('createVariableMacroConflictWarning', () => {
  it('returns empty string for no conflicts', () => {
    expect(createVariableMacroConflictWarning([])).toBe('');
  });

  it('uses singular wording for one conflict', () => {
    expect(createVariableMacroConflictWarning(['$table'])).toBe(
      'Template variable "$table" has the same name as a ClickHouse macro. This may cause unexpected behavior during query processing.'
    );
  });

  it('uses plural wording for several conflicts', () => {
    expect(createVariableMacroConflictWarning(['$table', '$from'])).toBe(
      'Template variables "$table, $from" have the same names as ClickHouse macros. This may cause unexpected behavior during query processing.'
    );
  });
});
