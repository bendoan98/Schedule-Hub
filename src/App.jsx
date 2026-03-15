import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { hasSupabaseCredentials, supabase } from './lib/supabaseClient';
import {
  createSwapRequest,
  fetchAppData,
  insertCsvShifts,
  insertMessagePost,
  markAllNotificationsRead,
  removeShift,
  setSwapRequestStatus,
  upsertShift
} from './lib/supabaseData';
import { getMonday, toIsoDate } from './utils/date';
import { newId } from './utils/id';

const ROLES = ['manager', 'employee'];

export default function App() {
  const isSupabaseMode = Boolean(hasSupabaseCredentials && supabase);

  const [employees, setEmployees] = useState(isSupabaseMode ? [] : mockEmployees);
  const [shifts, setShifts] = useState(isSupabaseMode ? [] : mockShifts);
  const [swapRequests, setSwapRequests] = useState(isSupabaseMode ? [] : mockSwapRequests);
  const [notifications, setNotifications] = useState(isSupabaseMode ? [] : mockNotifications);
  const [boardPosts, setBoardPosts] = useState(isSupabaseMode ? [] : mockBoardPosts);
  const [weekStart, setWeekStart] = useState(toIsoDate(getMonday()));
  const [role, setRole] = useState(isSupabaseMode ? 'employee' : 'manager');
  const [currentEmployeeId, setCurrentEmployeeId] = useState(isSupabaseMode ? '' : 'emp-alex');
  const [editingShift, setEditingShift] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseMode);
  const [dataLoading, setDataLoading] = useState(false);
  const [authMode, setAuthMode] = useState('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [authError, setAuthError] = useState('');
  const [appMessage, setAppMessage] = useState('');

  const currentUser = useMemo(() => {
    return employees.find((employee) => employee.id === currentEmployeeId) ?? null;
  }, [employees, currentEmployeeId]);

  const visibleEmployees = useMemo(() => {
    if (role === 'manager') {
      return employees;
    }

    return employees.filter((employee) => employee.id === currentEmployeeId);
  }, [employees, role, currentEmployeeId]);

  const postsWithAuthors = useMemo(() => {
    const employeesById = new Map(employees.map((employee) => [employee.id, employee.name]));

    return boardPosts.map((post) => ({
      ...post,
      authorName: employeesById.get(post.authorId) ?? 'Unknown Employee'
    }));
  }, [boardPosts, employees]);

  const weekDate = useMemo(() => new Date(`${weekStart}T12:00:00`), [weekStart]);

  const loadSupabaseData = useCallback(async () => {
    if (!isSupabaseMode || !supabase || !session) {
      return;
    }

    setDataLoading(true);

    try {
      const snapshot = await fetchAppData(supabase);

      setEmployees(snapshot.employees);
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employees' },
        () => loadSupabaseData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        () => loadSupabaseData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'swap_requests' },
        () => loadSupabaseData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => loadSupabaseData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_posts' },
        () => loadSupabaseData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSupabaseMode, session, loadSupabaseData]);

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

  function handleRoleChange(nextRole) {
    if (isSupabaseMode) {
      return;
    }

    setRole(nextRole);

    const matchingEmployee = employees.find((employee) => employee.role === nextRole);

    if (matchingEmployee) {
      setCurrentEmployeeId(matchingEmployee.id);
    }
  }

  async function handleCsvImport(result) {
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
        return 'No shifts imported. CSV employee_name values must match existing employees in Supabase.';
      }

      const insertedCount = await insertCsvShifts(supabase, validShifts, weekStart);
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
    }
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

  async function handleRequestSwap(shift) {
    const reason = window.prompt('Optional reason for the swap request:', '');

    if (reason === null) {
      return;
    }

    if (isSupabaseMode && session && supabase) {
      try {
        if (!currentEmployeeId) {
          throw new Error('No employee profile selected for this user.');
        }

        await createSwapRequest(supabase, {
          shiftId: shift.id,
          requestedBy: currentEmployeeId,
          reason: reason.trim()
        });

        await loadSupabaseData();
        setAppMessage('Swap request created.');
      } catch (error) {
        setAppMessage(error.message);
      }

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

    addLocalNotification('Swap Request Created', `${currentUser?.name ?? 'Employee'} submitted a swap request.`);
  }

  async function handleSwapDecision(requestId, status) {
    if (isSupabaseMode && session && supabase) {
      try {
        await setSwapRequestStatus(supabase, requestId, status);
        await loadSupabaseData();
        setAppMessage(`Swap request ${status}.`);
      } catch (error) {
        setAppMessage(error.message);
      }

      return;
    }

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

    addLocalNotification('Swap Request Updated', `A swap request was ${status}.`);
  }

  async function handleMarkAllRead() {
    if (isSupabaseMode && session && supabase) {
      try {
        await markAllNotificationsRead(supabase, { role, currentEmployeeId });
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
        await insertMessagePost(supabase, newPost);
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
    const normalizedDepartment = department.trim() || 'UNASSIGNED';

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
          name: trimmedName,
          department: normalizedDepartment
        }
      }
    });

    if (error) {
      setAuthError(error.message);
      return;
    }

    setPassword('');
    setFullName('');
    setDepartment('');

    if (data.session) {
      setAppMessage('Account created and signed in.');
      return;
    }

    setAuthMode('sign_in');
    setAppMessage('Sign-up successful. Check your email to confirm your account, then sign in.');
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

  const showAuthPanel = isSupabaseMode && !session;
  const showCoreApp = !showAuthPanel;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Schedule Hub</h1>
          <p>Employee scheduling template with Supabase-ready architecture.</p>

          {!isSupabaseMode ? (
            <p className="status-banner">Running with mock data. Add `.env.local` values to connect Supabase.</p>
          ) : null}

          {isSupabaseMode && session ? (
            <p className="status-banner">Connected to Supabase as {session.user.email}</p>
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

          <div className="week-controls">
            <button
              type="button"
              onClick={() => setWeekStart(toIsoDate(subWeeks(weekDate, 1)))}
              aria-label="Previous week"
              disabled={showAuthPanel || authLoading}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(toIsoDate(addWeeks(weekDate, 1)))}
              aria-label="Next week"
              disabled={showAuthPanel || authLoading}
            >
              Next
            </button>
          </div>

          {showCoreApp ? (
            <NotificationBell notifications={notifications} onMarkAllRead={handleMarkAllRead} />
          ) : null}
        </div>
      </header>

      {authLoading ? <section className="panel">Checking Supabase session...</section> : null}

      {showAuthPanel && !authLoading ? (
        <section className="panel auth-panel">
          <h3>{authMode === 'sign_up' ? 'Create Account' : 'Sign In to Supabase'}</h3>
          <p>
            {authMode === 'sign_up'
              ? 'New accounts are created as employee users.'
              : 'Sign in with your email and password.'}
          </p>

          <div className="auth-mode-toggle" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={authMode === 'sign_in' ? 'active' : ''}
              onClick={() => {
                setAuthMode('sign_in');
                setAuthError('');
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={authMode === 'sign_up' ? 'active' : ''}
              onClick={() => {
                setAuthMode('sign_up');
                setAuthError('');
              }}
            >
              Sign Up
            </button>
          </div>

          <form className="auth-form" onSubmit={authMode === 'sign_up' ? handleSignUp : handleSignIn}>
            {authMode === 'sign_up' ? (
              <label>
                Full Name
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  autoComplete="name"
                />
              </label>
            ) : null}

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            {authMode === 'sign_up' ? (
              <label>
                Department (optional)
                <input
                  type="text"
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  placeholder="UNASSIGNED"
                  autoComplete="organization"
                />
              </label>
            ) : null}

            <button type="submit" className="primary">
              {authMode === 'sign_up' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {authError ? <p className="status-banner">{authError}</p> : null}
        </section>
      ) : null}

      {showCoreApp ? (
        <>
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

          {editingShift ? (
            <ShiftEditorModal
              shift={editingShift}
              employees={employees}
              onSave={handleSaveShift}
              onDelete={handleDeleteShift}
              onClose={() => setEditingShift(null)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
