function getShiftHours(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  return Math.max(0, (endTotalMinutes - startTotalMinutes) / 60);
}

export default function DashboardStats({
  shifts,
  swapRequests,
  employees,
  weekStart,
  role,
  currentEmployeeId
}) {
  const weekShifts = shifts.filter((shift) => shift.weekStart === weekStart);

  const visibleShifts =
    role === 'manager'
      ? weekShifts
      : weekShifts.filter((shift) => shift.employeeId === currentEmployeeId);

  const totalHours = visibleShifts.reduce((sum, shift) => {
    return sum + getShiftHours(shift.startTime, shift.endTime);
  }, 0);

  const stats = [
    {
      label: 'Total Shifts',
      value: visibleShifts.length
    },
    {
      label: 'Total Hours',
      value: `${totalHours.toFixed(1)}h`
    }
  ];

  if (role === 'manager') {
    const pendingCount = swapRequests.filter((request) => request.status?.startsWith('pending')).length;

    stats.push(
      {
        label: 'Pending Swaps',
        value: pendingCount
      },
      {
        label: 'Roster Size',
        value: employees.length
      }
    );
  }

  return (
    <section className="stats-grid" aria-label="Dashboard stats">
      {stats.map((stat) => (
        <article key={stat.label} className="stat-card">
          <p className="stat-label">{stat.label}</p>
          <p className="stat-value">{stat.value}</p>
        </article>
      ))}
    </section>
  );
}
