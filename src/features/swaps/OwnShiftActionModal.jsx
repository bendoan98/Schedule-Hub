import { formatShiftDateLabel } from '../../utils/date';

function formatShiftLabel(shift) {
  const dateLabel = formatShiftDateLabel(shift.weekStart, shift.day);
  return `${dateLabel} | ${shift.startTime}-${shift.endTime}`;
}

export default function OwnShiftActionModal({ shift, onOfferShift, onRequestTimeOff, onClose }) {
  if (!shift) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h3>Request for Your Shift</h3>
        <p className="muted">Selected shift: {formatShiftLabel(shift)}</p>

        <p>Choose how you want to handle this shift:</p>

        <div className="modal-actions">
          <button type="button" className="primary" onClick={onOfferShift}>
            Offer to Teammate
          </button>
          <button type="button" onClick={onRequestTimeOff}>
            Request Time Off
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
