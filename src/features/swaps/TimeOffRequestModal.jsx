import { useEffect, useState } from 'react';
import { formatShiftDateLabel } from '../../utils/date';

function formatShiftLabel(shift) {
  const dateLabel = formatShiftDateLabel(shift.weekStart, shift.day);
  return `${dateLabel} | ${shift.startTime}-${shift.endTime}`;
}

export default function TimeOffRequestModal({ shift, onSubmit, onClose }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReason('');
  }, [shift]);

  if (!shift) {
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ reason: reason.trim() });
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h3>Request Time Off</h3>
        <p className="muted">Shift: {formatShiftLabel(shift)}</p>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Message to manager (optional)
            <textarea
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Add context for your time-off request."
            />
          </label>

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Send Request
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
