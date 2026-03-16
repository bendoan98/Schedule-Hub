import { useMemo, useState } from 'react';
import { normalizeDepartmentName } from '../utils/department';

export default function useSwapModalState({
  role,
  shifts,
  weekStart,
  employees,
  currentEmployeeId,
  currentUser,
  setAppMessage
}) {
  const [swapTradeTargetShift, setSwapTradeTargetShift] = useState(null);
  const [swapOfferShift, setSwapOfferShift] = useState(null);
  const [ownShiftActionShift, setOwnShiftActionShift] = useState(null);
  const [timeOffShift, setTimeOffShift] = useState(null);

  const tradeableShifts = useMemo(() => {
    if (role !== 'employee') {
      return [];
    }

    return shifts
      .filter((shift) => shift.employeeId === currentEmployeeId && shift.weekStart === weekStart)
      .sort((left, right) => {
        if (left.day !== right.day) {
          return left.day - right.day;
        }

        return left.startTime.localeCompare(right.startTime);
      });
  }, [currentEmployeeId, role, shifts, weekStart]);

  const offerTargetEmployees = useMemo(() => {
    if (role !== 'employee') {
      return [];
    }

    const requesterDepartment = normalizeDepartmentName(currentUser?.department);

    if (!requesterDepartment) {
      return [];
    }

    return employees
      .filter((employee) => {
        if (employee.id === currentEmployeeId || employee.role !== 'employee') {
          return false;
        }

        return normalizeDepartmentName(employee.department) === requesterDepartment;
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [currentEmployeeId, currentUser?.department, employees, role]);

  function handleEmployeeShiftClick(shift) {
    if (shift.employeeId === currentEmployeeId) {
      setSwapTradeTargetShift(null);
      setSwapOfferShift(null);
      setTimeOffShift(null);
      setOwnShiftActionShift(shift);
      return;
    }

    const requesterDepartment = normalizeDepartmentName(currentUser?.department);

    if (!requesterDepartment) {
      setAppMessage('Schedule requests are only available with teammates in your department.');
      return;
    }

    const targetEmployee = employees.find((employee) => employee.id === shift.employeeId);
    const targetDepartment = normalizeDepartmentName(targetEmployee?.department);

    if (!targetEmployee || requesterDepartment !== targetDepartment) {
      setAppMessage('Schedule requests are only available with teammates in your department.');
      return;
    }

    setOwnShiftActionShift(null);
    setTimeOffShift(null);
    setSwapOfferShift(null);
    setSwapTradeTargetShift(shift);
  }

  function handleOpenOwnShiftOffer() {
    if (!ownShiftActionShift) {
      return;
    }

    setSwapOfferShift(ownShiftActionShift);
    setOwnShiftActionShift(null);
  }

  function handleOpenOwnShiftTimeOff() {
    if (!ownShiftActionShift) {
      return;
    }

    setTimeOffShift(ownShiftActionShift);
    setOwnShiftActionShift(null);
  }

  return {
    swapTradeTargetShift,
    swapOfferShift,
    ownShiftActionShift,
    timeOffShift,
    tradeableShifts,
    offerTargetEmployees,
    handleEmployeeShiftClick,
    handleOpenOwnShiftOffer,
    handleOpenOwnShiftTimeOff,
    closeOwnShiftAction: () => setOwnShiftActionShift(null),
    closeSwapTrade: () => setSwapTradeTargetShift(null),
    closeSwapOffer: () => setSwapOfferShift(null),
    closeTimeOff: () => setTimeOffShift(null)
  };
}
