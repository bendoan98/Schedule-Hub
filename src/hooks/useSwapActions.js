import useSwapDecisionActions from './useSwapDecisionActions';
import useSwapModalState from './useSwapModalState';
import useSwapRequestCreation from './useSwapRequestCreation';

export default function useSwapActions({ env, context, setters, loadSupabaseData }) {
  const modalState = useSwapModalState({
    role: context.role,
    shifts: context.shifts,
    weekStart: context.weekStart,
    employees: context.employees,
    currentEmployeeId: context.currentEmployeeId,
    currentUser: context.currentUser,
    setAppMessage: setters.setAppMessage
  });

  const requestCreationActions = useSwapRequestCreation({
    env,
    context,
    modalState,
    setters,
    loadSupabaseData
  });

  const decisionActions = useSwapDecisionActions({
    env,
    context,
    setters,
    loadSupabaseData
  });

  return {
    swapTradeTargetShift: modalState.swapTradeTargetShift,
    swapOfferShift: modalState.swapOfferShift,
    ownShiftActionShift: modalState.ownShiftActionShift,
    timeOffShift: modalState.timeOffShift,
    tradeableShifts: modalState.tradeableShifts,
    offerTargetEmployees: modalState.offerTargetEmployees,
    handleEmployeeShiftClick: modalState.handleEmployeeShiftClick,
    handleOpenOwnShiftOffer: modalState.handleOpenOwnShiftOffer,
    handleOpenOwnShiftTimeOff: modalState.handleOpenOwnShiftTimeOff,
    handleSubmitSwapTrade: requestCreationActions.handleSubmitSwapTrade,
    handleSubmitSwapOffer: requestCreationActions.handleSubmitSwapOffer,
    handleSubmitTimeOffRequest: requestCreationActions.handleSubmitTimeOffRequest,
    handleSwapDecision: decisionActions.handleSwapDecision,
    handleCancelSwapRequest: decisionActions.handleCancelSwapRequest,
    closeOwnShiftAction: modalState.closeOwnShiftAction,
    closeSwapTrade: modalState.closeSwapTrade,
    closeSwapOffer: modalState.closeSwapOffer,
    closeTimeOff: modalState.closeTimeOff
  };
}
