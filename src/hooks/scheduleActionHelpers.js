import { formatShiftDateLabel } from '../utils/date';
import { newId } from '../utils/id';

export function addLocalNotification(setNotifications, title, body) {
  setNotifications((previous) => [
    {
      id: newId(),
      title,
      body,
      read: false,
      createdAt: new Date().toISOString()
    },
    ...previous
  ]);
}

export function toShiftSummary(shift) {
  if (!shift) {
    return 'Unknown shift (--:----:--)';
  }

  return `${formatShiftDateLabel(shift.weekStart, shift.day)} (${shift.startTime}-${shift.endTime})`;
}

function toMinutes(timeValue) {
  const [hour, minute] = timeValue.split(':').map(Number);
  return hour * 60 + minute;
}

function shiftsOverlap(left, right) {
  if (!left || !right) {
    return false;
  }

  if (left.weekStart !== right.weekStart || left.day !== right.day) {
    return false;
  }

  const leftStart = toMinutes(left.startTime);
  const leftEnd = toMinutes(left.endTime);
  const rightStart = toMinutes(right.startTime);
  const rightEnd = toMinutes(right.endTime);

  return leftStart < rightEnd && rightStart < leftEnd;
}

export function hasTradeConflict(shifts, requestedShift, offeredShift) {
  if (!requestedShift || !offeredShift) {
    return false;
  }

  return shifts.some((existingShift) => {
    if (existingShift.id === requestedShift.id || existingShift.id === offeredShift.id) {
      return false;
    }

    if (
      existingShift.employeeId === offeredShift.employeeId &&
      shiftsOverlap(existingShift, requestedShift)
    ) {
      return true;
    }

    if (
      existingShift.employeeId === requestedShift.employeeId &&
      shiftsOverlap(existingShift, offeredShift)
    ) {
      return true;
    }

    return false;
  });
}

export function hasOfferConflict(shifts, offeredShift, targetEmployeeId) {
  if (!offeredShift || !targetEmployeeId) {
    return false;
  }

  return shifts.some((existingShift) => {
    if (existingShift.id === offeredShift.id) {
      return false;
    }

    if (existingShift.employeeId !== targetEmployeeId) {
      return false;
    }

    return shiftsOverlap(existingShift, offeredShift);
  });
}

export function buildNotificationTargets(teamId, currentEmployeeId, recipientIds, title, body) {
  if (!teamId) {
    return [];
  }

  return Array.from(new Set(recipientIds))
    .filter((employeeId) => employeeId && employeeId !== currentEmployeeId)
    .map((employeeId) => ({
      teamId,
      targetEmployeeId: employeeId,
      title,
      body
    }));
}
