// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import ExportButtons from './ExportButtons';

describe('ExportButtons', () => {
  const employees = [{ id: 'e1', name: 'Alex' }, { id: 'e2', name: 'Sam' }];
  const shifts = [
    {
      id: 's1',
      employeeId: 'e1',
      day: 0,
      startTime: '09:00',
      endTime: '17:00',
      weekStart: '2026-03-09'
    }
  ];

  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens compact menu and exports personal calendar', () => {
    render(
      <ExportButtons
        shifts={shifts}
        employees={employees}
        role="manager"
        currentEmployeeId="e1"
        weekStart="2026-03-09"
        compact
        compactLabel="Export"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(screen.getByRole('button', { name: /export personal/i }));

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('opens google calendar and closes on outside click', () => {
    render(
      <ExportButtons
        shifts={shifts}
        employees={employees}
        role="employee"
        currentEmployeeId="e1"
        weekStart="2026-03-09"
        compact
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /calendar export/i }));
    fireEvent.click(screen.getByRole('button', { name: /open next shift in google calendar/i }));

    expect(window.open).toHaveBeenCalledWith(expect.stringContaining('calendar.google.com'), '_blank');

    fireEvent.click(screen.getByRole('button', { name: /calendar export/i }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('button', { name: /export personal/i })).not.toBeInTheDocument();
  });
});
