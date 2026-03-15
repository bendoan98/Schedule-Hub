import { useState } from 'react';
import { parseScheduleCsv } from '../../utils/csv';

export default function CsvImportForm({ weekStart, employees, onImport }) {
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsLoading(true);
    setStatus('Parsing CSV...');

    try {
      const csvText = await file.text();
      const result = parseScheduleCsv(csvText, weekStart, employees);
      const importStatus = await onImport(result);
      setStatus(importStatus ?? `Imported ${result.rowCount} rows and ${result.importedShifts.length} shifts.`);
    } catch (error) {
      setStatus(`Import failed: ${error.message}`);
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  }

  return (
    <section className="panel csv-panel">
      <h3>CSV Import</h3>
      <p>Accepted columns: role, employee_name, monday through sunday.</p>
      <label className="file-input-label">
        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} disabled={isLoading} />
        <span>{isLoading ? 'Importing...' : 'Upload CSV'}</span>
      </label>
      {status ? <p className="status-message">{status}</p> : null}
    </section>
  );
}
