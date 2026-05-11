/**
 * Tests for log context query generation (Show Context button).
 * Issue #706: WHERE conditions must be in the inner subquery so that
 * all columns from $table are accessible.
 */

import { generateQueryForTimestampBackward, generateQueryForTimestampForward } from './log-context-query';

describe('Log context query generation (issue #706)', () => {
  it('should place WHERE conditions inside the inner subquery, not the outer query', () => {
    const whereConditions = [
      "facility = arrayElement(splitByChar('-', 'MY-SERVICE'), 1)",
      "AND node = arrayElement(splitByChar('-', 'MY-SERVICE'), 2)",
    ];
    const query = generateQueryForTimestampBackward('time', "toDateTime64(1775584028746/1000,3)", whereConditions);
    const outerWhere = query.split(') WHERE')[1];
    expect(outerWhere).not.toContain('facility');
    expect(outerWhere).not.toContain('node');
  });

  it('forward: WHERE conditions should be inside the inner subquery', () => {
    const whereConditions = [
      "facility = arrayElement(splitByChar('-', 'MY-SERVICE'), 1)",
      "AND node = arrayElement(splitByChar('-', 'MY-SERVICE'), 2)",
    ];
    const query = generateQueryForTimestampForward('time', "toDateTime64(1775584028746/1000,3)", whereConditions);
    const outerWhere = query.split(') WHERE')[1];
    expect(outerWhere).not.toContain('facility');
    expect(outerWhere).not.toContain('node');
    const innerQuery = query.split(') WHERE')[0];
    expect(innerQuery).toContain('facility');
  });
});
