function formatShiftLabel(shift, employeeName) {
  if (!shift) {
    return 'Unknown shift';
  }

  return `${employeeName} | Day ${shift.day + 1} | ${shift.startTime}-${shift.endTime}`;
}

export default function SwapRequestsPanel({
  title = 'Swap Requests',
  role,
  currentEmployeeId,
  swapRequests,
  shifts,
  employees,
  onDecision
}) {
  const shiftsById = new Map(shifts.map((shift) => [shift.id, shift]));
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));

  const visibleRequests =
    role === 'manager'
      ? swapRequests
      : swapRequests.filter((request) => request.requestedBy === currentEmployeeId);

  return (
    <section className="panel">
      <h3>{title}</h3>

      {visibleRequests.length === 0 ? <p>No swap requests yet.</p> : null}

      <div className="request-list">
        {visibleRequests.map((request) => {
          const shift = shiftsById.get(request.shiftId);
          const requester = employeesById.get(request.requestedBy);

          return (
            <article key={request.id} className="request-item">
              <p className={`request-status status-${request.status}`}>{request.status.toUpperCase()}</p>
              <p>{formatShiftLabel(shift, requester?.name ?? 'Unknown Employee')}</p>
              {request.reason ? <p className="muted">Reason: {request.reason}</p> : null}

              {role === 'manager' && request.status === 'pending' ? (
                <div className="request-actions">
                  <button type="button" onClick={() => onDecision(request.id, 'approved')}>
                    Approve
                  </button>
                  <button type="button" onClick={() => onDecision(request.id, 'denied')}>
                    Deny
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
