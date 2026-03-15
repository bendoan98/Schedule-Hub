import { useCallback, useEffect, useMemo, useState } from 'react';
import { addWeeks, subWeeks } from 'date-fns';
import DashboardStats from './features/dashboard/DashboardStats';
import WeeklyCalendar from './features/schedule/WeeklyCalendar';
import ShiftEditorModal from './features/shifts/ShiftEditorModal';
import NotificationBell from './features/notifications/NotificationBell';
import MessageBoard from './features/board/MessageBoard';
import ExportButtons from './features/export/ExportButtons';
import ManagerPage from './features/manager/ManagerPage';
import SwapRequestsPanel from './features/swaps/SwapRequestsPanel';
import SwapTradeRequestModal from './features/swaps/SwapTradeRequestModal';
import {
  mockBoardPosts,
  mockEmployees,
  mockNotifications,
  mockShifts,
  mockSwapRequests
} from './data/mockData';
import { hasSupabaseCredentials, supabase } from './lib/supabaseClient';
import {
  createDepartment,
  createSwapRequest,
  createTeamForCurrentUser,
  deleteDepartment,
  ensureDepartment,
  fetchAppData,
  insertCsvShifts,
  insertMessagePost,
  insertNotifications,
  joinTeamWithInviteCode,
  markAllNotificationsRead,
  renameDepartment,
  replaceDepartmentForTeam,
  removeShift,
  removeSwapRequest,
  setSwapRequestStatus,
  updateEmployeeDepartment,
  upsertShift
} from './lib/supabaseData';
import {
  DEFAULT_DEPARTMENT,
  buildDepartmentList,
  normalizeDepartmentName,
  toStoredDepartment
} from './utils/department';
import { getMonday, toIsoDate } from './utils/date';
import { newId } from './utils/id';

const ROLES = ['manager', 'employee'];
const TEAM_MODES = ['create', 'join'];
const PAGE_MODES = ['schedule', 'manager'];

