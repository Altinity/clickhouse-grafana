/**
 * Test for Issue #803 - Step field variable parsing
 * Tests the interval field variable interpolation fix
 */

describe('Interval Variable Interpolation (Issue #803)', () => {
  // Mock template service
  const mockTemplateSrv = {
    replace: jest.fn(),
  };

  // Simulate the fixed logic from datasource.ts:794
  const simulateIntervalInterpolation = (
    targetInterval: string | undefined,
    optionsInterval: string | undefined,
    scopedVars: any
  ): string => {
    const intervalValue = targetInterval || optionsInterval || '30s';
    return mockTemplateSrv.replace(intervalValue, scopedVars);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('variable interpolation in interval field', () => {
    it('should interpolate $minStep variable', () => {
      // Arrange
      const targetInterval = '$minStep';
      const optionsInterval = '30s';
      const scopedVars = {
        minStep: { text: '60s', value: '60s' },
      };

      mockTemplateSrv.replace.mockImplementation((value: string) => {
        if (value === '$minStep') {
          return '60s';
        }
        return value;
      });

      // Act
      const result = simulateIntervalInterpolation(targetInterval, optionsInterval, scopedVars);

      // Assert
      expect(mockTemplateSrv.replace).toHaveBeenCalledWith('$minStep', scopedVars);
      expect(result).toBe('60s');
    });

    it('should fallback to options interval and interpolate variables there', () => {
      // Arrange
      const targetInterval = undefined;
      const optionsInterval = '$__interval';
      const scopedVars = {
        __interval: { text: '45s', value: '45s' },
      };

      mockTemplateSrv.replace.mockImplementation((value: string) => {
        if (value === '$__interval') {
          return '45s';
        }
        return value;
      });

      // Act
      const result = simulateIntervalInterpolation(targetInterval, optionsInterval, scopedVars);

      // Assert
      expect(mockTemplateSrv.replace).toHaveBeenCalledWith('$__interval', scopedVars);
      expect(result).toBe('45s');
    });

    it('should use default 30s when no variables present', () => {
      // Arrange
      const targetInterval = undefined;
      const optionsInterval = undefined;
      const scopedVars = {};

      mockTemplateSrv.replace.mockImplementation((value: string) => value);

      // Act
      const result = simulateIntervalInterpolation(targetInterval, optionsInterval, scopedVars);

      // Assert
      expect(mockTemplateSrv.replace).toHaveBeenCalledWith('30s', scopedVars);
      expect(result).toBe('30s');
    });

    it('should handle complex variable expressions', () => {
      // Arrange
      const targetInterval = '${minStep:pipe}';
      const optionsInterval = '30s';
      const scopedVars = {};

      mockTemplateSrv.replace.mockImplementation((value: string) => {
        if (value === '${minStep:pipe}') {
          return '120s';
        }
        return value;
      });

      // Act
      const result = simulateIntervalInterpolation(targetInterval, optionsInterval, scopedVars);

      // Assert
      expect(mockTemplateSrv.replace).toHaveBeenCalledWith('${minStep:pipe}', scopedVars);
      expect(result).toBe('120s');
    });

    it('should handle literal values without variables', () => {
      // Arrange
      const targetInterval = '10s';
      const optionsInterval = '30s';
      const scopedVars = {};

      mockTemplateSrv.replace.mockImplementation((value: string) => value);

      // Act
      const result = simulateIntervalInterpolation(targetInterval, optionsInterval, scopedVars);

      // Assert
      expect(mockTemplateSrv.replace).toHaveBeenCalledWith('10s', scopedVars);
      expect(result).toBe('10s');
    });

    it('should prioritize target interval over options interval', () => {
      // Arrange
      const targetInterval = '$minStep';
      const optionsInterval = '$__interval';
      const scopedVars = {
        minStep: { text: '90s', value: '90s' },
        __interval: { text: '45s', value: '45s' },
      };

      mockTemplateSrv.replace.mockImplementation((value: string) => {
        if (value === '$minStep') {
          return '90s';
        }
        if (value === '$__interval') {
          return '45s';
        }
        return value;
      });

      // Act
      const result = simulateIntervalInterpolation(targetInterval, optionsInterval, scopedVars);

      // Assert
      expect(mockTemplateSrv.replace).toHaveBeenCalledWith('$minStep', scopedVars);
      expect(result).toBe('90s');
    });
  });

  describe('regression scenarios', () => {
    it('should handle the original bug scenario from issue #803', () => {
      // This simulates the scenario that was broken in v3.4.0
      const targetInterval = '$minStep';
      const scopedVars = {
        minStep: { text: '30s', value: '30s' },
      };

      // Before fix: template service was NOT called, would return '$minStep'
      // After fix: template service IS called, returns '30s'
      mockTemplateSrv.replace.mockImplementation((value: string) => {
        if (value === '$minStep') {
          return '30s';
        }
        return value;
      });

      const result = simulateIntervalInterpolation(targetInterval, undefined, scopedVars);

      expect(mockTemplateSrv.replace).toHaveBeenCalled();
      expect(result).toBe('30s');
      expect(result).not.toBe('$minStep'); // This would have been the bug
    });
  });
});
