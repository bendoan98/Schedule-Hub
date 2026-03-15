// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CsvImportForm from './CsvImportForm';

describe('CsvImportForm', () => {
  it('imports CSV and normalizes selected week to monday', async () => {
    const onImport = vi.fn().mockResolvedValue('Imported');

    const { container } = render(
      <CsvImportForm
        weekStart="2026-03-09"
        employees={[{ id: 'e1', name: 'Alex Rivera', role: 'manager' }]}
        onImport={onImport}
      />
    );

    fireEvent.change(screen.getByLabelText('Week of'), { target: { value: '2026-03-12' } });

    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(
      ['employee_name,role,monday\nAlex Rivera,manager,09:00-17:00'],
      'schedule.csv',
      { type: 'text/csv' }
    );

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(onImport).toHaveBeenCalled();
    });

    const [, selectedWeek] = onImport.mock.calls[0];
    expect(selectedWeek).toBe('2026-03-09');
    expect(screen.getByText('Imported')).toBeInTheDocument();
  });

  it('shows error status when import throws', async () => {
    const onImport = vi.fn().mockRejectedValue(new Error('bad file'));

    const { container } = render(<CsvImportForm weekStart="2026-03-09" employees={[]} onImport={onImport} />);

    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(['employee_name,role,monday\nA,employee,09:00-11:00'], 'schedule.csv', {
      type: 'text/csv'
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Import failed: bad file/i)).toBeInTheDocument();
    });
  });
});
