import { useEffect, useRef, useState } from 'react';
import { parseScheduleCsv } from '../../utils/csv';
import { fromIsoDate, getMonday, toIsoDate } from '../../utils/date';
import PanelSection from '../../components/ui/PanelSection';

function normalizeWeekStart(weekValue, fallbackWeekStart) {
  if (!weekValue) {
    return fallbackWeekStart;
  }

  const parsed = fromIsoDate(weekValue);

  if (Number.isNaN(parsed.getTime())) {
    return fallbackWeekStart;
  }

  return toIsoDate(getMonday(parsed));
}

export default function CsvImportForm({ weekStart, employees, onImport, compact = false }) {
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [importWeekStart, setImportWeekStart] = useState(weekStart);
  const inputRef = useRef(null);

  useEffect(() => {
    setImportWeekStart(weekStart);
  }, [weekStart]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsLoading(true);
    setStatus('Parsing CSV...');

    try {
      const csvText = await file.text();
      const selectedWeekStart = normalizeWeekStart(importWeekStart, weekStart);
      const result = parseScheduleCsv(csvText, selectedWeekStart, employees);
      const importStatus = await onImport(result, selectedWeekStart);
      setStatus(importStatus ?? `Imported ${result.rowCount} rows and ${result.importedShifts.length} shifts.`);
    } catch (error) {
      setStatus(`Import failed: ${error.message}`);
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  }

  if (compact) {
    return (
      <div className="csv-import-inline">
        <label className="csv-week-field">
          Week of
          <input
            type="date"
            value={importWeekStart}
            onChange={(event) => setImportWeekStart(event.target.value)}
            disabled={isLoading}
          />
        </label>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={isLoading}
          className="sr-only-file-input"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          title="Accepted columns: role, employee_name, monday through sunday."
        >
          {isLoading ? 'Importing...' : 'Import CSV'}
        </button>
        {status ? <small className="csv-inline-status">{status}</small> : null}
      </div>
    );
  }

  return (
    <PanelSection
      className="panel csv-panel"
      title="CSV Import"
      description="Accepted columns: role, employee_name, monday through sunday."
    >
      <label className="csv-week-field">
        Week of
        <input
          type="date"
          value={importWeekStart}
          onChange={(event) => setImportWeekStart(event.target.value)}
          disabled={isLoading}
        />
      </label>
      <small className="csv-week-help">Imported shifts are saved to the Monday of this selected week.</small>
      <label className="file-input-label">
        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} disabled={isLoading} />
        <span>{isLoading ? 'Importing...' : 'Upload CSV'}</span>
      </label>
      {status ? <p className="status-message">{status}</p> : null}
    </PanelSection>
  );
}
