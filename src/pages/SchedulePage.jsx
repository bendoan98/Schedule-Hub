import DashboardStats from '../features/dashboard/DashboardStats';
import WeeklyCalendar from '../features/schedule/WeeklyCalendar';
import ShiftEditorModal from '../features/shifts/ShiftEditorModal';
import ExportButtons from '../features/export/ExportButtons';
import SwapRequestsPanel from '../features/swaps/SwapRequestsPanel';
import SwapTradeRequestModal from '../features/swaps/SwapTradeRequestModal';
import SwapOfferShiftModal from '../features/swaps/SwapOfferShiftModal';
import OwnShiftActionModal from '../features/swaps/OwnShiftActionModal';
import TimeOffRequestModal from '../features/swaps/TimeOffRequestModal';
import ChatBubbleBoard from '../features/board/ChatBubbleBoard';

export default function SchedulePage({ dashboard, calendar, requests, chat, modals }) {
  return (
    <>
      <DashboardStats
        shifts={dashboard.shifts}
        swapRequests={dashboard.swapRequests}
        employees={dashboard.employees}
        weekStart={dashboard.weekStart}
        role={dashboard.role}
        currentEmployeeId={dashboard.currentEmployeeId}
      />

      <WeeklyCalendar
        employees={calendar.visibleEmployees}
        shifts={calendar.shifts}
        weekStart={calendar.weekStart}
        role={calendar.role}
        currentEmployeeId={calendar.currentEmployeeId}
        swapRequests={calendar.swapRequests}
        onAddShift={calendar.onAddShift}
        onShiftClick={calendar.onShiftClick}
        onPrevWeek={calendar.onPrevWeek}
        onNextWeek={calendar.onNextWeek}
        disableWeekControls={calendar.disableWeekControls}
        exportControl={
          <ExportButtons
            shifts={calendar.export.shifts}
            employees={calendar.export.employees}
            role={calendar.export.role}
            currentEmployeeId={calendar.export.currentEmployeeId}
            weekStart={calendar.export.weekStart}
            compact
            compactLabel="Export"
          />
        }
      />

      {requests.role === 'employee' ? (
        <SwapRequestsPanel
          title="Your Schedule Requests"
          role={requests.role}
          currentEmployeeId={requests.currentEmployeeId}
          swapRequests={requests.swapRequests}
          shifts={requests.shifts}
          employees={requests.employees}
          onDecision={requests.onDecision}
          onCancel={requests.onCancel}
        />
      ) : null}

      <ChatBubbleBoard
        posts={chat.posts}
        currentUser={chat.currentUser}
        role={chat.role}
        onAddPost={chat.onAddPost}
      />

      {modals.editShift.shift ? (
        <ShiftEditorModal
          shift={modals.editShift.shift}
          employees={modals.editShift.employees}
          onSave={modals.editShift.onSave}
          onDelete={modals.editShift.onDelete}
          onClose={modals.editShift.onClose}
        />
      ) : null}

      {modals.ownShiftAction.shift ? (
        <OwnShiftActionModal
          shift={modals.ownShiftAction.shift}
          onOfferShift={modals.ownShiftAction.onOfferShift}
          onRequestTimeOff={modals.ownShiftAction.onRequestTimeOff}
          onClose={modals.ownShiftAction.onClose}
        />
      ) : null}

      {modals.swapTrade.targetShift ? (
        <SwapTradeRequestModal
          targetShift={modals.swapTrade.targetShift}
          targetEmployeeName={
            modals.swapTrade.employees.find(
              (employee) => employee.id === modals.swapTrade.targetShift.employeeId
            )?.name ?? 'teammate'
          }
          offeredShifts={modals.swapTrade.offeredShifts}
          onSubmit={modals.swapTrade.onSubmit}
          onClose={modals.swapTrade.onClose}
        />
      ) : null}

      {modals.swapOffer.shift ? (
        <SwapOfferShiftModal
          offeredShift={modals.swapOffer.shift}
          targetEmployees={modals.swapOffer.targetEmployees}
          onSubmit={modals.swapOffer.onSubmit}
          onClose={modals.swapOffer.onClose}
        />
      ) : null}

      {modals.timeOff.shift ? (
        <TimeOffRequestModal shift={modals.timeOff.shift} onSubmit={modals.timeOff.onSubmit} onClose={modals.timeOff.onClose} />
      ) : null}
    </>
  );
}
