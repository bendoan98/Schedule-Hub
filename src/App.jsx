import { useCallback, useEffect, useMemo, useState } from 'react';
import { addWeeks, subWeeks } from 'date-fns';
import NotificationBell from './features/notifications/NotificationBell';
import SchedulePage from './pages/SchedulePage';
import ManagerPage from './features/manager/ManagerPage';
import SegmentedToggle from './components/ui/SegmentedToggle';
import StatusBanner from './components/ui/StatusBanner';
import AuthPanel from './features/auth/AuthPanel';
import TeamSetupPanel from './features/auth/TeamSetupPanel';
import {
  mockBoardPosts,
  mockEmployees,
  mockNotifications,
  mockShifts,
  mockSwapRequests
} from './data/mockData';
import { hasSupabaseCredentials, supabase } from './lib/supabaseClient';
import { createTeamForCurrentUser, fetchAppData, joinTeamWithInviteCode } from './lib/supabaseData';
import { buildDepartmentList, normalizeDepartmentName } from './utils/department';
import { getMonday, toIsoDate } from './utils/date';
import useScheduleActions from './hooks/useScheduleActions';

const ROLES = ['manager', 'employee'];
const ROUTE_SCHEDULE = '/schedule';
const ROUTE_MANAGER = '/manager';
const PAGE_ROUTES = [
  { path: ROUTE_SCHEDULE, label: 'Schedule' },
  { path: ROUTE_MANAGER, label: 'Manager Page' }
];
const ROLE_TOGGLE_OPTIONS = ROLES.map((option) => ({ value: option, label: option }));
const PAGE_TOGGLE_OPTIONS = PAGE_ROUTES.map((route) => ({ value: route.path, label: route.label }));

