import { useEffect, useMemo, useState } from 'react';

const DAY_OPTIONS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' }
];

export default function ShiftEditorModal({ shift, employees, onSave, onDelete, onClose }) {
  const [formState, setFormState] = useState(null);

  useEffect(() => {
    setFormState(shift);
  }, [shift]);

  const selectedEmployee = useMemo(() => {
    return employees.find((employee) => employee.id === formState?.employeeId);
  }, [employees, formState]);

  if (!formState) {
    return null;
  }

  function updateField(field, value) {
    setFormState((previous) => ({ ...previous, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!formState.employeeId || !formState.startTime || !formState.endTime) {
      return;
    }

    onSave({
      ...formState,
      day: Number(formState.day)
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h3>{shift.isNew ? 'Add Shift' : 'Edit Shift'}</h3>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Employee
            <select
              value={formState.employeeId}
              onChange={(event) => updateField('employeeId', event.target.value)}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Day
            <select value={formState.day} onChange={(event) => updateField('day', event.target.value)}>
              {DAY_OPTIONS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Start Time
            <input
              type="time"
              value={formState.startTime}
              onChange={(event) => updateField('startTime', event.target.value)}
              required
            />
          </label>

          <label>
            End Time
            <input
              type="time"
              value={formState.endTime}
              onChange={(event) => updateField('endTime', event.target.value)}
              required
            />
          </label>

          <p className="modal-hint">{selectedEmployee?.department ?? 'No department selected'}</p>

          <div className="modal-actions">
            {!shift.isNew ? (
              <button type="button" className="danger" onClick={() => onDelete(shift.id)}>
                Delete
              </button>
            ) : null}
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Save Shift
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
