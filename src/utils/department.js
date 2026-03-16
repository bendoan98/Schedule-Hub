export function normalizeDepartmentName(value) {
  const normalized = `${value ?? ''}`.trim();

  if (!normalized) {
    return '';
  }

  return normalized.toUpperCase();
}

export function toStoredDepartment(value) {
  return normalizeDepartmentName(value) || null;
}

export function buildDepartmentList(values = []) {
  const deduped = new Set();
  const departments = [];

  values.forEach((value) => {
    const normalized = normalizeDepartmentName(value);

    if (!normalized) {
      return;
    }

    if (deduped.has(normalized)) {
      return;
    }

    deduped.add(normalized);
    departments.push(normalized);
  });

  return departments.sort((left, right) => left.localeCompare(right));
}
