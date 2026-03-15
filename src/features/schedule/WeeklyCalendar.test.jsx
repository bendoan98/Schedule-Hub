// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import WeeklyCalendar from './WeeklyCalendar';

describe('WeeklyCalendar', () => {
  const employees = [{ id: 'e1', name: 'Alex', department: 'OPS', colorIndex: 0 }];
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

  it('supports employee swap request and shift interaction', () => {
    const onShiftClick = vi.fn();
    const onRequestSwap = vi.fn();

    render(
      <WeeklyCalendar
        employees={employees}
        shifts={shifts}
        weekStart="2026-03-09"
        role="employee"
        swapRequests={[]}
        onAddShift={() => {}}
        onShiftClick={onShiftClick}
        onRequestSwap={onRequestSwap}
        currentEmployeeId="e1"
        onPrevWeek={() => {}}
        onNextWeek={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Request Swap' }));
    expect(onRequestSwap).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
    expect(onShiftClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('09:00 - 17:00'));
    expect(onShiftClick).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  });

  it('supports manager controls and week navigation', () => {
    const onAddShift = vi.fn();
    const onPrevWeek = vi.fn();
    const onNextWeek = vi.fn();

    render(
      <WeeklyCalendar
        employees={employees}
        shifts={shifts}
        weekStart="2026-03-09"
        role="manager"
        swapRequests={[]}
        onAddShift={onAddShift}
        onShiftClick={() => {}}
        onRequestSwap={() => {}}
        currentEmployeeId="e1"
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /add shift for alex/i })[0]);
    expect(onAddShift).toHaveBeenCalledWith('e1', 0);

    fireEvent.click(screen.getByRole('button', { name: /previous week/i }));
    fireEvent.click(screen.getByRole('button', { name: /next week/i }));
    expect(onPrevWeek).toHaveBeenCalledTimes(1);
    expect(onNextWeek).toHaveBeenCalledTimes(1);
  });
});
