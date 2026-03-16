import { createSwapRequest, insertNotifications } from '../lib/supabaseData';
import { newId } from '../utils/id';
import {
  addLocalNotification,
  buildNotificationTargets,
  hasOfferConflict,
  hasTradeConflict,
  toShiftSummary
} from './scheduleActionHelpers';

export default function useSwapRequestCreation({
  env,
  context,
  modalState,
  setters,
  loadSupabaseData
}) {
  const { isSupabaseMode, session, supabase } = env;
  const { team, employees, shifts, currentEmployeeId, currentUser } = context;
  const {
    swapTradeTargetShift,
    swapOfferShift,
    timeOffShift,
    closeSwapTrade,
    closeSwapOffer,
    closeTimeOff
  } = modalState;
  const { setSwapRequests, setNotifications, setAppMessage } = setters;

  async function handleSubmitSwapTrade({ offeredShiftId, reason }) {
    const targetShift = swapTradeTargetShift;

    if (!targetShift) {
      return;
    }

    const offeredShift = shifts.find((shift) => shift.id === offeredShiftId);

    if (!offeredShift || offeredShift.employeeId !== currentEmployeeId) {
      setAppMessage('Select one of your shifts to offer for this trade.');
      return;
    }

    const targetEmployee = employees.find((employee) => employee.id === targetShift.employeeId);
    const requesterDepartment = currentUser?.department?.trim()?.toUpperCase() ?? null;
    const targetDepartment = targetEmployee?.department?.trim()?.toUpperCase() ?? null;

    if (!requesterDepartment || requesterDepartment !== targetDepartment) {
      setAppMessage('Schedule requests are only available with teammates in your department.');
      return;
    }

    if (hasTradeConflict(shifts, targetShift, offeredShift)) {
      closeSwapTrade();
      setAppMessage('Schedule request denied automatically due to a shift conflict.');
      return;
    }

    const trimmedReason = reason.trim();

    if (isSupabaseMode && session && supabase) {
      try {
        if (!currentEmployeeId) {
          throw new Error('No employee profile selected for this user.');
        }

        await createSwapRequest(supabase, {
          shiftId: targetShift.id,
          offeredShiftId: offeredShift.id,
          requestedBy: currentEmployeeId,
          targetEmployeeId: targetShift.employeeId,
          reason: trimmedReason
        });

        await insertNotifications(
          supabase,
          buildNotificationTargets(
            team?.id,
            currentEmployeeId,
            [targetShift.employeeId],
            'Schedule Request Received',
            `${currentUser?.name ?? 'A teammate'} requested to trade ${toShiftSummary(
              offeredShift
            )} for your ${toShiftSummary(targetShift)}${trimmedReason ? `: ${trimmedReason}` : '.'}`
          )
        );

        await loadSupabaseData();
        setAppMessage('Schedule request sent to teammate.');
      } catch (error) {
        setAppMessage(error.message);
      } finally {
        closeSwapTrade();
      }

      return;
    }

    setSwapRequests((previous) => [
      {
        id: newId(),
        shiftId: targetShift.id,
        offeredShiftId: offeredShift.id,
        requestedBy: currentEmployeeId,
        targetEmployeeId: targetShift.employeeId,
        reason: trimmedReason,
        status: 'pending_target',
        createdAt: new Date().toISOString()
      },
      ...previous
    ]);

    closeSwapTrade();
    addLocalNotification(
      setNotifications,
      'Schedule Request Sent',
      `${currentUser?.name ?? 'Employee'} requested to trade with ${targetEmployee?.name ?? 'teammate'}.`
    );
  }

  async function handleSubmitSwapOffer({ targetEmployeeId, reason }) {
    if (!swapOfferShift) {
      return;
    }

    const offeredShift = swapOfferShift;
    const targetEmployee = employees.find((employee) => employee.id === targetEmployeeId);
    const requesterDepartment = currentUser?.department?.trim()?.toUpperCase() ?? null;
    const targetDepartment = targetEmployee?.department?.trim()?.toUpperCase() ?? null;

    if (!targetEmployee || targetEmployee.role !== 'employee' || targetEmployeeId === currentEmployeeId) {
      setAppMessage('Select a teammate to offer this shift.');
      return;
    }

    if (!requesterDepartment || requesterDepartment !== targetDepartment) {
      setAppMessage('Schedule requests are only available with teammates in your department.');
      return;
    }

    if (hasOfferConflict(shifts, offeredShift, targetEmployeeId)) {
      closeSwapOffer();
      setAppMessage('Schedule request denied automatically due to a shift conflict.');
      return;
    }

    const trimmedReason = reason.trim();

    if (isSupabaseMode && session && supabase) {
      try {
        if (!currentEmployeeId) {
          throw new Error('No employee profile selected for this user.');
        }

        await createSwapRequest(supabase, {
          shiftId: offeredShift.id,
          offeredShiftId: null,
          requestedBy: currentEmployeeId,
          targetEmployeeId,
          reason: trimmedReason
        });

        await insertNotifications(
          supabase,
          buildNotificationTargets(
            team?.id,
            currentEmployeeId,
            [targetEmployeeId],
            'Schedule Request Received',
            `${currentUser?.name ?? 'A teammate'} offered you ${toShiftSummary(offeredShift)}${
              trimmedReason ? `: ${trimmedReason}` : '.'
            }`
          )
        );

        await loadSupabaseData();
        setAppMessage('Schedule request sent to teammate.');
      } catch (error) {
        setAppMessage(error.message);
      } finally {
        closeSwapOffer();
      }

      return;
    }

    setSwapRequests((previous) => [
      {
        id: newId(),
        shiftId: offeredShift.id,
        offeredShiftId: null,
        requestedBy: currentEmployeeId,
        targetEmployeeId,
        reason: trimmedReason,
        status: 'pending_target',
        createdAt: new Date().toISOString()
      },
      ...previous
    ]);

    closeSwapOffer();
    addLocalNotification(
      setNotifications,
      'Schedule Request Sent',
      `${currentUser?.name ?? 'Employee'} offered a shift to ${targetEmployee?.name ?? 'teammate'}.`
    );
  }

  async function handleSubmitTimeOffRequest({ reason }) {
    if (!timeOffShift) {
      return;
    }

    const selectedShift = timeOffShift;
    const managerRecipientIds = Array.from(
      new Set(
        [
          ...employees
            .filter((employee) => employee.role === 'manager')
            .map((employee) => employee.id),
          team?.createdBy ?? null
        ].filter((employeeId) => employeeId && employeeId !== currentEmployeeId)
      )
    );

    if (managerRecipientIds.length === 0) {
      setAppMessage('No manager is available to review this time-off request.');
      return;
    }

    const trimmedReason = reason.trim();
    const primaryManagerId = managerRecipientIds[0];

    if (isSupabaseMode && session && supabase) {
      try {
        if (!currentEmployeeId) {
          throw new Error('No employee profile selected for this user.');
        }

        await createSwapRequest(supabase, {
          shiftId: selectedShift.id,
          offeredShiftId: null,
          requestedBy: currentEmployeeId,
          targetEmployeeId: primaryManagerId,
          reason: trimmedReason,
          status: 'pending_manager'
        });

        await insertNotifications(
          supabase,
          buildNotificationTargets(
            team?.id,
            currentEmployeeId,
            managerRecipientIds,
            'Time Off Request Received',
            `${currentUser?.name ?? 'A teammate'} requested time off for ${toShiftSummary(selectedShift)}${
              trimmedReason ? `: ${trimmedReason}` : '.'
            }`
          )
        );

        await loadSupabaseData();
        setAppMessage('Time-off request sent to manager.');
      } catch (error) {
        setAppMessage(error.message);
      } finally {
        closeTimeOff();
      }

      return;
    }

    setSwapRequests((previous) => [
      {
        id: newId(),
        shiftId: selectedShift.id,
        offeredShiftId: null,
        requestedBy: currentEmployeeId,
        targetEmployeeId: primaryManagerId,
        reason: trimmedReason,
        status: 'pending_manager',
        createdAt: new Date().toISOString()
      },
      ...previous
    ]);

    closeTimeOff();
    addLocalNotification(
      setNotifications,
      'Time Off Request Sent',
      `${currentUser?.name ?? 'Employee'} requested time off for ${toShiftSummary(selectedShift)}.`
    );
  }

  return {
    handleSubmitSwapTrade,
    handleSubmitSwapOffer,
    handleSubmitTimeOffRequest
  };
}
