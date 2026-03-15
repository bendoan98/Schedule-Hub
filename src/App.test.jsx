// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

vi.mock('./lib/supabaseClient', () => ({
  hasSupabaseCredentials: false,
  supabase: null
}));

vi.mock('./data/mockData', () => ({
  mockEmployees: [
    {
      id: 'mgr-1',
      teamId: 'team-1',
      name: 'Manager One',
      email: 'manager@example.com',
      role: 'manager',
      department: 'OPS',
      colorIndex: 0
    },
    {
      id: 'emp-1',
      teamId: 'team-1',
      name: 'Employee One',
      email: 'employee@example.com',
      role: 'employee',
      department: 'OPS',
      colorIndex: 1
    }
  ],
  mockShifts: [
    {
      id: 'shift-1',
      employeeId: 'mgr-1',
      day: 0,
      startTime: '09:00',
      endTime: '17:00',
      weekStart: '2026-03-09'
    }
  ],
  mockSwapRequests: [],
  mockNotifications: [],
  mockBoardPosts: []
}));

vi.mock('./features/dashboard/DashboardStats', () => ({
  default: () => <section data-testid="dashboard-stats">Dashboard</section>
}));

vi.mock('./features/schedule/WeeklyCalendar', () => ({
  default: ({ shifts, onAddShift, onShiftClick, onRequestSwap, onPrevWeek, onNextWeek, exportControl }) => (
    <section>
      <button type="button" onClick={() => onAddShift('mgr-1', 0)}>
        Trigger Add Shift
      </button>
      <button type="button" onClick={() => onShiftClick(shifts[0])}>
        Trigger Edit Shift
      </button>
      <button type="button" onClick={() => onRequestSwap(shifts[0])}>
        Trigger Swap Request
      </button>
      <button type="button" onClick={onPrevWeek}>
        Trigger Previous Week
      </button>
      <button type="button" onClick={onNextWeek}>
        Trigger Next Week
      </button>
      {exportControl}
    </section>
  )
}));

vi.mock('./features/notifications/NotificationBell', () => ({
  default: ({ notifications, onMarkAllRead }) => {
    const unreadCount = notifications.filter((notification) => !notification.read).length;

    return (
      <section>
        <p data-testid="unread-count">{unreadCount}</p>
        <button type="button" onClick={onMarkAllRead}>
          Mark all read
        </button>
      </section>
    );
  }
}));

vi.mock('./features/board/MessageBoard', () => ({
  default: ({ currentUser, onAddPost }) => (
    <section>
      <button
        type="button"
        onClick={() =>
          onAddPost({
            authorId: currentUser.id,
            kind: 'manager',
            message: 'Hello team'
          })
        }
      >
        Add Board Post
      </button>
    </section>
  )
}));

vi.mock('./features/export/ExportButtons', () => ({
  default: () => <span data-testid="export-control">Export</span>
}));

vi.mock('./features/manager/ManagerPage', () => ({
  default: ({
    departments,
    employees,
    onImport,
    onAddDepartment,
    onRenameDepartment,
    onDeleteDepartment,
    onUpdateDepartment
  }) => (
    <section>
      <p data-testid="department-list">{departments.join('|')}</p>
      <p data-testid="employee-department">
        {employees.find((employee) => employee.id === 'emp-1')?.department ?? 'null'}
      </p>
      <button type="button" onClick={() => onAddDepartment('Support')}>
        Add Department
      </button>
      <button type="button" onClick={() => onRenameDepartment('SUPPORT', 'Service')}>
        Rename Department
      </button>
      <button type="button" onClick={() => onUpdateDepartment('emp-1', 'SERVICE')}>
        Update Department
      </button>
      <button type="button" onClick={() => onDeleteDepartment('SERVICE')}>
        Delete Department
      </button>
      <button
        type="button"
        onClick={() =>
          onImport(
            {
              importedEmployees: [],
              importedShifts: [
                {
                  id: 'import-1',
                  employeeId: 'emp-1',
                  day: 3,
                  startTime: '10:00',
                  endTime: '18:00',
                  weekStart: '2026-03-16'
                }
              ],
              rowCount: 1
            },
            '2026-03-16'
          )
        }
      >
        Import Csv
      </button>
    </section>
  )
}));

describe('App', () => {
  it('handles local shift actions and notification updates', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Need coverage');

    render(<App />);

    expect(screen.getByText(/running with mock data/i)).toBeInTheDocument();
    expect(screen.getByTestId('unread-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: /trigger add shift/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save shift/i }));
    expect(screen.getByTestId('unread-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: /trigger edit shift/i }));
    expect(screen.getByText('Edit Shift')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByTestId('unread-count')).toHaveTextContent('2');

    fireEvent.click(screen.getByRole('button', { name: /trigger swap request/i }));
    expect(promptSpy).toHaveBeenCalled();
    expect(screen.getByTestId('unread-count')).toHaveTextContent('3');

    fireEvent.click(screen.getByRole('button', { name: /mark all read/i }));
    expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
  });

  it('handles manager page department actions in local mode', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /manager page/i }));

    expect(screen.getByTestId('department-list').textContent).toContain('UNASSIGNED');
    expect(screen.getByTestId('department-list').textContent).toContain('OPS');

    fireEvent.click(screen.getByRole('button', { name: /add department/i }));
    await waitFor(() => {
      expect(screen.getByTestId('department-list').textContent).toContain('SUPPORT');
    });

    fireEvent.click(screen.getByRole('button', { name: /rename department/i }));
    await waitFor(() => {
      expect(screen.getByTestId('department-list').textContent).toContain('SERVICE');
    });

    fireEvent.click(screen.getByRole('button', { name: /update department/i }));
    await waitFor(() => {
      expect(screen.getByTestId('employee-department')).toHaveTextContent('SERVICE');
    });

    fireEvent.click(screen.getByRole('button', { name: /delete department/i }));
    await waitFor(() => {
      expect(screen.getByTestId('employee-department')).toHaveTextContent('null');
    });

    fireEvent.click(screen.getByRole('button', { name: /import csv/i }));
    await waitFor(() => {
      expect(screen.getByTestId('unread-count')).toHaveTextContent('5');
    });
  });
});
