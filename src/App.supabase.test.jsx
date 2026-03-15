// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

const supabaseMock = vi.hoisted(() => {
  let authStateChangeHandler = null;
  const subscription = { unsubscribe: vi.fn() };
  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel)
  };

  return {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn((callback) => {
        authStateChangeHandler = callback;
        return { data: { subscription } };
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signInWithOAuth: vi.fn()
    },
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
    __emitAuthChange(event, nextSession) {
      authStateChangeHandler?.(event, nextSession);
    },
    __resetInternal() {
      authStateChangeHandler = null;
      subscription.unsubscribe.mockClear();
      channel.on.mockClear();
      channel.subscribe.mockClear();
    }
  };
});

const supabaseDataMock = vi.hoisted(() => ({
  createDepartment: vi.fn(),
  createSwapRequest: vi.fn(),
  createTeamForCurrentUser: vi.fn(),
  deleteDepartment: vi.fn(),
  ensureDepartment: vi.fn(),
  fetchAppData: vi.fn(),
  insertCsvShifts: vi.fn(),
  insertMessagePost: vi.fn(),
  insertNotifications: vi.fn(),
  joinTeamWithInviteCode: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  renameDepartment: vi.fn(),
  replaceDepartmentForTeam: vi.fn(),
  removeShift: vi.fn(),
  setSwapRequestStatus: vi.fn(),
  updateEmployeeDepartment: vi.fn(),
  upsertShift: vi.fn()
}));

vi.mock('./lib/supabaseClient', () => ({
  hasSupabaseCredentials: true,
  supabase: supabaseMock
}));

vi.mock('./lib/supabaseData', () => supabaseDataMock);

vi.mock('./data/mockData', () => ({
  mockEmployees: [],
  mockShifts: [],
  mockSwapRequests: [],
  mockNotifications: [],
  mockBoardPosts: []
}));

vi.mock('./features/dashboard/DashboardStats', () => ({
  default: () => <section data-testid="dashboard-stats">Dashboard stats</section>
}));

vi.mock('./features/schedule/WeeklyCalendar', () => ({
  default: () => <section data-testid="weekly-calendar">Weekly calendar</section>
}));

vi.mock('./features/shifts/ShiftEditorModal', () => ({
  default: () => <section data-testid="shift-modal">Shift modal</section>
}));

vi.mock('./features/notifications/NotificationBell', () => ({
  default: () => <section data-testid="notification-bell">Notification bell</section>
}));

vi.mock('./features/board/MessageBoard', () => ({
  default: () => <section data-testid="message-board">Message board</section>
}));

vi.mock('./features/export/ExportButtons', () => ({
  default: () => <section data-testid="export-buttons">Export buttons</section>
}));

vi.mock('./features/manager/ManagerPage', () => ({
  default: () => <section data-testid="manager-page">Manager page</section>
}));

function createSnapshot(overrides = {}) {
  return {
    employees: [],
    team: null,
    departments: [],
    shifts: [],
    swapRequests: [],
    notifications: [],
    boardPosts: [],
    ...overrides
  };
}

function createSession(id = 'auth-1', email = 'auth@example.com') {
  return {
    user: {
      id,
      email
    }
  };
}

describe('App (Supabase mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.__resetInternal();

    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabaseMock.auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    supabaseMock.auth.signInWithOAuth.mockResolvedValue({ error: null });

    supabaseDataMock.fetchAppData.mockResolvedValue(createSnapshot());
    supabaseDataMock.createTeamForCurrentUser.mockResolvedValue({
      id: 'team-1',
      name: 'Downtown Ops',
      inviteCode: 'INV12345'
    });
    supabaseDataMock.joinTeamWithInviteCode.mockResolvedValue({
      id: 'team-1',
      name: 'Downtown Ops',
      inviteCode: 'INV12345'
    });
  });

  it('handles login, forgot password, and oauth actions from auth panel', async () => {
    render(<App />);

    expect(await screen.findByRole('button', { name: /log in/i })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'user@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter password'), {
      target: { value: 'secret123' }
    });

    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret123'
      });
    });

    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    await waitFor(() => {
      expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com');
    });

    fireEvent.click(screen.getByRole('button', { name: /^Google$/i }));
    await waitFor(() => {
      expect(supabaseMock.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
    });
  });

  it('handles sign-up and sets post-signup guidance message', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /sign up/i }));

    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: '  Jane Doe  ' }
    });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'jane@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('Create a password'), {
      target: { value: 'abc12345' }
    });

    const signUpButtons = screen.getAllByRole('button', { name: /^Sign Up$/ });
    fireEvent.click(signUpButtons[signUpButtons.length - 1]);

    await waitFor(() => {
      expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
        email: 'jane@example.com',
        password: 'abc12345',
        options: {
          data: {
            name: 'Jane Doe'
          }
        }
      });
    });

    expect(
      screen.getByText(/sign-up successful\. confirm your email, then sign in to finish team setup\./i)
    ).toBeInTheDocument();
  });

  it('shows missing profile panel when auth user has no employee row', async () => {
    const session = createSession('auth-1');
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    supabaseDataMock.fetchAppData.mockResolvedValue(
      createSnapshot({
        employees: [
          {
            id: 'someone-else',
            teamId: 'team-1',
            name: 'Other User',
            email: 'other@example.com',
            role: 'employee',
            department: null,
            colorIndex: 0
          }
        ]
      })
    );

    render(<App />);

    expect(await screen.findByText('Profile Not Found')).toBeInTheDocument();
    expect(supabaseDataMock.fetchAppData).toHaveBeenCalledWith(supabaseMock);
  });

  it('supports create and join team flows from setup panel', async () => {
    const session = createSession('auth-1');
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    supabaseDataMock.fetchAppData.mockResolvedValue(
      createSnapshot({
        employees: [
          {
            id: 'auth-1',
            teamId: null,
            name: 'Current User',
            email: 'auth@example.com',
            role: 'employee',
            department: null,
            colorIndex: 0
          }
        ]
      })
    );

    render(<App />);

    expect(await screen.findByText('Set Up Your Team')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Downtown Ops'), {
      target: { value: '  Downtown Ops  ' }
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(supabaseDataMock.createTeamForCurrentUser).toHaveBeenCalledWith(supabaseMock, 'Downtown Ops');
    });

    fireEvent.click(screen.getByRole('button', { name: /join team/i }));
    fireEvent.change(screen.getByPlaceholderText('ABC12345'), {
      target: { value: 'abc12345' }
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(supabaseDataMock.joinTeamWithInviteCode).toHaveBeenCalledWith(supabaseMock, 'ABC12345');
    });
  });

  it('renders core app for profiled session and handles sign out + auth state reset', async () => {
    const session = createSession('auth-1', 'manager@example.com');
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    supabaseDataMock.fetchAppData.mockResolvedValue(
      createSnapshot({
        team: { id: 'team-1', name: 'Downtown Ops', inviteCode: 'ABCD1234' },
        employees: [
          {
            id: 'auth-1',
            teamId: 'team-1',
            name: 'Manager One',
            email: 'manager@example.com',
            role: 'manager',
            department: 'OPS',
            colorIndex: 0
          }
        ]
      })
    );

    render(<App />);

    expect(await screen.findByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manager page/i })).toBeInTheDocument();
    expect(supabaseMock.channel).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    await waitFor(() => {
      expect(supabaseMock.auth.signOut).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      supabaseMock.__emitAuthChange('SIGNED_OUT', null);
    });

    expect(await screen.findByRole('button', { name: /log in/i })).toBeInTheDocument();
  });
});
