import { useEffect, useMemo, useState } from 'react';
import { formatShiftDateLabel } from '../../utils/date';

function formatShiftLabel(shift) {
  const dateLabel = formatShiftDateLabel(shift.weekStart, shift.day);
  return `${dateLabel} | ${shift.startTime}-${shift.endTime}`;
}

export default function SwapOfferShiftModal({
  offeredShift,
  targetEmployees,
  onSubmit,
  onClose
}) {
  const [selectedTargetEmployeeId, setSelectedTargetEmployeeId] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    setSelectedTargetEmployeeId(targetEmployees[0]?.id ?? '');
    setReason('');
  }, [offeredShift, targetEmployees]);

  const selectedTargetEmployee = useMemo(() => {
    return targetEmployees.find((employee) => employee.id === selectedTargetEmployeeId) ?? null;
  }, [targetEmployees, selectedTargetEmployeeId]);

  if (!offeredShift) {
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!selectedTargetEmployeeId) {
      return;
    }

    onSubmit({
      targetEmployeeId: selectedTargetEmployeeId,
      reason: reason.trim()
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h3>Offer Your Shift</h3>
        <p className="muted">You are offering: {formatShiftLabel(offeredShift)}</p>

        {targetEmployees.length === 0 ? (
          <>
            <p>No same-department teammates are available to receive this shift.</p>
            <div className="modal-actions">
              <button type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            <label>
              Offer to teammate
              <select
                value={selectedTargetEmployeeId}
                onChange={(event) => setSelectedTargetEmployeeId(event.target.value)}
              >
                {targetEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Message (optional)
              <textarea
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Why are you offering this shift?"
              />
            </label>

            {selectedTargetEmployee ? (
              <p className="modal-hint">
                Offer request: {selectedTargetEmployee.name} can accept your shift {formatShiftLabel(offeredShift)}.
              </p>
            ) : null}

            <div className="modal-actions">
              <button type="button" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Send Offer
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