export default function App() {
  const isSupabaseMode = Boolean(hasSupabaseCredentials && supabase);
  const localDepartments = buildDepartmentList(mockEmployees.map((employee) => employee.department));

  const [employees, setEmployees] = useState(isSupabaseMode ? [] : mockEmployees);
  const [team, setTeam] = useState(isSupabaseMode ? null : { id: 'local-team', name: 'Demo Team' });
  const [teamDepartments, setTeamDepartments] = useState(isSupabaseMode ? [] : localDepartments);
  const [shifts, setShifts] = useState(isSupabaseMode ? [] : mockShifts);
  const [swapRequests, setSwapRequests] = useState(isSupabaseMode ? [] : mockSwapRequests);
  const [notifications, setNotifications] = useState(isSupabaseMode ? [] : mockNotifications);
  const [boardPosts, setBoardPosts] = useState(isSupabaseMode ? [] : mockBoardPosts);
  const [weekStart, setWeekStart] = useState(toIsoDate(getMonday()));
  const [role, setRole] = useState(isSupabaseMode ? 'employee' : 'manager');
  const [currentEmployeeId, setCurrentEmployeeId] = useState(isSupabaseMode ? '' : 'emp-alex');
  const [editingShift, setEditingShift] = useState(null);
  const [swapTradeTargetShift, setSwapTradeTargetShift] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseMode);
  const [dataLoading, setDataLoading] = useState(false);

  const [authMode, setAuthMode] = useState('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState('');
  const [fullName, setFullName] = useState('');
  const [teamSetupMode, setTeamSetupMode] = useState('create');
  const [teamNameInput, setTeamNameInput] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [updatingDepartmentEmployeeId, setUpdatingDepartmentEmployeeId] = useState('');
  const [departmentActionLoading, setDepartmentActionLoading] = useState(false);
  const [activePage, setActivePage] = useState('schedule');

  const [authError, setAuthError] = useState('');
  const [appMessage, setAppMessage] = useState('');

  const currentUser = useMemo(() => {
    return employees.find((employee) => employee.id === currentEmployeeId) ?? null;
  }, [employees, currentEmployeeId]);

  const visibleEmployees = useMemo(() => {
    if (role === 'manager') {
      return employees;
    }

    const activeEmployee = employees.find((employee) => employee.id === currentEmployeeId);

    if (!activeEmployee) {
      return [];
    }

    const activeDepartment = normalizeDepartmentName(activeEmployee.department);

    if (!activeDepartment) {
      return [activeEmployee];
    }

    return employees.filter(
      (employee) => normalizeDepartmentName(employee.department) === activeDepartment
    );
  }, [employees, role, currentEmployeeId]);

  const departments = useMemo(() => {
    return buildDepartmentList(teamDepartments ?? []);
  }, [teamDepartments]);

  const postsWithAuthors = useMemo(() => {
    const employeesById = new Map(employees.map((employee) => [employee.id, employee.name]));

    return boardPosts.map((post) => ({
      ...post,
      authorName: employeesById.get(post.authorId) ?? 'Unknown Employee'
    }));
  }, [boardPosts, employees]);

  const weekDate = useMemo(() => new Date(`${weekStart}T12:00:00`), [weekStart]);

  const swapTargetEmployee = useMemo(() => {
    if (!swapTradeTargetShift) {
      return null;
    }

    return employees.find((employee) => employee.id === swapTradeTargetShift.employeeId) ?? null;
  }, [swapTradeTargetShift, employees]);

  const tradeableShifts = useMemo(() => {
    return shifts
      .filter((shift) => shift.employeeId === currentEmployeeId && shift.weekStart === weekStart)
      .sort((left, right) => {
        if (left.day !== right.day) {
          return left.day - right.day;
        }

        return left.startTime.localeCompare(right.startTime);
      });
  }, [shifts, currentEmployeeId, weekStart]);

  useEffect(() => {
    if (role !== 'manager') {
      setActivePage('schedule');
    }
  }, [role]);

  const loadSupabaseData = useCallback(async () => {
    if (!isSupabaseMode || !supabase || !session) {
      return;
    }

    setDataLoading(true);

    try {
      const snapshot = await fetchAppData(supabase);

      setEmployees(snapshot.employees);
      setTeam(snapshot.team);
      setTeamDepartments(snapshot.departments ?? []);
      setShifts(snapshot.shifts);
      setSwapRequests(snapshot.swapRequests);
      setNotifications(snapshot.notifications);
      setBoardPosts(snapshot.boardPosts);

      const profile = snapshot.employees.find((employee) => employee.id === session.user.id);

      if (profile) {
        setCurrentEmployeeId(profile.id);
        setRole(profile.role);
      } else {
        setCurrentEmployeeId(session.user.id);
        setRole('employee');
        setAppMessage('No matching employee profile found for this auth user ID.');
      }
    } catch (error) {
      setAppMessage(error.message);
    } finally {
      setDataLoading(false);
    }
  }, [isSupabaseMode, session]);

  useEffect(() => {
    if (!isSupabaseMode || !supabase) {
      return undefined;
    }

    let active = true;

    async function bootstrapSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (error) {
        setAuthError(error.message);
      }

      setSession(data.session ?? null);
      setAuthLoading(false);
    }

    bootstrapSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setAuthError('');

      if (!nextSession) {
        setEmployees([]);
        setTeam(null);
        setTeamDepartments([]);
        setShifts([]);
        setSwapRequests([]);
        setNotifications([]);
        setBoardPosts([]);
        setCurrentEmployeeId('');
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isSupabaseMode]);

  useEffect(() => {
    if (!isSupabaseMode || !session) {
      return;
    }

    loadSupabaseData();
  }, [isSupabaseMode, session, loadSupabaseData]);

  useEffect(() => {
    if (!isSupabaseMode || !supabase || !session) {
      return undefined;
    }

    const channel = supabase
      .channel(`schedule-hub-realtime-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => loadSupabaseData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => loadSupabaseData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => loadSupabaseData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => loadSupabaseData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'swap_requests' }, () => loadSupabaseData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => loadSupabaseData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_posts' }, () => loadSupabaseData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSupabaseMode, session, loadSupabaseData]);

  async function completeTeamSetup({ mode, teamName, inviteCode }) {
    if (!supabase) {
      return null;
    }

    if (mode === 'create') {
      const trimmedTeamName = teamName.trim();

      if (!trimmedTeamName) {
        throw new Error('Team name is required.');
      }

      const createdTeam = await createTeamForCurrentUser(supabase, trimmedTeamName);
      setAppMessage(`Team created: ${createdTeam.name}. Invite code: ${createdTeam.inviteCode}`);
      return createdTeam;
    }

    const trimmedInviteCode = inviteCode.trim().toUpperCase();

    if (!trimmedInviteCode) {
      throw new Error('Invite code is required.');
    }

    const joinedTeam = await joinTeamWithInviteCode(supabase, trimmedInviteCode);
    setAppMessage(`Joined team: ${joinedTeam.name}.`);
    return joinedTeam;
  }

  function addLocalNotification(title, body) {
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

  function toShiftSummary(shift) {
    if (!shift) {
      return 'Day ? (--:----:--)';
    }

    return `Day ${shift.day + 1} (${shift.startTime}-${shift.endTime})`;
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

  function hasTradeConflict(requestedShift, offeredShift) {
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

  function buildNotificationTargets(recipientIds, title, body) {
    if (!team?.id) {
      return [];
    }

    return Array.from(new Set(recipientIds))
      .filter((employeeId) => employeeId && employeeId !== currentEmployeeId)
      .map((employeeId) => ({
        teamId: team.id,
        targetEmployeeId: employeeId,
        title,
        body
      }));
  }

  function handleRoleChange(nextRole) {
    if (isSupabaseMode) {
      return;
    }

    setRole(nextRole);
    setActivePage('schedule');

    const matchingEmployee = employees.find((employee) => employee.role === nextRole);

    if (matchingEmployee) {
      setCurrentEmployeeId(matchingEmployee.id);
    }
  }

  async function handleCsvImport(result, importWeekStart = weekStart) {
    if (!isSupabaseMode || !session || !supabase) {
      setEmployees((previous) => [...previous, ...result.importedEmployees]);
      setShifts((previous) => [...previous, ...result.importedShifts]);
      addLocalNotification('Schedule Imported', `Added ${result.importedShifts.length} shifts from CSV.`);
      return `Imported ${result.rowCount} rows and ${result.importedShifts.length} shifts.`;
    }

    try {
      const knownEmployeeIds = new Set(employees.map((employee) => employee.id));
      const validShifts = result.importedShifts.filter((shift) => knownEmployeeIds.has(shift.employeeId));
      const skippedShiftCount = result.importedShifts.length - validShifts.length;

      if (validShifts.length === 0) {
        return 'No shifts imported. CSV employee_name values must match employees in your team.';
      }

      const insertedCount = await insertCsvShifts(supabase, validShifts, importWeekStart);

      if (team?.id) {
        const employeeNotifications = employees
          .filter((employee) => employee.role === 'employee' && employee.id !== currentEmployeeId)
          .map((employee) => ({
            teamId: team.id,
            targetEmployeeId: employee.id,
            title: 'New Schedule Available',
            body: `A new schedule was published for the week of ${importWeekStart}.`
          }));

        await insertNotifications(supabase, employeeNotifications);
      }

      await loadSupabaseData();

      const summary =
        skippedShiftCount > 0
          ? `Imported ${insertedCount} shifts. Skipped ${skippedShiftCount} shifts for unknown employees.`
          : `Imported ${insertedCount} shifts.`;

      setAppMessage(summary);
      return summary;
    } catch (error) {
      setAppMessage(error.message);
      return `Import failed: ${error.message}`;
    }
  }

  function handleAddShift(employeeId, day) {
    setEditingShift({
      id: newId(),
      employeeId,
      day,
      startTime: '09:00',
      endTime: '17:00',
      weekStart,
      isNew: true
    });
  }

  function handleShiftClick(shift) {
    if (role === 'manager') {
      setEditingShift({ ...shift, isNew: false });
      return;
    }

    if (shift.employeeId === currentEmployeeId) {
      return;
    }

    const requester = employees.find((employee) => employee.id === currentEmployeeId);
    const targetEmployee = employees.find((employee) => employee.id === shift.employeeId);
    const requesterDepartment = normalizeDepartmentName(requester?.department);
    const targetDepartment = normalizeDepartmentName(targetEmployee?.department);

    if (!requesterDepartment || requesterDepartment !== targetDepartment) {
      setAppMessage('Shift swaps are only available with teammates in your department.');
      return;
    }

    setSwapTradeTargetShift(shift);
  }

  async function handleSaveShift(updatedShift) {
    if (isSupabaseMode && session && supabase) {
      try {
        await upsertShift(supabase, { ...updatedShift, weekStart }, weekStart);
        setEditingShift(null);
        await loadSupabaseData();
        setAppMessage('Shift saved.');
      } catch (error) {
        setAppMessage(error.message);
      }

      return;
    }

    const shiftToSave = {
      id: updatedShift.id,
      employeeId: updatedShift.employeeId,
      day: Number(updatedShift.day),
      startTime: updatedShift.startTime,
      endTime: updatedShift.endTime,
      weekStart
    };

    setShifts((previous) => {
      const exists = previous.some((shift) => shift.id === shiftToSave.id);

      if (exists) {
        return previous.map((shift) => (shift.id === shiftToSave.id ? shiftToSave : shift));
      }

      return [...previous, shiftToSave];
    });

    setEditingShift(null);
    addLocalNotification('Shift Saved', 'A shift was added or updated.');
  }

  async function handleDeleteShift(shiftId) {
    if (isSupabaseMode && session && supabase) {
      try {
        await removeShift(supabase, shiftId);
        setEditingShift(null);
        await loadSupabaseData();
        setAppMessage('Shift deleted.');
      } catch (error) {
        setAppMessage(error.message);
      }

      return;
    }

    setShifts((previous) => previous.filter((shift) => shift.id !== shiftId));
    setEditingShift(null);
    addLocalNotification('Shift Deleted', 'A shift was removed from the schedule.');
  }

  function handleRequestSwap() {
    // Shift trade requests now start from clicking another employee's shift card.
    setAppMessage('Click another teammate’s shift to request a trade.');
  }

  async function handleSubmitSwapTrade({ offeredShiftId, reason }) {
    if (!swapTradeTargetShift) {
      return;
    }

    const targetShift = swapTradeTargetShift;
    const offeredShift = shifts.find((shift) => shift.id === offeredShiftId);

    if (!offeredShift) {
      setAppMessage('Select one of your shifts to trade.');
      return;
    }

    if (hasTradeConflict(targetShift, offeredShift)) {
      setSwapTradeTargetShift(null);
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
            [targetShift.employeeId],
            'Swap Request Received',
            `${currentUser?.name ?? 'A teammate'} requested to trade ${toShiftSummary(
              offeredShift
            )} for your ${toShiftSummary(targetShift)}${trimmedReason ? `: ${trimmedReason}` : '.'}`
          )
        );

        await loadSupabaseData();
        setAppMessage('Swap request sent to teammate.');
      } catch (error) {
        setAppMessage(error.message);
      } finally {
        setSwapTradeTargetShift(null);
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

    setSwapTradeTargetShift(null);
    addLocalNotification(
      'Swap Request Sent',
      `${currentUser?.name ?? 'Employee'} requested to trade with ${swapTargetEmployee?.name ?? 'teammate'}.`
    );
  }

  async function handleSwapDecision(requestId, status) {
    const request = swapRequests.find((item) => item.id === requestId);
    const requestedShift = request ? shifts.find((shift) => shift.id === request.shiftId) : null;
    const offeredShift = request ? shifts.find((shift) => shift.id === request.offeredShiftId) : null;
    const autoDeniedByConflict =
      (status === 'pending_manager' || status === 'approved') &&
      hasTradeConflict(requestedShift, offeredShift);
    const resolvedStatus = autoDeniedByConflict ? 'denied' : status;

    if (!request) {
      return;
    }

    if (isSupabaseMode && session && supabase) {
      try {
        if (resolvedStatus === 'approved' && requestedShift && offeredShift) {
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
        }

        await setSwapRequestStatus(supabase, requestId, resolvedStatus);

        if (team?.id) {
          let notificationsToInsert = [];

          if (autoDeniedByConflict) {
            notificationsToInsert = buildNotificationTargets(
              [request.requestedBy, request.targetEmployeeId],
              'Swap Request Denied',
              `Trade request for ${toShiftSummary(offeredShift)} and ${toShiftSummary(
                requestedShift
              )} was denied automatically due to a schedule conflict.`
            );
          } else if (resolvedStatus === 'pending_manager') {
            const managerIds = employees
              .filter((employee) => employee.role === 'manager')
              .map((employee) => employee.id);

            notificationsToInsert = buildNotificationTargets(
              managerIds,
              'Swap Request Awaiting Approval',
              `${currentUser?.name ?? 'A teammate'} accepted a trade request between ${toShiftSummary(
                offeredShift
              )} and ${toShiftSummary(requestedShift)}. Final manager approval is required.`
            );
          } else if (resolvedStatus === 'denied' && currentEmployeeId === request.targetEmployeeId) {
            notificationsToInsert = buildNotificationTargets(
              [request.requestedBy],
              'Swap Request Denied',
              `Your teammate denied the request to trade ${toShiftSummary(offeredShift)} for ${toShiftSummary(
                requestedShift
              )}.`
            );
          } else if (resolvedStatus === 'approved' || resolvedStatus === 'denied') {
            const finalWord = resolvedStatus === 'approved' ? 'approved' : 'denied';
            notificationsToInsert = buildNotificationTargets(
              [request.requestedBy, request.targetEmployeeId],
              `Swap Request ${resolvedStatus === 'approved' ? 'Approved' : 'Denied'}`,
              `Manager ${finalWord} the trade request for ${toShiftSummary(offeredShift)} and ${toShiftSummary(
                requestedShift
              )}.`
            );
          }

          await insertNotifications(
            supabase,
            notificationsToInsert
          );
        }

        await loadSupabaseData();
        if (autoDeniedByConflict) {
          setAppMessage('Schedule request denied automatically due to a shift conflict.');
        } else if (resolvedStatus === 'pending_manager') {
          setAppMessage('Swap request accepted and sent to manager for final approval.');
        } else if (resolvedStatus === 'approved') {
          setAppMessage('Swap request approved and shifts updated.');
        } else {
          setAppMessage('Swap request denied.');
        }
      } catch (error) {
        setAppMessage(error.message);
      }

      return;
    }

    if (resolvedStatus === 'approved' && requestedShift && offeredShift) {
      setShifts((previous) =>
        previous.map((shift) => {
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
        })
      );
    }

    setSwapRequests((previous) =>
      previous.map((request) => {
        if (request.id !== requestId) {
          return request;
        }

        return {
          ...request,
          status: resolvedStatus
        };
      })
    );

    if (autoDeniedByConflict) {
      addLocalNotification('Swap Request Denied', 'Request was denied automatically due to a shift conflict.');
    } else if (resolvedStatus === 'pending_manager') {
      addLocalNotification('Swap Request Escalated', 'Teammate accepted the trade. Waiting for manager approval.');
    } else if (resolvedStatus === 'approved') {
      addLocalNotification('Swap Request Approved', 'Manager approved the trade and shifts were swapped.');
    } else {
      addLocalNotification('Swap Request Denied', 'A swap request was denied.');
    }
  }

  async function handleCancelSwapRequest(requestId) {
    const request = swapRequests.find((item) => item.id === requestId);
    const requestedShift = request ? shifts.find((shift) => shift.id === request.shiftId) : null;
    const offeredShift = request ? shifts.find((shift) => shift.id === request.offeredShiftId) : null;

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
              [request.targetEmployeeId, ...managerIds],
              'Swap Request Cancelled',
              `${currentUser?.name ?? 'A teammate'} cancelled the trade request for ${toShiftSummary(
                offeredShift
              )} and ${toShiftSummary(requestedShift)}.`
            )
          );
        }

        await loadSupabaseData();
        setAppMessage('Swap request cancelled.');
      } catch (error) {
        setAppMessage(error.message);
      }

      return;
    }

    setSwapRequests((previous) => previous.filter((item) => item.id !== requestId));
    addLocalNotification('Swap Request Cancelled', 'Your pending swap request was cancelled.');
  }

  async function handleMarkAllRead() {
    if (isSupabaseMode && session && supabase) {
      try {
        await markAllNotificationsRead(supabase);
        await loadSupabaseData();
      } catch (error) {
        setAppMessage(error.message);
      }

      return;
    }

    setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true })));
  }

  async function handleAddBoardPost(newPost) {
    if (isSupabaseMode && session && supabase) {
      try {
        if (!team?.id) {
          throw new Error('Join or create a team before posting.');
        }

        await insertMessagePost(supabase, {
          ...newPost,
          teamId: team.id
        });

        await loadSupabaseData();
      } catch (error) {
        setAppMessage(error.message);
      }

      return;
    }

    setBoardPosts((previous) => [
      {
        id: newId(),
        ...newPost,
        createdAt: new Date().toISOString()
      },
      ...previous
    ]);
  }

  async function handleUpdateEmployeeDepartment(employeeId, departmentValue) {
    const nextDepartment = normalizeDepartmentName(departmentValue) || null;
    setUpdatingDepartmentEmployeeId(employeeId);

    if (isSupabaseMode && session && supabase) {
      try {
        const previousEmployee = employees.find((employee) => employee.id === employeeId);
        await updateEmployeeDepartment(supabase, {
          employeeId,
          teamId: team?.id ?? null,
          department: nextDepartment
        });

        if (team?.id && nextDepartment && !departments.includes(nextDepartment)) {
          await ensureDepartment(supabase, team.id, nextDepartment);
        }

        if (team?.id) {
          const departmentNotifications =
            employeeId === currentEmployeeId
              ? []
              : [
                  {
                    teamId: team.id,
                    targetEmployeeId: employeeId,
                    title: 'Department Updated',
                    body: `Your department changed from ${
                      previousEmployee?.department ?? 'no department'
                    } to ${nextDepartment ?? 'no department'}.`
                  }
                ];

          await insertNotifications(supabase, departmentNotifications);
        }

        await loadSupabaseData();
        setAppMessage('Department updated.');
      } catch (error) {
        setAppMessage(error.message);
      } finally {
        setUpdatingDepartmentEmployeeId('');
      }

      return;
    }

    setEmployees((previous) =>
      previous.map((employee) => {
        if (employee.id !== employeeId) {
          return employee;
        }

        return {
          ...employee,
          department: nextDepartment
        };
      })
    );

    if (nextDepartment) {
      setTeamDepartments((previous) => buildDepartmentList([...(previous ?? []), nextDepartment]));
    }

    setUpdatingDepartmentEmployeeId('');
    addLocalNotification('Department Updated', 'Employee department was updated.');
  }

  async function handleAddDepartment(departmentName) {
    const normalizedDepartment = normalizeDepartmentName(departmentName);

    if (!normalizedDepartment || departments.includes(normalizedDepartment)) {
      return;
    }

    const nextDepartments = buildDepartmentList([...departments, normalizedDepartment]);
    setDepartmentActionLoading(true);

    if (isSupabaseMode && session && supabase) {
      try {
        if (!team?.id) {
          throw new Error('Join or create a team before managing departments.');
        }

        await createDepartment(supabase, team.id, normalizedDepartment);
        await loadSupabaseData();
        setAppMessage(`Department ${normalizedDepartment} added.`);
      } catch (error) {
        setAppMessage(error.message);
      } finally {
        setDepartmentActionLoading(false);
      }

      return;
    }

    setTeamDepartments(nextDepartments);

    setDepartmentActionLoading(false);
    addLocalNotification('Department Added', `${normalizedDepartment} was added to the team list.`);
  }

  async function handleRenameDepartment(currentDepartment, nextDepartmentName) {
    const sourceDepartment = toStoredDepartment(currentDepartment);
    const targetDepartment = toStoredDepartment(nextDepartmentName);

    if (
      sourceDepartment === DEFAULT_DEPARTMENT ||
      sourceDepartment === targetDepartment ||
      departments.includes(targetDepartment)
    ) {
      return;
    }

    const nextDepartments = buildDepartmentList(
      departments.map((departmentName) => {
        if (departmentName === sourceDepartment) {
          return targetDepartment;
        }

        return departmentName;
      })
    );

    setDepartmentActionLoading(true);

    if (isSupabaseMode && session && supabase) {
      try {
        if (!team?.id) {
          throw new Error('Join or create a team before managing departments.');
        }

        const affectedEmployeeIds = employees
          .filter(
            (employee) =>
              toStoredDepartment(employee.department) === sourceDepartment &&
              employee.id !== currentEmployeeId
          )
          .map((employee) => employee.id);

        await replaceDepartmentForTeam(supabase, {
          teamId: team.id,
          fromDepartment: sourceDepartment,
          toDepartment: targetDepartment
        });
        await renameDepartment(supabase, {
          teamId: team.id,
          fromName: sourceDepartment,
          toName: targetDepartment
        });
        await insertNotifications(
          supabase,
          affectedEmployeeIds.map((employeeId) => ({
            teamId: team.id,
            targetEmployeeId: employeeId,
            title: 'Department Updated',
            body: `Your department changed from ${sourceDepartment} to ${targetDepartment}.`
          }))
        );
        await loadSupabaseData();
        setAppMessage(`Department ${sourceDepartment} renamed to ${targetDepartment}.`);
      } catch (error) {
        setAppMessage(error.message);
      } finally {
        setDepartmentActionLoading(false);
      }

      return;
    }

    setEmployees((previous) =>
      previous.map((employee) => {
        if (toStoredDepartment(employee.department) !== sourceDepartment) {
          return employee;
        }

        return {
          ...employee,
          department: targetDepartment
        };
      })
    );

    setTeamDepartments(nextDepartments);

    setDepartmentActionLoading(false);
    addLocalNotification('Department Renamed', `${sourceDepartment} is now ${targetDepartment}.`);
  }

  async function handleDeleteDepartment(departmentName) {
    const sourceDepartment = toStoredDepartment(departmentName);

    if (sourceDepartment === DEFAULT_DEPARTMENT) {
      return;
    }

    const nextDepartments = buildDepartmentList(
      departments.filter((departmentValue) => departmentValue !== sourceDepartment)
    );

    setDepartmentActionLoading(true);

    if (isSupabaseMode && session && supabase) {
      try {
        if (!team?.id) {
          throw new Error('Join or create a team before managing departments.');
        }

        const affectedEmployeeIds = employees
          .filter(
            (employee) =>
              toStoredDepartment(employee.department) === sourceDepartment &&
              employee.id !== currentEmployeeId
          )
          .map((employee) => employee.id);

        await replaceDepartmentForTeam(supabase, {
          teamId: team.id,
          fromDepartment: sourceDepartment,
          toDepartment: null
        });
        await deleteDepartment(supabase, {
          teamId: team.id,
          name: sourceDepartment
        });
        await insertNotifications(
          supabase,
          affectedEmployeeIds.map((employeeId) => ({
            teamId: team.id,
            targetEmployeeId: employeeId,
            title: 'Department Updated',
            body: `Your department ${sourceDepartment} was removed.`
          }))
        );
        await loadSupabaseData();
        setAppMessage(`Department ${sourceDepartment} deleted.`);
      } catch (error) {
        setAppMessage(error.message);
      } finally {
        setDepartmentActionLoading(false);
      }

      return;
    }

    setEmployees((previous) =>
      previous.map((employee) => {
        if (toStoredDepartment(employee.department) !== sourceDepartment) {
          return employee;
        }

        return {
          ...employee,
          department: null
        };
      })
    );

    setTeamDepartments(nextDepartments);

    setDepartmentActionLoading(false);
    addLocalNotification('Department Deleted', `${sourceDepartment} moved to no department.`);
  }

  async function handleSignIn(event) {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    setAuthError('');
    setAppMessage('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthError(error.message);
      return;
    }

    setPassword('');
  }

  async function handleSignUp(event) {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setAuthError('Full name is required.');
      return;
    }

    setAuthError('');
    setAppMessage('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: trimmedName
        }
      }
    });

    if (error) {
      setAuthError(error.message);
      return;
    }

    setPassword('');
    setFullName('');

    if (data.session) {
      await loadSupabaseData();
      setAppMessage('Account created. Set up your team to continue.');

      return;
    }

    setAuthMode('sign_in');
    setAppMessage('Sign-up successful. Confirm your email, then sign in to finish team setup.');
  }

  async function handleTeamSetupSubmit(event) {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    setAuthError('');

    try {
      await completeTeamSetup({
        mode: teamSetupMode,
        teamName: teamNameInput,
        inviteCode: inviteCodeInput
      });

      await loadSupabaseData();
      setTeamNameInput('');
      setInviteCodeInput('');
    } catch (error) {
      setAuthError(error.message);
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthError(error.message);
    }
  }

  async function handleForgotPassword() {
    if (!supabase) {
      return;
    }

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setAuthError('Enter your email first.');
      return;
    }

    setAuthError('');

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setAppMessage(`Password reset email sent to ${trimmedEmail}.`);
  }

  async function handleOAuthSignIn(provider) {
    if (!supabase || oauthLoadingProvider) {
      return;
    }

    setAuthError('');
    setAppMessage('');
    setOauthLoadingProvider(provider);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        setAuthError(error.message);
        setOauthLoadingProvider('');
        return;
      }

      setAppMessage(`Redirecting to ${provider === 'google' ? 'Google' : 'Facebook'}...`);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'OAuth sign-in failed.');
      setOauthLoadingProvider('');
    }
  }

  const showAuthPanel = isSupabaseMode && !session;
  const missingProfile = isSupabaseMode && session && !dataLoading && !currentUser;
  const needsTeamSetup = isSupabaseMode && session && currentUser && !currentUser.teamId;
  const waitingForInitialProfile = isSupabaseMode && session && dataLoading && !currentUser;
  const showCoreApp = !showAuthPanel && !waitingForInitialProfile && !missingProfile && !needsTeamSetup;
  const canViewManagerPage = role === 'manager';
  const isManagerPage = showCoreApp && canViewManagerPage && activePage === 'manager';

  return (
    <div className={`app-shell ${showAuthPanel && !authLoading ? 'auth-view' : ''}`}>
      <header className="app-header">
        <div>
          <h1>Schedule Hub</h1>
          <p>Employee scheduling template with Supabase-ready architecture.</p>

          {!isSupabaseMode ? (
            <p className="status-banner">Running with mock data. Add `.env.local` values to connect Supabase.</p>
          ) : null}

          {isSupabaseMode && session ? (
            <p className="status-banner">
              Connected as {session.user.email}
              {team?.name ? ` | Team: ${team.name}` : ''}
              {team?.inviteCode && role === 'manager' ? ` | Invite Code: ${team.inviteCode}` : ''}
            </p>
          ) : null}

          {appMessage ? <p className="status-banner">{appMessage}</p> : null}
          {dataLoading ? <p className="status-banner">Syncing latest data...</p> : null}
        </div>

        <div className="header-actions">
          {!isSupabaseMode ? (
            <>
              <div className="role-toggle" role="tablist" aria-label="Role toggle">
                {ROLES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={role === option ? 'active' : ''}
                    onClick={() => handleRoleChange(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <label>
                Active User
                <select
                  value={currentEmployeeId}
                  onChange={(event) => setCurrentEmployeeId(event.target.value)}
                >
                  {employees
                    .filter((employee) => employee.role === role)
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                </select>
              </label>
            </>
          ) : null}

          {isSupabaseMode && session ? (
            <>
              <div className="session-chip">
                <strong>{currentUser?.name ?? session.user.email}</strong>
                <small>{role}</small>
              </div>

              <button type="button" onClick={handleSignOut}>
                Sign Out
              </button>
            </>
          ) : null}

          {showCoreApp ? (
            canViewManagerPage ? (
              <div className="role-toggle" role="tablist" aria-label="Page toggle">
                {PAGE_MODES.map((pageMode) => (
                  <button
                    key={pageMode}
                    type="button"
                    className={activePage === pageMode ? 'active' : ''}
                    onClick={() => setActivePage(pageMode)}
                  >
                    {pageMode === 'schedule' ? 'Schedule' : 'Manager Page'}
                  </button>
                ))}
              </div>
            ) : null
          ) : null}

          {showCoreApp ? (
            <NotificationBell notifications={notifications} onMarkAllRead={handleMarkAllRead} />
          ) : null}
        </div>
      </header>

      {authLoading ? <section className="panel">Checking Supabase session...</section> : null}

      {showAuthPanel && !authLoading ? (
        <section className="panel auth-panel auth-template-panel">
          <div className="auth-mode-toggle auth-template-toggle" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={authMode === 'sign_in' ? 'active' : ''}
              onClick={() => {
                setAuthMode('sign_in');
                setAuthError('');
                setShowPassword(false);
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === 'sign_up' ? 'active' : ''}
              onClick={() => {
                setAuthMode('sign_up');
                setAuthError('');
                setShowPassword(false);
              }}
            >
              Sign Up
            </button>
          </div>

          <h3 className="auth-template-title">{authMode === 'sign_up' ? 'Create account' : 'Welcome back'}</h3>

          <form className="auth-form auth-template-form" onSubmit={authMode === 'sign_up' ? handleSignUp : handleSignIn}>
            {authMode === 'sign_up' ? (
              <label className="auth-field">
                <span>Full Name</span>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden="true">
                    👤
                  </span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                    autoComplete="name"
                    placeholder="John Doe"
                  />
                </div>
              </label>
            ) : null}

            <label className="auth-field">
              <span>Email</span>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  📨
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  🔒
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete={authMode === 'sign_up' ? 'new-password' : 'current-password'}
                  placeholder={authMode === 'sign_up' ? 'Create a password' : 'Enter password'}
                />
                <button
                  type="button"
                  className="auth-input-action"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {authMode === 'sign_in' ? (
              <button type="button" className="inline-link auth-forgot-link" onClick={handleForgotPassword}>
                Forgot password?
              </button>
            ) : null}

            <button type="submit" className="primary auth-submit-button">
              {authMode === 'sign_up' ? 'Sign Up' : 'Log In'}
            </button>

            <div className="auth-divider">
              <span>Or continue with</span>
            </div>

            <div className="auth-social-row">
              <button
                type="button"
                className={`auth-social-button ${oauthLoadingProvider === 'google' ? 'is-loading' : ''}`}
                disabled={Boolean(oauthLoadingProvider)}
                aria-busy={oauthLoadingProvider === 'google'}
                onClick={() => handleOAuthSignIn('google')}
              >
                <span className="auth-social-icon" aria-hidden="true">
                  G
                </span>
                <span>{oauthLoadingProvider === 'google' ? 'Connecting...' : 'Google'}</span>
                {oauthLoadingProvider === 'google' ? (
                  <span className="auth-social-spinner" aria-hidden="true" />
                ) : null}
              </button>
              <button
                type="button"
                className={`auth-social-button ${oauthLoadingProvider === 'facebook' ? 'is-loading' : ''}`}
                disabled={Boolean(oauthLoadingProvider)}
                aria-busy={oauthLoadingProvider === 'facebook'}
                onClick={() => handleOAuthSignIn('facebook')}
              >
                <span className="auth-social-icon" aria-hidden="true">
                  f
                </span>
                <span>{oauthLoadingProvider === 'facebook' ? 'Connecting...' : 'Facebook'}</span>
                {oauthLoadingProvider === 'facebook' ? (
                  <span className="auth-social-spinner" aria-hidden="true" />
                ) : null}
              </button>
            </div>
          </form>

          {authError ? <p className="status-banner">{authError}</p> : null}
        </section>
      ) : null}

      {missingProfile ? (
        <section className="panel auth-panel">
          <h3>Profile Not Found</h3>
          <p>Your auth user does not have an `employees` row yet. Re-run `supabase/schema.sql` and try signing in again.</p>
        </section>
      ) : null}

      {needsTeamSetup ? (
        <section className="panel auth-panel">
          <h3>Set Up Your Team</h3>
          <p>Create a new team (you become manager) or join an existing one with an invite code.</p>

          <form className="auth-form" onSubmit={handleTeamSetupSubmit}>
            <div className="auth-mode-toggle" role="tablist" aria-label="Team setup mode">
              {TEAM_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={teamSetupMode === mode ? 'active' : ''}
                  onClick={() => setTeamSetupMode(mode)}
                >
                  {mode === 'create' ? 'Create Team' : 'Join Team'}
                </button>
              ))}
            </div>

            {teamSetupMode === 'create' ? (
              <label>
                Team Name
                <input
                  type="text"
                  value={teamNameInput}
                  onChange={(event) => setTeamNameInput(event.target.value)}
                  placeholder="Downtown Ops"
                  required
                />
              </label>
            ) : (
              <label>
                Invite Code
                <input
                  type="text"
                  value={inviteCodeInput}
                  onChange={(event) => setInviteCodeInput(event.target.value.toUpperCase())}
                  placeholder="ABC12345"
                  required
                />
              </label>
            )}

            <button type="submit" className="primary">
              Continue
            </button>
          </form>

          {authError ? <p className="status-banner">{authError}</p> : null}
        </section>
      ) : null}

      {showCoreApp ? (
        <>
          {!isManagerPage ? (
            <DashboardStats
              shifts={shifts}
              swapRequests={swapRequests}
              employees={employees}
              weekStart={weekStart}
              role={role}
              currentEmployeeId={currentEmployeeId}
            />
          ) : null}

          {isManagerPage ? (
            <ManagerPage
              weekStart={weekStart}
              departments={departments}
              employees={employees}
              onImport={handleCsvImport}
              onAddDepartment={handleAddDepartment}
              onRenameDepartment={handleRenameDepartment}
              onDeleteDepartment={handleDeleteDepartment}
              departmentActionLoading={departmentActionLoading}
              onUpdateDepartment={handleUpdateEmployeeDepartment}
              updatingEmployeeId={updatingDepartmentEmployeeId}
              currentEmployeeId={currentEmployeeId}
              swapRequests={swapRequests}
              shifts={shifts}
              onDecision={handleSwapDecision}
            />
          ) : (
            <WeeklyCalendar
              employees={visibleEmployees}
              shifts={shifts}
              weekStart={weekStart}
              role={role}
              currentEmployeeId={currentEmployeeId}
              swapRequests={swapRequests}
              onAddShift={handleAddShift}
              onShiftClick={handleShiftClick}
              onRequestSwap={handleRequestSwap}
              onPrevWeek={() => setWeekStart(toIsoDate(subWeeks(weekDate, 1)))}
              onNextWeek={() => setWeekStart(toIsoDate(addWeeks(weekDate, 1)))}
              disableWeekControls={dataLoading}
              exportControl={
                <ExportButtons
                  shifts={shifts}
                  employees={employees}
                  role={role}
                  currentEmployeeId={currentEmployeeId}
                  weekStart={weekStart}
                  compact
                  compactLabel="Export"
                />
              }
            />
          )}

          {!isManagerPage ? (
            role === 'employee' ? (
              <SwapRequestsPanel
                title="Your Schedule Requests"
                role={role}
                currentEmployeeId={currentEmployeeId}
                swapRequests={swapRequests}
                shifts={shifts}
                employees={employees}
                onDecision={handleSwapDecision}
                onCancel={handleCancelSwapRequest}
              />
            ) : null
          ) : null}

          {!isManagerPage ? (
            <MessageBoard
              posts={postsWithAuthors}
              currentUser={
                currentUser ?? {
                  id: currentEmployeeId,
                  name: session?.user?.email ?? 'Unknown User'
                }
              }
              role={role}
              onAddPost={handleAddBoardPost}
            />
          ) : null}

          {editingShift ? (
            <ShiftEditorModal
              shift={editingShift}
              employees={employees}
              onSave={handleSaveShift}
              onDelete={handleDeleteShift}
              onClose={() => setEditingShift(null)}
            />
          ) : null}

          {swapTradeTargetShift ? (
            <SwapTradeRequestModal
              targetShift={swapTradeTargetShift}
              targetEmployeeName={swapTargetEmployee?.name ?? 'Teammate'}
              offeredShifts={tradeableShifts}
              onSubmit={handleSubmitSwapTrade}
              onClose={() => setSwapTradeTargetShift(null)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
