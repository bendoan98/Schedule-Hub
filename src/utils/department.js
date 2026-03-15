export const DEFAULT_DEPARTMENT = 'UNASSIGNED';

export function normalizeDepartmentName(value) {
  const normalized = `${value ?? ''}`.trim();

  if (!normalized) {
    return '';
  }

  return normalized.toUpperCase();
}

export function toStoredDepartment(value) {
  return normalizeDepartmentName(value) || DEFAULT_DEPARTMENT;
}

export function buildDepartmentList(values = []) {
  const deduped = new Set();
  const departments = [];

  values.forEach((value) => {
    const normalized = toStoredDepartment(value);

    if (deduped.has(normalized)) {
      return;
    }

    deduped.add(normalized);
    departments.push(normalized);
  });

  if (!deduped.has(DEFAULT_DEPARTMENT)) {
    departments.unshift(DEFAULT_DEPARTMENT);
  }

  return departments.sort((left, right) => {
    if (left === DEFAULT_DEPARTMENT) {
      return -1;
    }

    if (right === DEFAULT_DEPARTMENT) {
      return 1;
    }

    return left.localeCompare(right);
  });
}
