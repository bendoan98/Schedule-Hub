import { describe, expect, it } from 'vitest';
import {
  buildDepartmentList,
  normalizeDepartmentName,
  toStoredDepartment
} from './department';

describe('department utils', () => {
  it('normalizes and stores department names', () => {
    expect(normalizeDepartmentName('  kitchen ')).toBe('KITCHEN');
    expect(normalizeDepartmentName('')).toBe('');
    expect(toStoredDepartment('')).toBeNull();
    expect(toStoredDepartment('sales')).toBe('SALES');
  });

  it('builds a deduped list without fallback placeholders', () => {
    const result = buildDepartmentList(['sales', 'SALES', 'ops', null]);

    expect(result).not.toContain('UNASSIGNED');
    expect(result).toContain('SALES');
    expect(result).toContain('OPS');
    expect(result.filter((name) => name === 'SALES')).toHaveLength(1);
  });
});
