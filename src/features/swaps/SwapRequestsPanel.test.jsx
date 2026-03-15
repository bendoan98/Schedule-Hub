// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import SwapRequestsPanel from './SwapRequestsPanel';

describe('SwapRequestsPanel', () => {
  const shifts = [
    { id: 's1', employeeId: 'e2', day: 1, startTime: '09:00', endTime: '17:00' },
    { id: 's2', employeeId: 'e1', day: 3, startTime: '11:00', endTime: '19:00' }
  ];
  const employees = [{ id: 'e1', name: 'Alex' }, { id: 'e2', name: 'Sam' }];

  const swapRequests = [
    {
      id: 'r1',
      shiftId: 's1',
      offeredShiftId: 's2',
      requestedBy: 'e1',
      targetEmployeeId: 'e2',
      status: 'pending_manager',
      reason: 'Appointment'
    },
    {
      id: 'r2',
      shiftId: 's1',
      offeredShiftId: 's2',
      requestedBy: 'e1',
      targetEmployeeId: 'e2',
      status: 'pending_target'
    }
  ];

  it('lets managers final approve or deny requests awaiting manager review', () => {
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

    fireEvent.click(screen.getByRole('button', { name: /final approve/i }));
    expect(onDecision).toHaveBeenCalledWith('r1', 'approved');

    fireEvent.click(screen.getByRole('button', { name: /final deny/i }));
    expect(onDecision).toHaveBeenCalledWith('r1', 'denied');
  });

  it('lets target employees accept or deny incoming peer requests', () => {
    const onDecision = vi.fn();
    const onCancel = vi.fn();

    render(
      <SwapRequestsPanel
        role="employee"
        currentEmployeeId="e2"
        swapRequests={swapRequests}
        shifts={shifts}
        employees={employees}
        onDecision={onDecision}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('PENDING PEER')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^approve$/i }));
    expect(onDecision).toHaveBeenCalledWith('r2', 'pending_manager');

    fireEvent.click(screen.getByRole('button', { name: /^deny$/i }));
    expect(onDecision).toHaveBeenCalledWith('r2', 'denied');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('lets requesters cancel their own pending requests', () => {
    const onDecision = vi.fn();
    const onCancel = vi.fn();

    render(
      <SwapRequestsPanel
        role="employee"
        currentEmployeeId="e1"
        swapRequests={swapRequests}
        shifts={shifts}
        employees={employees}
        onDecision={onDecision}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /cancel request/i })[0]);
    expect(onCancel).toHaveBeenCalledWith('r1');
    expect(onDecision).not.toHaveBeenCalled();
  });
});
