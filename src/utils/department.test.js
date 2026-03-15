import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DEPARTMENT,
  buildDepartmentList,
  normalizeDepartmentName,
  toStoredDepartment
} from './department';

describe('department utils', () => {
  it('normalizes and stores department names', () => {
    expect(normalizeDepartmentName('  kitchen ')).toBe('KITCHEN');
    expect(normalizeDepartmentName('')).toBe('');
    expect(toStoredDepartment('')).toBe(DEFAULT_DEPARTMENT);
    expect(toStoredDepartment('sales')).toBe('SALES');
  });

  it('builds a deduped list and keeps default first', () => {
    const result = buildDepartmentList(['sales', 'SALES', 'ops', null]);

    expect(result[0]).toBe(DEFAULT_DEPARTMENT);
    expect(result).toContain('SALES');
    expect(result).toContain('OPS');
    expect(result.filter((name) => name === 'SALES')).toHaveLength(1);
  });
});
