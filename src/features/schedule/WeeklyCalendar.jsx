import { Fragment } from 'react';
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
  onRequestSwap,
  currentEmployeeId,
  onPrevWeek,
  onNextWeek,
  disableWeekControls
}) {
  const headers = getWeekHeaders(weekStart);

  const pendingShiftIds = new Set(
    swapRequests.filter((request) => request.status === 'pending').map((request) => request.shiftId)
  );

  function getShiftsForCell(employeeId, day) {
    return shifts
      .filter((shift) => shift.weekStart === weekStart && shift.employeeId === employeeId && shift.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return (
    <section className="panel calendar-panel">
      <div className="calendar-header-row">
        <h3>Weekly Calendar</h3>

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
              const cellShifts = getShiftsForCell(employee.id, header.day);

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
                    const canRequestSwap = role === 'employee' && shift.employeeId === currentEmployeeId;
                    const pending = pendingShiftIds.has(shift.id);

                    return (
                      <article
                        key={shift.id}
                        className={`shift-chip color-${employee.colorIndex % 8} ${pending ? 'pending' : ''}`}
                        onClick={() => onShiftClick(shift)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onShiftClick(shift);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <p>{shift.startTime} - {shift.endTime}</p>
                        {pending ? <small>PENDING</small> : null}
                        {canRequestSwap && !pending ? (
                          <button
                            type="button"
                            className="inline-link"
                            onClick={(event) => {
                              event.stopPropagation();
                              onRequestSwap(shift);
                            }}
                          >
                            Request Swap
                          </button>
                        ) : null}
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
