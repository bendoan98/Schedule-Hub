import { Fragment, useMemo } from 'react';
import { getWeekHeaders } from '../../utils/date';

const DAY_INDEX_LABEL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeeklyCalendar({
  employees,
  shifts,
  weekStart,
  role,
  swapRequests,
  onAddShift,
  onShiftClick,
  currentEmployeeId,
  onPrevWeek,
  onNextWeek,
  disableWeekControls,
  exportControl
}) {
  const headers = getWeekHeaders(weekStart);

  const pendingShiftIds = useMemo(
    () =>
      new Set(
        swapRequests
          .filter((request) => request.status?.startsWith('pending'))
          .flatMap((request) => [request.shiftId, request.offeredShiftId].filter(Boolean))
      ),
    [swapRequests]
  );

  const shiftsByCell = useMemo(() => {
    const indexed = new Map();

    shifts
      .filter((shift) => shift.weekStart === weekStart)
      .forEach((shift) => {
        const key = `${shift.employeeId}-${shift.day}`;
        const nextCellShifts = indexed.get(key) ?? [];
        nextCellShifts.push(shift);
        indexed.set(key, nextCellShifts);
      });

    indexed.forEach((cellShifts, key) => {
      indexed.set(
        key,
        [...cellShifts].sort((left, right) => left.startTime.localeCompare(right.startTime))
      );
    });

    return indexed;
  }, [shifts, weekStart]);

  return (
    <section className="panel calendar-panel">
      <div className="calendar-header-row">
        <div className="calendar-title-group">
          <h3>Weekly Calendar</h3>
          {exportControl}
        </div>

        <div className="calendar-header-meta">
          <p>{weekStart}</p>
          <div className="week-controls">
            <button
              type="button"
              onClick={onPrevWeek}
              aria-label="Previous week"
              disabled={disableWeekControls}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={onNextWeek}
              aria-label="Next week"
              disabled={disableWeekControls}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="calendar-grid" role="table" aria-label="Weekly employee shifts">
        <div className="calendar-head employee-head" role="columnheader">
          Employee
        </div>

        {headers.map((header) => (
          <div
            key={header.isoDate}
            className={`calendar-head ${header.isToday ? 'today' : ''}`}
            role="columnheader"
            title={header.longLabel}
          >
            <span>{DAY_INDEX_LABEL[header.day]}</span>
            <small>{header.dayNumber}</small>
          </div>
        ))}

        {employees.map((employee) => (
          <Fragment key={employee.id}>
            <div key={`${employee.id}-name`} className="employee-name" role="rowheader">
              <span className={`employee-dot color-${employee.colorIndex % 8}`} aria-hidden="true" />
              <div>
                <strong>{employee.name}</strong>
                <p>{employee.department}</p>
              </div>
            </div>

            {headers.map((header) => {
              const cellShifts = shiftsByCell.get(`${employee.id}-${header.day}`) ?? [];

              return (
                <div key={`${employee.id}-${header.day}`} className="shift-cell" role="cell">
                  {role === 'manager' ? (
                    <button
                      type="button"
                      className="add-shift-btn"
                      onClick={() => onAddShift(employee.id, header.day)}
                      aria-label={`Add shift for ${employee.name} on ${header.longLabel}`}
                    >
                      +
                    </button>
                  ) : null}

                  {cellShifts.map((shift) => {
                    const canOpenShift = role === 'manager' || role === 'employee';
                    const pending = pendingShiftIds.has(shift.id);
                    const className = `shift-chip color-${employee.colorIndex % 8} ${
                      canOpenShift ? 'interactive' : ''
                    } ${pending ? 'pending' : ''}`;

                    if (canOpenShift) {
                      return (
                        <button
                          key={shift.id}
                          type="button"
                          className={className}
                          onClick={() => onShiftClick(shift)}
                          aria-label={`Open shift details for ${employee.name} on ${header.longLabel}, ${shift.startTime} to ${shift.endTime}`}
                        >
                          <p>{shift.startTime} - {shift.endTime}</p>
                          {pending ? <small>PENDING</small> : null}
                        </button>
                      );
                    }

                    return (
                      <article key={shift.id} className={className}>
                        <p>{shift.startTime} - {shift.endTime}</p>
                        {pending ? <small>PENDING</small> : null}
                      </article>
                    );
                  })}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
