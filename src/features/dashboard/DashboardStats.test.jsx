// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import DashboardStats from './DashboardStats';

describe('DashboardStats', () => {
  const employees = [
    { id: 'e1', name: 'Alex' },
    { id: 'e2', name: 'Sam' }
  ];

  const shifts = [
    { id: 's1', employeeId: 'e1', startTime: '09:00', endTime: '17:00', weekStart: '2026-03-09' },
    { id: 's2', employeeId: 'e2', startTime: '10:00', endTime: '14:00', weekStart: '2026-03-09' },
    { id: 's3', employeeId: 'e1', startTime: '08:00', endTime: '12:00', weekStart: '2026-03-16' }
  ];

  const swapRequests = [
    { id: 'r1', status: 'pending' },
    { id: 'r2', status: 'approved' }
  ];

  it('shows manager metrics including pending swaps and roster size', () => {
    render(
      <DashboardStats
        shifts={shifts}
        swapRequests={swapRequests}
        employees={employees}
        weekStart="2026-03-09"
        role="manager"
        currentEmployeeId="e1"
      />
    );

    const totalShiftsCard = screen.getByText('Total Shifts').closest('article');
    const totalHoursCard = screen.getByText('Total Hours').closest('article');
    const pendingSwapsCard = screen.getByText('Pending Swaps').closest('article');
    const rosterSizeCard = screen.getByText('Roster Size').closest('article');

    expect(totalShiftsCard).toBeTruthy();
    expect(totalHoursCard).toBeTruthy();
    expect(pendingSwapsCard).toBeTruthy();
    expect(rosterSizeCard).toBeTruthy();

    expect(within(totalShiftsCard).getByText('2')).toBeInTheDocument();
    expect(within(totalHoursCard).getByText('12.0h')).toBeInTheDocument();
    expect(within(pendingSwapsCard).getByText('1')).toBeInTheDocument();
    expect(within(rosterSizeCard).getByText('2')).toBeInTheDocument();
  });

  it('shows employee-only stats for the selected employee', () => {
    render(
      <DashboardStats
        shifts={shifts}
        swapRequests={swapRequests}
        employees={employees}
        weekStart="2026-03-09"
        role="employee"
        currentEmployeeId="e1"
      />
    );

    const totalShiftsCard = screen.getByText('Total Shifts').closest('article');
    const totalHoursCard = screen.getByText('Total Hours').closest('article');

    expect(totalShiftsCard).toBeTruthy();
    expect(totalHoursCard).toBeTruthy();
    expect(within(totalShiftsCard).getByText('1')).toBeInTheDocument();
    expect(within(totalHoursCard).getByText('8.0h')).toBeInTheDocument();
    expect(screen.queryByText('Pending Swaps')).not.toBeInTheDocument();
    expect(screen.queryByText('Roster Size')).not.toBeInTheDocument();
  });
});
