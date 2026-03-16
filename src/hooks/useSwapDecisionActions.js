import {
  insertNotifications,
  removeShift,
  removeSwapRequest,
  setSwapRequestStatus,
  upsertShift
} from '../lib/supabaseData';
import {
  addLocalNotification,
  buildNotificationTargets,
  hasOfferConflict,
  hasTradeConflict,
  toShiftSummary
} from './scheduleActionHelpers';

export default function useSwapDecisionActions({ env, context, setters, loadSupabaseData }) {
  const { isSupabaseMode, session, supabase } = env;
  const { team, employees, shifts, swapRequests, currentEmployeeId, currentUser } = context;
  const { setShifts, setSwapRequests, setNotifications, setAppMessage } = setters;

  async function handleSwapDecision(requestId, status) {
    const request = swapRequests.find((item) => item.id === requestId);

    if (!request) {
      return;
    }

    const requestedShift = shifts.find((shift) => shift.id === request.shiftId);
    const offeredShift = request.offeredShiftId
      ? shifts.find((shift) => shift.id === request.offeredShiftId)
      : null;
    const targetEmployee = request.targetEmployeeId
      ? employees.find((employee) => employee.id === request.targetEmployeeId) ?? null
      : null;
    const isTradeRequest = Boolean(request.offeredShiftId);
    const isTimeOffRequest = !isTradeRequest && targetEmployee?.role === 'manager';
    const autoDeniedByConflict =
      (status === 'pending_manager' || status === 'approved') &&
      (isTradeRequest
        ? hasTradeConflict(shifts, requestedShift, offeredShift)
        : isTimeOffRequest
          ? false
          : hasOfferConflict(shifts, requestedShift, request.targetEmployeeId));
    const resolvedStatus = autoDeniedByConflict ? 'denied' : status;

    if (isSupabaseMode && session && supabase) {
      try {
        if (resolvedStatus === 'approved') {
          if (isTradeRequest) {
            if (!requestedShift || !offeredShift) {
              throw new Error('Requested trade shifts are no longer available.');
            }

            await upsertShift(
              supabase,
              {
                ...requestedShift,
                employeeId: offeredShift.employeeId,
                isNew: false
              },
              requestedShift.weekStart
            );
            await upsertShift(
              supabase,
              {
                ...offeredShift,
                employeeId: requestedShift.employeeId,
                isNew: false
              },
              offeredShift.weekStart
            );
          } else if (isTimeOffRequest) {
            if (!requestedShift) {
              throw new Error('Requested shift is no longer available.');
            }

            await removeShift(supabase, requestedShift.id);
          } else {
            if (!requestedShift || !request.targetEmployeeId) {
              throw new Error('Requested shift is no longer available.');
            }

            await upsertShift(
              supabase,
              {
                ...requestedShift,
                employeeId: request.targetEmployeeId,
                isNew: false
              },
              requestedShift.weekStart
            );
          }
        }

        await setSwapRequestStatus(supabase, requestId, resolvedStatus);

        if (team?.id) {
          let notificationsToInsert = [];

          if (autoDeniedByConflict) {
            notificationsToInsert = buildNotificationTargets(
              team.id,
              currentEmployeeId,
              [request.requestedBy, request.targetEmployeeId],
              'Schedule Request Denied',
              isTradeRequest
                ? `Trade request for ${toShiftSummary(offeredShift)} and ${toShiftSummary(
                    requestedShift
                  )} was denied automatically due to a schedule conflict.`
                : `Schedule request for ${toShiftSummary(
                    requestedShift
                  )} was denied automatically due to a schedule conflict.`
            );
          } else if (resolvedStatus === 'pending_manager' && !isTimeOffRequest) {
            const managerIds = employees
              .filter((employee) => employee.role === 'manager')
              .map((employee) => employee.id);

            notificationsToInsert = buildNotificationTargets(
              team.id,
              currentEmployeeId,
              managerIds,
              'Schedule Request Awaiting Approval',
              isTradeRequest
                ? `${currentUser?.name ?? 'A teammate'} accepted a trade request between ${toShiftSummary(
                    offeredShift
                  )} and ${toShiftSummary(requestedShift)}. Final manager approval is required.`
                : `${currentUser?.name ?? 'A teammate'} accepted a schedule request for ${toShiftSummary(
                    requestedShift
                  )}. Final manager approval is required.`
            );
          } else if (
            resolvedStatus === 'denied' &&
            currentEmployeeId === request.targetEmployeeId &&
            request.status === 'pending_target'
          ) {
            notificationsToInsert = buildNotificationTargets(
              team.id,
              currentEmployeeId,
              [request.requestedBy],
              'Schedule Request Denied',
              isTradeRequest
                ? `Your teammate denied the request to trade ${toShiftSummary(
                    offeredShift
                  )} for ${toShiftSummary(requestedShift)}.`
                : `Your teammate denied the request for ${toShiftSummary(requestedShift)}.`
            );
          } else if (resolvedStatus === 'approved' || resolvedStatus === 'denied') {
            const finalWord = resolvedStatus === 'approved' ? 'approved' : 'denied';

            if (isTimeOffRequest) {
              notificationsToInsert = buildNotificationTargets(
                team.id,
                currentEmployeeId,
                [request.requestedBy],
                `Time Off Request ${resolvedStatus === 'approved' ? 'Approved' : 'Denied'}`,
                `Manager ${finalWord} your time-off request for ${toShiftSummary(requestedShift)}.`
              );
            } else {
              notificationsToInsert = buildNotificationTargets(
                team.id,
                currentEmployeeId,
                [request.requestedBy, request.targetEmployeeId],
                `Schedule Request ${resolvedStatus === 'approved' ? 'Approved' : 'Denied'}`,
                isTradeRequest
                  ? `Manager ${finalWord} the trade request for ${toShiftSummary(
                      offeredShift
                    )} and ${toShiftSummary(requestedShift)}.`
                  : `Manager ${finalWord} the schedule request for ${toShiftSummary(requestedShift)}.`
              );
            }
          }

          await insertNotifications(supabase, notificationsToInsert);
        }

        await loadSupabaseData();
        if (autoDeniedByConflict) {
          setAppMessage('Schedule request denied automatically due to a shift conflict.');
        } else if (resolvedStatus === 'pending_manager') {
          setAppMessage('Schedule request accepted and sent to manager for final approval.');
        } else if (resolvedStatus === 'approved') {
          setAppMessage(
            isTimeOffRequest
              ? 'Time-off request approved and shift removed.'
              : 'Schedule request approved and shifts updated.'
          );
        } else {
          setAppMessage(isTimeOffRequest ? 'Time-off request denied.' : 'Schedule request denied.');
        }
      } catch (error) {
        setAppMessage(error.message);
      }

      return;
    }

    if (resolvedStatus === 'approved' && requestedShift) {
      if (isTimeOffRequest) {
        setShifts((previous) => previous.filter((shift) => shift.id !== requestedShift.id));
      } else {
        setShifts((previous) =>
          previous.map((shift) => {
            if (isTradeRequest && offeredShift) {
              if (shift.id === requestedShift.id) {
                return {
                  ...shift,
                  employeeId: offeredShift.employeeId
                };
              }

              if (shift.id === offeredShift.id) {
                return {
                  ...shift,
                  employeeId: requestedShift.employeeId
                };
              }

              return shift;
            }

            if (shift.id === requestedShift.id && request.targetEmployeeId) {
              return {
                ...shift,
                employeeId: request.targetEmployeeId
              };
            }

            return shift;
          })
        );
      }
    }

    setSwapRequests((previous) =>
      previous.map((item) => {
        if (item.id !== requestId) {
          return item;
        }

        return {
          ...item,
          status: resolvedStatus
        };
      })
    );

    if (autoDeniedByConflict) {
      addLocalNotification(
        setNotifications,
        'Schedule Request Denied',
        'Request was denied automatically due to a shift conflict.'
      );
    } else if (resolvedStatus === 'pending_manager') {
      addLocalNotification(
        setNotifications,
        'Schedule Request Escalated',
        isTradeRequest
          ? 'Teammate accepted the trade. Waiting for manager approval.'
          : 'Teammate accepted the shift offer. Waiting for manager approval.'
      );
    } else if (resolvedStatus === 'approved') {
      addLocalNotification(
        setNotifications,
        isTimeOffRequest ? 'Time Off Request Approved' : 'Schedule Request Approved',
        isTimeOffRequest
          ? 'Manager approved the time-off request and removed the shift.'
          : isTradeRequest
            ? 'Manager approved the trade and shifts were swapped.'
            : 'Manager approved the request and the shift was reassigned.'
      );
    } else {
      addLocalNotification(
        setNotifications,
        isTimeOffRequest ? 'Time Off Request Denied' : 'Schedule Request Denied',
        isTimeOffRequest ? 'A time-off request was denied.' : 'A schedule request was denied.'
      );
    }
  }

  async function handleCancelSwapRequest(requestId) {
    const request = swapRequests.find((item) => item.id === requestId);
    const requestedShift = request ? shifts.find((shift) => shift.id === request.shiftId) : null;
    const offeredShift = request ? shifts.find((shift) => shift.id === request.offeredShiftId) : null;
    const isTradeRequest = Boolean(request?.offeredShiftId);

    if (!request || request.requestedBy !== currentEmployeeId || !request.status?.startsWith('pending')) {
      return;
    }

    if (isSupabaseMode && session && supabase) {
      try {
        await removeSwapRequest(supabase, requestId);

        if (team?.id) {
          const managerIds =
            request.status === 'pending_manager'
              ? employees
                  .filter((employee) => employee.role === 'manager')
                  .map((employee) => employee.id)
              : [];

          await insertNotifications(
            supabase,
            buildNotificationTargets(
              team.id,
              currentEmployeeId,
              [request.targetEmployeeId, ...managerIds],
              'Schedule Request Cancelled',
              isTradeRequest
                ? `${currentUser?.name ?? 'A teammate'} cancelled the trade request for ${toShiftSummary(
                    offeredShift
                  )} and ${toShiftSummary(requestedShift)}.`
                : `${currentUser?.name ?? 'A teammate'} cancelled the schedule request for ${toShiftSummary(
                    requestedShift
                  )}.`
            )
          );
        }

        await loadSupabaseData();
        setAppMessage('Schedule request cancelled.');
      } catch (error) {
        setAppMessage(error.message);
      }

      return;
    }

    setSwapRequests((previous) => previous.filter((item) => item.id !== requestId));
    addLocalNotification(
      setNotifications,
      'Schedule Request Cancelled',
      'Your pending schedule request was cancelled.'
    );
  }

  return {
    handleSwapDecision,
    handleCancelSwapRequest
  };
}
