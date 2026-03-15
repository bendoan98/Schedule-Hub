import { formatShiftDateLabel } from '../../utils/date';

function formatShiftLabel(shift, employeeName) {
  if (!shift) {
    return 'Unknown shift';
  }

  const dateLabel = formatShiftDateLabel(shift.weekStart, shift.day);
  return `${employeeName} | ${dateLabel} | ${shift.startTime}-${shift.endTime}`;
}

function getStatusLabel(status) {
  switch (status) {
    case 'pending_target':
      return 'PENDING PEER';
    case 'pending_manager':
      return 'PENDING MANAGER';
    default:
      return status.toUpperCase();
  }
}

export default function SwapRequestsPanel({
  title = 'Swap Requests',
  role,
  currentEmployeeId,
  swapRequests,
  shifts,
  employees,
  onDecision,
  onCancel
}) {
  const shiftsById = new Map(shifts.map((shift) => [shift.id, shift]));
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));

  const visibleRequests =
    role === 'manager'
      ? swapRequests
      : swapRequests.filter(
          (request) =>
            request.requestedBy === currentEmployeeId || request.targetEmployeeId === currentEmployeeId
        );

  return (
    <section className="panel">
      <h3>{title}</h3>

      {visibleRequests.length === 0 ? <p>No schedule requests yet.</p> : null}

      <div className="request-list">
        {visibleRequests.map((request) => {
          const requestedShift = shiftsById.get(request.shiftId);
          const offeredShift = shiftsById.get(request.offeredShiftId);
          const requester = employeesById.get(request.requestedBy);
          const targetEmployee = employeesById.get(request.targetEmployeeId);
          const isTradeRequest = Boolean(request.offeredShiftId);
          const canPeerDecide =
            role === 'employee' &&
            request.status === 'pending_target' &&
            request.targetEmployeeId === currentEmployeeId;
          const canManagerDecide = role === 'manager' && request.status === 'pending_manager';
          const canRequesterCancel =
            role === 'employee' &&
            request.requestedBy === currentEmployeeId &&
            request.status?.startsWith('pending');

          return (
            <article key={request.id} className="request-item">
              <p className={`request-status status-${request.status}`}>{getStatusLabel(request.status)}</p>
              <p>
                Requester: <strong>{requester?.name ?? 'Unknown Employee'}</strong>
              </p>
              {isTradeRequest ? (
                <>
                  <p>Wants: {formatShiftLabel(requestedShift, targetEmployee?.name ?? 'Unknown Employee')}</p>
                  {offeredShift ? (
                    <p>Offers: {formatShiftLabel(offeredShift, requester?.name ?? 'Unknown Employee')}</p>
                  ) : null}
                </>
              ) : (
                <>
                  <p>Offers: {formatShiftLabel(requestedShift, requester?.name ?? 'Unknown Employee')}</p>
                  <p>To: {targetEmployee?.name ?? 'Unknown Employee'}</p>
                </>
              )}
              {request.reason ? <p className="muted">Reason: {request.reason}</p> : null}

              {canPeerDecide ? (
                <div className="request-actions">
                  <button type="button" onClick={() => onDecision(request.id, 'pending_manager')}>
                    Approve
                  </button>
                  <button type="button" onClick={() => onDecision(request.id, 'denied')}>
                    Deny
                  </button>
                </div>
              ) : null}

              {canManagerDecide ? (
                <div className="request-actions">
                  <button type="button" onClick={() => onDecision(request.id, 'approved')}>
                    Final Approve
                  </button>
                  <button type="button" onClick={() => onDecision(request.id, 'denied')}>
                    Final Deny
                  </button>
                </div>
              ) : null}

              {canRequesterCancel ? (
                <div className="request-actions">
                  <button type="button" className="danger" onClick={() => onCancel?.(request.id)}>
                    Cancel Request
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
