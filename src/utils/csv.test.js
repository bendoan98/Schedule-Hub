import { describe, expect, it } from 'vitest';
import { parseScheduleCsv } from './csv';

describe('parseScheduleCsv', () => {
  it('imports new employees and valid shifts', () => {
    const csv = [
      'employee_name,role,monday,tuesday',
      'Alex Rivera,manager,09:00-17:00,',
      'Sam Lee,employee,10:00-18:00,invalid'
    ].join('\n');

    const result = parseScheduleCsv(csv, '2026-03-09', [
      {
        id: 'emp-alex',
        name: 'Alex Rivera',
        email: 'alex@example.com',
        role: 'manager',
        department: null,
        colorIndex: 0
      }
    ]);

    expect(result.rowCount).toBe(2);
    expect(result.importedEmployees).toHaveLength(1);
    expect(result.importedEmployees[0].name).toBe('Sam Lee');
    expect(result.importedShifts).toHaveLength(2);
    expect(result.importedShifts.every((shift) => shift.weekStart === '2026-03-09')).toBe(true);
  });

  it('handles quoted values and ignores rows without employee names', () => {
    const csv = [
      'employee_name,role,monday',
      '"Taylor, Jr",employee,08:00-12:00',
      ',employee,09:00-11:00'
    ].join('\n');

    const result = parseScheduleCsv(csv, '2026-03-09');

    expect(result.rowCount).toBe(2);
    expect(result.importedEmployees).toHaveLength(1);
    expect(result.importedEmployees[0].name).toBe('Taylor, Jr');
    expect(result.importedShifts).toHaveLength(1);
  });
});
