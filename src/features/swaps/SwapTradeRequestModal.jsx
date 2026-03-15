import { useEffect, useMemo, useState } from 'react';
import { formatShiftDateLabel } from '../../utils/date';

function formatShiftLabel(shift) {
  const dateLabel = formatShiftDateLabel(shift.weekStart, shift.day);
  return `${dateLabel} | ${shift.startTime}-${shift.endTime}`;
}

export default function SwapTradeRequestModal({
  targetShift,
  targetEmployeeName,
  offeredShifts,
  onSubmit,
  onClose
}) {
  const [selectedOfferedShiftId, setSelectedOfferedShiftId] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    setSelectedOfferedShiftId(offeredShifts[0]?.id ?? '');
    setReason('');
  }, [targetShift, offeredShifts]);

  const selectedOfferedShift = useMemo(() => {
    return offeredShifts.find((shift) => shift.id === selectedOfferedShiftId) ?? null;
  }, [offeredShifts, selectedOfferedShiftId]);

  if (!targetShift) {
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!selectedOfferedShiftId) {
      return;
    }

    onSubmit({
      offeredShiftId: selectedOfferedShiftId,
      reason: reason.trim()
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h3>Request Shift Trade</h3>
        <p className="muted">
          You are requesting {targetEmployeeName}&#39;s shift: {formatShiftLabel(targetShift)}
        </p>

        {offeredShifts.length === 0 ? (
          <>
            <p>You do not have any shifts this week to offer for a trade.</p>
            <div className="modal-actions">
              <button type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            <label>
              Your shift to trade
              <select
                value={selectedOfferedShiftId}
                onChange={(event) => setSelectedOfferedShiftId(event.target.value)}
              >
                {offeredShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {formatShiftLabel(shift)}
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
                placeholder="Why are you requesting this trade?"
              />
            </label>

            {selectedOfferedShift ? (
              <p className="modal-hint">
                Trade request: {formatShiftLabel(selectedOfferedShift)} for {formatShiftLabel(targetShift)}
              </p>
            ) : null}

            <div className="modal-actions">
              <button type="button" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Send Request
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