function normalizePathname(pathname) {
  return pathname === ROUTE_MANAGER ? ROUTE_MANAGER : ROUTE_SCHEDULE;
}

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
  const [currentPath, setCurrentPath] = useState(() => normalizePathname(window.location.pathname));

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
      authorName:
        post.authorName ||
        employeesById.get(post.authorId) ||
        (post.authorId === team?.createdBy ? 'Manager' : 'Unknown Employee')
    }));
  }, [boardPosts, employees, team?.createdBy]);

  const weekDate = useMemo(() => new Date(`${weekStart}T12:00:00`), [weekStart]);

  const navigateTo = useCallback((nextPath, options = {}) => {
    const { replace = false } = options;
    const normalizedPath = normalizePathname(nextPath);

    if (window.location.pathname !== normalizedPath) {
      const navigationMethod = replace ? window.history.replaceState : window.history.pushState;
      navigationMethod.call(window.history, null, '', normalizedPath);
    }

    setCurrentPath(normalizedPath);
  }, []);

  useEffect(() => {
    const normalizedPath = normalizePathname(window.location.pathname);

    if (window.location.pathname !== normalizedPath) {
      window.history.replaceState(null, '', normalizedPath);
    }

    setCurrentPath(normalizedPath);

    function handlePopState() {
      setCurrentPath(normalizePathname(window.location.pathname));
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (role !== 'manager' && currentPath === ROUTE_MANAGER) {
      navigateTo(ROUTE_SCHEDULE, { replace: true });
    }
  }, [currentPath, navigateTo, role]);

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

  const {
    editingShift,
    swapTradeTargetShift,
    swapOfferShift,
    ownShiftActionShift,
    timeOffShift,
    tradeableShifts,
    offerTargetEmployees,
    updatingDepartmentEmployeeId,
    departmentActionLoading,
    handleCsvImport,
    handleAddShift,
    handleShiftClick,
    handleSaveShift,
    handleDeleteShift,
    handleOpenOwnShiftOffer,
    handleOpenOwnShiftTimeOff,
    handleSubmitSwapTrade,
    handleSubmitSwapOffer,
    handleSubmitTimeOffRequest,
    handleSwapDecision,
    handleCancelSwapRequest,
    handleMarkAllRead,
    handleAddBoardPost,
    handleUpdateEmployeeDepartment,
    handleAddDepartment,
    handleRenameDepartment,
    handleDeleteDepartment,
    closeEditShift,
    closeOwnShiftAction,
    closeSwapTrade,
    closeSwapOffer,
    closeTimeOff
  } = useScheduleActions({
    env: {
      isSupabaseMode,
      session,
      supabase
    },
    context: {
      team,
      employees,
      departments,
      shifts,
      swapRequests,
      weekStart,
      role,
      currentEmployeeId,
      currentUser
    },
    setters: {
      setEmployees,
      setTeamDepartments,
      setShifts,
      setSwapRequests,
      setNotifications,
      setBoardPosts,
      setAppMessage
    },
    loadSupabaseData
  });

  function handleRoleChange(nextRole) {
    if (isSupabaseMode) {
      return;
    }

    setRole(nextRole);
    navigateTo(ROUTE_SCHEDULE, { replace: true });

    const matchingEmployee = employees.find((employee) => employee.role === nextRole);

    if (matchingEmployee) {
      setCurrentEmployeeId(matchingEmployee.id);
    }
  }

  function handleAuthModeChange(nextMode) {
    setAuthMode(nextMode);
    setAuthError('');
    setShowPassword(false);
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
  const isManagerRoute = currentPath === ROUTE_MANAGER;
  const isManagerPage = showCoreApp && canViewManagerPage && isManagerRoute;
  const currentBoardUser =
    currentUser ?? {
      id: currentEmployeeId,
      name: session?.user?.email ?? 'Unknown User'
    };
  const handlePrevWeek = useCallback(() => {
    setWeekStart(toIsoDate(subWeeks(weekDate, 1)));
  }, [weekDate]);
  const handleNextWeek = useCallback(() => {
    setWeekStart(toIsoDate(addWeeks(weekDate, 1)));
  }, [weekDate]);
  const schedulePageProps = useMemo(
    () => ({
      dashboard: {
        shifts,
        swapRequests,
        employees,
        weekStart,
        role,
        currentEmployeeId
      },
      calendar: {
        visibleEmployees,
        shifts,
        weekStart,
        role,
        currentEmployeeId,
        swapRequests,
        onAddShift: handleAddShift,
        onShiftClick: handleShiftClick,
        onPrevWeek: handlePrevWeek,
        onNextWeek: handleNextWeek,
        disableWeekControls: dataLoading,
        export: {
          shifts,
          employees,
          role,
          currentEmployeeId,
          weekStart
        }
      },
      requests: {
        role,
        currentEmployeeId,
        swapRequests,
        shifts,
        employees,
        onDecision: handleSwapDecision,
        onCancel: handleCancelSwapRequest
      },
      chat: {
        posts: postsWithAuthors,
        currentUser: currentBoardUser,
        role,
        onAddPost: handleAddBoardPost
      },
      modals: {
        editShift: {
          shift: editingShift,
          employees,
          onSave: handleSaveShift,
          onDelete: handleDeleteShift,
          onClose: closeEditShift
        },
        ownShiftAction: {
          shift: ownShiftActionShift,
          onOfferShift: handleOpenOwnShiftOffer,
          onRequestTimeOff: handleOpenOwnShiftTimeOff,
          onClose: closeOwnShiftAction
        },
        swapTrade: {
          targetShift: swapTradeTargetShift,
          employees,
          offeredShifts: tradeableShifts,
          onSubmit: handleSubmitSwapTrade,
          onClose: closeSwapTrade
        },
        swapOffer: {
          shift: swapOfferShift,
          targetEmployees: offerTargetEmployees,
          onSubmit: handleSubmitSwapOffer,
          onClose: closeSwapOffer
        },
        timeOff: {
          shift: timeOffShift,
          onSubmit: handleSubmitTimeOffRequest,
          onClose: closeTimeOff
        }
      }
    }),
    [
      shifts,
      swapRequests,
      employees,
      weekStart,
      role,
      currentEmployeeId,
      visibleEmployees,
      handleAddShift,
      handleShiftClick,
      handlePrevWeek,
      handleNextWeek,
      dataLoading,
      handleSwapDecision,
      handleCancelSwapRequest,
      postsWithAuthors,
      currentBoardUser,
      handleAddBoardPost,
      editingShift,
      handleSaveShift,
      handleDeleteShift,
      closeEditShift,
      ownShiftActionShift,
      handleOpenOwnShiftOffer,
      handleOpenOwnShiftTimeOff,
      closeOwnShiftAction,
      swapTradeTargetShift,
      tradeableShifts,
      handleSubmitSwapTrade,
      closeSwapTrade,
      swapOfferShift,
      offerTargetEmployees,
      handleSubmitSwapOffer,
      closeSwapOffer,
      timeOffShift,
      handleSubmitTimeOffRequest,
      closeTimeOff
    ]
  );
  const managerPageProps = useMemo(
    () => ({
      importSection: {
        weekStart,
        employees,
        onImport: handleCsvImport
      },
      requestsSection: {
        currentEmployeeId,
        swapRequests,
        shifts,
        employees,
        onDecision: handleSwapDecision
      },
      departmentsSection: {
        departments,
        employees,
        onAddDepartment: handleAddDepartment,
        onRenameDepartment: handleRenameDepartment,
        onDeleteDepartment: handleDeleteDepartment,
        isSaving: departmentActionLoading
      },
      rosterSection: {
        employees,
        departments,
        onUpdateDepartment: handleUpdateEmployeeDepartment,
        updatingEmployeeId: updatingDepartmentEmployeeId,
        managerEmployeeId: currentEmployeeId
      }
    }),
    [
      weekStart,
      employees,
      handleCsvImport,
      currentEmployeeId,
      swapRequests,
      shifts,
      handleSwapDecision,
      departments,
      handleAddDepartment,
      handleRenameDepartment,
      handleDeleteDepartment,
      departmentActionLoading,
      handleUpdateEmployeeDepartment,
      updatingDepartmentEmployeeId
    ]
  );

  return (
    <div className={`app-shell ${showAuthPanel && !authLoading ? 'auth-view' : ''}`}>
      <header className="app-header">
        <div>
          <h1>Schedule Hub</h1>
          <p>Employee scheduling template with Supabase-ready architecture.</p>

          {!isSupabaseMode ? (
            <StatusBanner>Running with mock data. Add `.env.local` values to connect Supabase.</StatusBanner>
          ) : null}

          {isSupabaseMode && session ? (
            <StatusBanner>
              Connected as {session.user.email}
              {team?.name ? ` | Team: ${team.name}` : ''}
              {team?.inviteCode && role === 'manager' ? ` | Invite Code: ${team.inviteCode}` : ''}
            </StatusBanner>
          ) : null}

          {appMessage ? <StatusBanner>{appMessage}</StatusBanner> : null}
          {dataLoading ? <StatusBanner>Syncing latest data...</StatusBanner> : null}
        </div>

        <div className="header-actions">
          {!isSupabaseMode ? (
            <>
              <SegmentedToggle
                className="role-toggle"
                ariaLabel="Role toggle"
                options={ROLE_TOGGLE_OPTIONS}
                value={role}
                onChange={handleRoleChange}
              />

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
              <SegmentedToggle
                className="role-toggle"
                ariaLabel="Page toggle"
                options={PAGE_TOGGLE_OPTIONS}
                value={currentPath}
                onChange={(path) => navigateTo(path)}
              />
            ) : null
          ) : null}

          {showCoreApp ? (
            <NotificationBell notifications={notifications} onMarkAllRead={handleMarkAllRead} />
          ) : null}
        </div>
      </header>

      {authLoading ? <section className="panel">Checking Supabase session...</section> : null}

      {showAuthPanel && !authLoading ? (
        <AuthPanel
          authMode={authMode}
          onAuthModeChange={handleAuthModeChange}
          email={email}
          onEmailChange={setEmail}
          password={password}
          onPasswordChange={setPassword}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((value) => !value)}
          oauthLoadingProvider={oauthLoadingProvider}
          fullName={fullName}
          onFullNameChange={setFullName}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onForgotPassword={handleForgotPassword}
          onOAuthSignIn={handleOAuthSignIn}
          authError={authError}
        />
      ) : null}

      {missingProfile ? (
        <section className="panel auth-panel">
          <h3>Profile Not Found</h3>
          <p>Your auth user does not have an `employees` row yet. Re-run `supabase/schema.sql` and try signing in again.</p>
        </section>
      ) : null}

      {needsTeamSetup ? (
        <TeamSetupPanel
          teamSetupMode={teamSetupMode}
          onTeamSetupModeChange={setTeamSetupMode}
          teamNameInput={teamNameInput}
          onTeamNameChange={setTeamNameInput}
          inviteCodeInput={inviteCodeInput}
          onInviteCodeChange={setInviteCodeInput}
          onSubmit={handleTeamSetupSubmit}
          authError={authError}
        />
      ) : null}

      {showCoreApp ? (
        isManagerPage ? (
          <ManagerPage {...managerPageProps} />
        ) : (
          <SchedulePage {...schedulePageProps} />
        )
      ) : null}
    </div>
  );
}
