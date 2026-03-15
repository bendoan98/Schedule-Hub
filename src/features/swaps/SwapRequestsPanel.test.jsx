// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import SwapRequestsPanel from './SwapRequestsPanel';

describe('SwapRequestsPanel', () => {
  const shifts = [{ id: 's1', day: 1, startTime: '09:00', endTime: '17:00' }];
  const employees = [{ id: 'e1', name: 'Alex' }, { id: 'e2', name: 'Sam' }];

  const swapRequests = [
    { id: 'r1', shiftId: 's1', requestedBy: 'e1', status: 'pending', reason: 'Appointment' },
    { id: 'r2', shiftId: 's1', requestedBy: 'e2', status: 'approved' }
  ];

  it('lets managers approve or deny pending requests', () => {
    const onDecision = vi.fn();

    render(
      <SwapRequestsPanel
        role="manager"
        currentEmployeeId="e1"
        swapRequests={swapRequests}
        shifts={shifts}
        employees={employees}
        onDecision={onDecision}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    expect(onDecision).toHaveBeenCalledWith('r1', 'approved');

    fireEvent.click(screen.getByRole('button', { name: /deny/i }));
    expect(onDecision).toHaveBeenCalledWith('r1', 'denied');
  });

  it('shows only the current employee requests for non-managers', () => {
    render(
      <SwapRequestsPanel
        role="employee"
        currentEmployeeId="e2"
        swapRequests={swapRequests}
        shifts={shifts}
        employees={employees}
        onDecision={() => {}}
      />
    );

    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.queryByText('PENDING')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
  });
});
