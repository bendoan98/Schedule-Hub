import { getShiftDate } from '../../utils/date';

function toIcsDate(date, time) {
  const [hours, minutes] = time.split(':').map(Number);
  const normalized = new Date(date);
  normalized.setHours(hours, minutes, 0, 0);

  return normalized
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('.000', '');
}

function buildIcs(shifts, employeesById, weekStart, title) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Schedule-Hub//EN',
    'CALSCALE:GREGORIAN'
  ];

  shifts.forEach((shift) => {
    const employee = employeesById.get(shift.employeeId);
    const shiftDate = getShiftDate(weekStart, shift.day);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${shift.id}@schedule-hub`);
    lines.push(`DTSTAMP:${toIcsDate(new Date(), '00:00')}`);
    lines.push(`DTSTART:${toIcsDate(shiftDate, shift.startTime)}`);
    lines.push(`DTEND:${toIcsDate(shiftDate, shift.endTime)}`);
    lines.push(`SUMMARY:${employee?.name ?? 'Team Member'} Shift`);
    lines.push(`DESCRIPTION:Schedule Hub ${title} export`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadTextFile(filename, contents) {
  const blob = new Blob([contents], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function openGoogleCalendar(shift, employeeName, weekStart) {
  if (!shift) {
    return;
  }

  const shiftDate = getShiftDate(weekStart, shift.day);
  const start = toIcsDate(shiftDate, shift.startTime);
  const end = toIcsDate(shiftDate, shift.endTime);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${employeeName} Shift`,
    dates: `${start}/${end}`,
    details: 'Imported from Schedule Hub'
  });

  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
}

export default function ExportButtons({ shifts, employees, role, currentEmployeeId, weekStart }) {
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));

  const personalShifts = shifts.filter(
    (shift) => shift.weekStart === weekStart && shift.employeeId === currentEmployeeId
  );

  const teamShifts = shifts.filter((shift) => shift.weekStart === weekStart);

  const firstPersonalShift = personalShifts[0];

  return (
    <section className="panel export-panel">
      <h3>Calendar Export</h3>
      <p>Export to Apple Calendar (.ics) or open the next personal shift in Google Calendar.</p>

      <div className="export-actions">
        <button
          type="button"
          onClick={() => {
            const ics = buildIcs(personalShifts, employeesById, weekStart, 'personal');
            downloadTextFile('personal-schedule.ics', ics);
          }}
        >
          Export Personal (.ics)
        </button>

        {role === 'manager' ? (
          <button
            type="button"
            onClick={() => {
              const ics = buildIcs(teamShifts, employeesById, weekStart, 'team');
              downloadTextFile('team-schedule.ics', ics);
            }}
          >
            Export Team (.ics)
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            const employeeName = employeesById.get(currentEmployeeId)?.name ?? 'My';
            openGoogleCalendar(firstPersonalShift, employeeName, weekStart);
          }}
          disabled={!firstPersonalShift}
        >
          Open Next Shift in Google Calendar
        </button>
      </div>
    </section>
  );
}
