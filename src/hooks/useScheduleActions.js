import { insertMessagePost, markAllNotificationsRead } from '../lib/supabaseData';
import { newId } from '../utils/id';
import useDepartmentActions from './useDepartmentActions';
import useShiftActions from './useShiftActions';
import useSwapActions from './useSwapActions';

export default function useScheduleActions({ env, context, setters, loadSupabaseData }) {
  const shiftActions = useShiftActions({
    env,
    context: {
      team: context.team,
      employees: context.employees,
      weekStart: context.weekStart,
      currentEmployeeId: context.currentEmployeeId
    },
    setters: {
      setEmployees: setters.setEmployees,
      setShifts: setters.setShifts,
      setNotifications: setters.setNotifications,
      setAppMessage: setters.setAppMessage
    },
    loadSupabaseData
  });

  const swapActions = useSwapActions({
    env,
    context: {
      team: context.team,
      employees: context.employees,
      shifts: context.shifts,
      swapRequests: context.swapRequests,
      weekStart: context.weekStart,
      role: context.role,
      currentEmployeeId: context.currentEmployeeId,
      currentUser: context.currentUser
    },
    setters: {
      setShifts: setters.setShifts,
      setSwapRequests: setters.setSwapRequests,
      setNotifications: setters.setNotifications,
      setAppMessage: setters.setAppMessage
    },
    loadSupabaseData
  });

  const departmentActions = useDepartmentActions({
    env,
    context: {
      team: context.team,
      employees: context.employees,
      departments: context.departments,
      currentEmployeeId: context.currentEmployeeId
    },
    setters: {
      setEmployees: setters.setEmployees,
      setTeamDepartments: setters.setTeamDepartments,
      setNotifications: setters.setNotifications,
      setAppMessage: setters.setAppMessage
    },
    loadSupabaseData
  });

  function handleShiftClick(shift) {
    if (context.role === 'manager') {
      shiftActions.openEditShift(shift);
      return;
    }

    swapActions.handleEmployeeShiftClick(shift);
  }

  async function handleMarkAllRead() {
    if (env.isSupabaseMode && env.session && env.supabase) {
      try {
        await markAllNotificationsRead(env.supabase);
        await loadSupabaseData();
      } catch (error) {
        setters.setAppMessage(error.message);
      }

      return;
    }

    setters.setNotifications((previous) =>
      previous.map((notification) => ({ ...notification, read: true }))
    );
  }

  async function handleAddBoardPost(newPost) {
    if (env.isSupabaseMode && env.session && env.supabase) {
      try {
        if (!context.team?.id) {
          throw new Error('Join or create a team before posting.');
        }

        await insertMessagePost(env.supabase, {
          ...newPost,
          teamId: context.team.id
        });

        await loadSupabaseData();
      } catch (error) {
        setters.setAppMessage(error.message);
      }

      return;
    }

    setters.setBoardPosts((previous) => [
      {
        id: newId(),
        ...newPost,
        createdAt: new Date().toISOString()
      },
      ...previous
    ]);
  }

  return {
    editingShift: shiftActions.editingShift,
    swapTradeTargetShift: swapActions.swapTradeTargetShift,
    swapOfferShift: swapActions.swapOfferShift,
    ownShiftActionShift: swapActions.ownShiftActionShift,
    timeOffShift: swapActions.timeOffShift,
    tradeableShifts: swapActions.tradeableShifts,
    offerTargetEmployees: swapActions.offerTargetEmployees,
    updatingDepartmentEmployeeId: departmentActions.updatingDepartmentEmployeeId,
    departmentActionLoading: departmentActions.departmentActionLoading,
    handleCsvImport: shiftActions.handleCsvImport,
    handleAddShift: shiftActions.handleAddShift,
    handleShiftClick,
    handleSaveShift: shiftActions.handleSaveShift,
    handleDeleteShift: shiftActions.handleDeleteShift,
    handleOpenOwnShiftOffer: swapActions.handleOpenOwnShiftOffer,
    handleOpenOwnShiftTimeOff: swapActions.handleOpenOwnShiftTimeOff,
    handleSubmitSwapTrade: swapActions.handleSubmitSwapTrade,
    handleSubmitSwapOffer: swapActions.handleSubmitSwapOffer,
    handleSubmitTimeOffRequest: swapActions.handleSubmitTimeOffRequest,
    handleSwapDecision: swapActions.handleSwapDecision,
    handleCancelSwapRequest: swapActions.handleCancelSwapRequest,
    handleMarkAllRead,
    handleAddBoardPost,
    handleUpdateEmployeeDepartment: departmentActions.handleUpdateEmployeeDepartment,
    handleAddDepartment: departmentActions.handleAddDepartment,
    handleRenameDepartment: departmentActions.handleRenameDepartment,
    handleDeleteDepartment: departmentActions.handleDeleteDepartment,
    closeEditShift: shiftActions.closeEditShift,
    closeOwnShiftAction: swapActions.closeOwnShiftAction,
    closeSwapTrade: swapActions.closeSwapTrade,
    closeSwapOffer: swapActions.closeSwapOffer,
    closeTimeOff: swapActions.closeTimeOff
  };
}
