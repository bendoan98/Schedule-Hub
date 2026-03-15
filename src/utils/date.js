import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns';

export function getMonday(date = new Date()) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function toIsoDate(date) {
  return format(date, 'yyyy-MM-dd');
}

export function fromIsoDate(isoDate) {
  return parseISO(isoDate);
}

export function getWeekHeaders(weekStartIso) {
  const weekStart = fromIsoDate(weekStartIso);

  return Array.from({ length: 7 }).map((_, day) => {
    const currentDate = addDays(weekStart, day);

    return {
      day,
      date: currentDate,
      isoDate: toIsoDate(currentDate),
      shortLabel: format(currentDate, 'EEE'),
      longLabel: format(currentDate, 'EEEE, MMM d'),
      dayNumber: format(currentDate, 'd'),
      isToday: isSameDay(currentDate, new Date())
    };
  });
}

export function getShiftDate(weekStartIso, day) {
  const weekStart = fromIsoDate(weekStartIso);
  return addDays(weekStart, day);
}
