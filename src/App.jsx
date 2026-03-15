import { useMemo, useState } from 'react';
import { addWeeks, subWeeks } from 'date-fns';
import DashboardStats from './features/dashboard/DashboardStats';
import CsvImportForm from './features/schedule/CsvImportForm';
import WeeklyCalendar from './features/schedule/WeeklyCalendar';
import ShiftEditorModal from './features/shifts/ShiftEditorModal';
import SwapRequestsPanel from './features/swaps/SwapRequestsPanel';
import NotificationBell from './features/notifications/NotificationBell';
import MessageBoard from './features/board/MessageBoard';
import ExportButtons from './features/export/ExportButtons';
import {
  mockBoardPosts,
  mockEmployees,
  mockNotifications,
  mockShifts,
  mockSwapRequests
} from './data/mockData';
import { hasSupabaseCredentials } from './lib/supabaseClient';
import { getMonday, toIsoDate } from './utils/date';
import { newId } from './utils/id';

const ROLES = ['manager', 'employee'];

export default function App() {
  const [employees, setEmployees] = useState(mockEmployees);
  const [shifts, setShifts] = useState(mockShifts);
  const [swapRequests, setSwapRequests] = useState(mockSwapRequests);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [boardPosts, setBoardPosts] = useState(mockBoardPosts);
  const [weekStart, setWeekStart] = useState(toIsoDate(getMonday()));
  const [role, setRole] = useState('manager');
  const [currentEmployeeId, setCurrentEmployeeId] = useState('emp-alex');
  const [editingShift, setEditingShift] = useState(null);

  const currentUser = useMemo(() => {
    return employees.find((employee) => employee.id === currentEmployeeId) ?? employees[0];
  }, [employees, currentEmployeeId]);

  const visibleEmployees = useMemo(() => {
    if (role === 'manager') {
      return employees;
    }

    return employees.filter((employee) => employee.id === currentEmployeeId);
  }, [employees, role, currentEmployeeId]);

  const weekDate = useMemo(() => new Date(`${weekStart}T12:00:00`), [weekStart]);

  function addNotification(title, body) {
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

  function handleRoleChange(nextRole) {
    setRole(nextRole);

    const matchingEmployee = employees.find((employee) => employee.role === nextRole);

    if (matchingEmployee) {
      setCurrentEmployeeId(matchingEmployee.id);
    }
  }

  function handleCsvImport(result) {
    setEmployees((previous) => [...previous, ...result.importedEmployees]);
    setShifts((previous) => [...previous, ...result.importedShifts]);
    addNotification('Schedule Imported', `Added ${result.importedShifts.length} shifts from CSV.`);
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
    }
  }

  function handleSaveShift(updatedShift) {
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
    addNotification('Shift Saved', 'A shift was added or updated.');
  }

  function handleDeleteShift(shiftId) {
    setShifts((previous) => previous.filter((shift) => shift.id !== shiftId));
    setEditingShift(null);
    addNotification('Shift Deleted', 'A shift was removed from the schedule.');
  }

  function handleRequestSwap(shift) {
    const reason = window.prompt('Optional reason for the swap request:', '');

    if (reason === null) {
      return;
    }

    setSwapRequests((previous) => [
      {
        id: newId(),
        shiftId: shift.id,
        requestedBy: currentEmployeeId,
        reason: reason.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      ...previous
    ]);

    addNotification('Swap Request Created', `${currentUser.name} submitted a swap request.`);
  }

  function handleSwapDecision(requestId, status) {
    setSwapRequests((previous) =>
      previous.map((request) => {
        if (request.id !== requestId) {
          return request;
        }

        return {
          ...request,
          status
        };
      })
    );

    addNotification('Swap Request Updated', `A swap request was ${status}.`);
  }

  function handleMarkAllRead() {
    setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true })));
  }

  function handleAddBoardPost(newPost) {
    setBoardPosts((previous) => [
      {
        id: newId(),
        ...newPost,
        createdAt: new Date().toISOString()
      },
      ...previous
    ]);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Schedule Hub</h1>
          <p>Employee scheduling template with Supabase-ready architecture.</p>
          {!hasSupabaseCredentials ? (
            <p className="status-banner">
              Running with mock data. Add `.env` values to connect Supabase.
            </p>
          ) : null}
        </div>

        <div className="header-actions">
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

          <div className="week-controls">
            <button
              type="button"
              onClick={() => setWeekStart(toIsoDate(subWeeks(weekDate, 1)))}
              aria-label="Previous week"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(toIsoDate(addWeeks(weekDate, 1)))}
              aria-label="Next week"
            >
              Next
            </button>
          </div>

          <NotificationBell notifications={notifications} onMarkAllRead={handleMarkAllRead} />
        </div>
      </header>

      <DashboardStats
        shifts={shifts}
        swapRequests={swapRequests}
        employees={employees}
        weekStart={weekStart}
        role={role}
        currentEmployeeId={currentEmployeeId}
      />

      {role === 'manager' ? (
        <CsvImportForm weekStart={weekStart} employees={employees} onImport={handleCsvImport} />
      ) : null}

      <main className="main-layout">
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
        />

        <aside className="side-column">
          <SwapRequestsPanel
            role={role}
            currentEmployeeId={currentEmployeeId}
            swapRequests={swapRequests}
            shifts={shifts}
            employees={employees}
            onDecision={handleSwapDecision}
          />

          <ExportButtons
            shifts={shifts}
            employees={employees}
            role={role}
            currentEmployeeId={currentEmployeeId}
            weekStart={weekStart}
          />
        </aside>
      </main>

      <MessageBoard posts={boardPosts} currentUser={currentUser} role={role} onAddPost={handleAddBoardPost} />

      {editingShift ? (
        <ShiftEditorModal
          shift={editingShift}
          employees={employees}
          onSave={handleSaveShift}
          onDelete={handleDeleteShift}
          onClose={() => setEditingShift(null)}
        />
      ) : null}
    </div>
  );
}
