import { newId } from './id';

const DAY_COLUMNS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function splitCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseRows(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());

  return lines.slice(1).map((line) => {
    const rowValues = splitCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = rowValues[index] ?? '';
    });

    return row;
  });
}

function parseTimeRange(value) {
  const [startTime, endTime] = value.split('-').map((part) => part.trim());

  if (!startTime || !endTime) {
    return null;
  }

  return { startTime, endTime };
}

function normalizeRole(value) {
  return value?.toLowerCase() === 'manager' ? 'manager' : 'employee';
}

export function parseScheduleCsv(csvText, weekStart, existingEmployees = []) {
  const rows = parseRows(csvText);
  const employeeByName = new Map();
  const importedEmployees = [];
  const importedShifts = [];

  for (const employee of existingEmployees) {
    employeeByName.set(employee.name.toLowerCase(), employee);
  }

  for (const row of rows) {
    const employeeName = row.employee_name?.trim();

    if (!employeeName) {
      continue;
    }

    const lookupKey = employeeName.toLowerCase();
    let employee = employeeByName.get(lookupKey);

    if (!employee) {
      employee = {
        id: newId(),
        name: employeeName,
        email: `${employeeName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        role: normalizeRole(row.role),
        department: null,
        colorIndex: employeeByName.size % 8
      };

      employeeByName.set(lookupKey, employee);
      importedEmployees.push(employee);
    }

    DAY_COLUMNS.forEach((column, day) => {
      const value = row[column]?.trim();

      if (!value) {
        return;
      }

      const parsedRange = parseTimeRange(value);

      if (!parsedRange) {
        return;
      }

      importedShifts.push({
        id: newId(),
        employeeId: employee.id,
        day,
        startTime: parsedRange.startTime,
        endTime: parsedRange.endTime,
        weekStart
      });
    });
  }

  return {
    importedEmployees,
    importedShifts,
    rowCount: rows.length
  };
}
