import { describe, expect, it, vi } from 'vitest';
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
  removeShift,
  renameDepartment,
  replaceDepartmentForTeam,
  setSwapRequestStatus,
  updateEmployeeDepartment,
  upsertShift
} from './supabaseData';

function createEqChain(result) {
  const chain = {
    ...result,
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve(result)),
    limit: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    select: vi.fn(() => Promise.resolve(result))
  };

  return chain;
}

function createTableHandler(config = {}) {
  const selectResult = config.selectResult ?? { data: [], error: null };
  const maybeSingleResult = config.maybeSingleResult ?? selectResult;
  const insertResult = config.insertResult ?? { data: null, error: null };
  const insertSelectResult = config.insertSelectResult ?? insertResult;
  const updateResult = config.updateResult ?? { data: null, error: null };
  const deleteResult = config.deleteResult ?? { data: null, error: null };

  return {
    select: vi.fn(() => {
      const chain = createEqChain(selectResult);
      chain.maybeSingle = vi.fn(() => Promise.resolve(maybeSingleResult));
      return chain;
    }),
    insert: vi.fn(() => ({
      ...insertResult,
      select: vi.fn(() => Promise.resolve(insertSelectResult))
    })),
    update: vi.fn(() => createEqChain(updateResult)),
    delete: vi.fn(() => createEqChain(deleteResult)),
    upsert: vi.fn(() => Promise.resolve(config.upsertResult ?? { data: null, error: null }))
  };
}

function createClient({ tables = {}, rpc = {} } = {}) {
  const handlers = new Map();

  const from = vi.fn((tableName) => {
    if (!handlers.has(tableName)) {
      handlers.set(tableName, createTableHandler(tables[tableName]));
    }

    return handlers.get(tableName);
  });

  const rpcMock = vi.fn((fnName) => {
    return Promise.resolve(rpc[fnName] ?? { data: null, error: null });
  });

  return {
    from,
    rpc: rpcMock,
    handlers
  };
}

describe('supabaseData', () => {
  it('fetchAppData maps Supabase rows into app models', async () => {
    const client = createClient({
      tables: {
        employees: {
          selectResult: {
            data: [
              {
                id: 'e1',
                team_id: 't1',
                name: 'Alex',
                email: 'alex@example.com',
                role: 'manager',
                department_id: 'd1',
                color_index: 3
              }
            ],
            error: null
          }
        },
        teams: {
          selectResult: {
            data: [{ id: 't1', name: 'Ops Team', invite_code: 'ABC123', created_by: 'e1', created_at: '2026-01-01' }],
            error: null
          }
        },
        departments: {
          selectResult: {
            data: [{ id: 'd1', team_id: 't1', name: 'ops' }],
            error: null
          }
        },
        shifts: {
          selectResult: {
            data: [{ id: 's1', employee_id: 'e1', day: 0, start_time: '09:00', end_time: '17:00', week_start: '2026-03-09' }],
            error: null
          }
        },
        swap_requests: {
          selectResult: {
            data: [
              {
                id: 'r1',
                shift_id: 's1',
                offered_shift_id: 's2',
                requested_by: 'e1',
                target_employee_id: 'e2',
                reason: null,
                status: 'pending_manager',
                created_at: '2026-03-01'
              }
            ],
            error: null
          }
        },
        notifications: {
          selectResult: {
            data: [
              {
                id: 'n1',
                team_id: 't1',
                recipient_employee_id: 'e1',
                sender_employee_id: 'e2',
                title: 'Update',
                body: 'Body',
                read_at: null,
                created_at: '2026-03-01'
              }
            ],
            error: null
          }
        },
        message_posts: {
          selectResult: {
            data: [{ id: 'm1', team_id: 't1', author_id: 'e1', kind: 'manager', message: 'Hello', created_at: '2026-03-01' }],
            error: null
          }
        }
      }
    });

    const snapshot = await fetchAppData(client);

    expect(snapshot.team).toEqual({
      id: 't1',
      name: 'Ops Team',
      inviteCode: 'ABC123',
      createdBy: 'e1',
      createdAt: '2026-01-01'
    });
    expect(snapshot.employees[0]).toEqual({
      id: 'e1',
      teamId: 't1',
      name: 'Alex',
      email: 'alex@example.com',
      role: 'manager',
      department: 'OPS',
      departmentId: 'd1',
      colorIndex: 3
    });
    expect(snapshot.departments).toEqual(['UNASSIGNED', 'OPS']);
    expect(snapshot.shifts[0].employeeId).toBe('e1');
    expect(snapshot.swapRequests[0].offeredShiftId).toBe('s2');
    expect(snapshot.swapRequests[0].targetEmployeeId).toBe('e2');
    expect(snapshot.swapRequests[0].reason).toBe('');
    expect(snapshot.notifications[0].read).toBe(false);
    expect(snapshot.boardPosts[0].authorId).toBe('e1');
  });

  it('fetchAppData throws first Supabase error', async () => {
    const client = createClient({
      tables: {
        employees: {
          selectResult: {
            data: null,
            error: { message: 'employees failed' }
          }
        }
      }
    });

    await expect(fetchAppData(client)).rejects.toThrow('employees failed');
  });

  it('maps create/join team RPC responses and validates missing rows', async () => {
    const client = createClient({
      rpc: {
        create_team_for_current_user: {
          data: [{ team_id: 't1', team_name: 'North', invite_code: 'INV123', assigned_role: 'manager' }],
          error: null
        },
        join_team_with_invite_code: {
          data: { team_id: 't2', team_name: 'South', invite_code: 'INV234', assigned_role: 'employee' },
          error: null
        }
      }
    });

    await expect(createTeamForCurrentUser(client, 'North')).resolves.toEqual({
      id: 't1',
      name: 'North',
      inviteCode: 'INV123',
      assignedRole: 'manager'
    });
    await expect(joinTeamWithInviteCode(client, 'INV234')).resolves.toEqual({
      id: 't2',
      name: 'South',
      inviteCode: 'INV234',
      assignedRole: 'employee'
    });

    const badClient = createClient({
      rpc: {
        create_team_for_current_user: { data: [], error: null }
      }
    });

    await expect(createTeamForCurrentUser(badClient, 'North')).rejects.toThrow(
      'Unable to read created team response.'
    );
  });

  it('runs department mutations with normalized names', async () => {
    const client = createClient();

    await createDepartment(client, 't1', 'ops');
    await renameDepartment(client, { teamId: 't1', fromName: 'ops', toName: 'support' });
    await deleteDepartment(client, { teamId: 't1', name: 'support' });
    await ensureDepartment(client, 't1', 'support');

    expect(client.handlers.get('departments').insert).toHaveBeenCalledWith({
      team_id: 't1',
      name: 'OPS'
    });
    expect(client.handlers.get('departments').update).toHaveBeenCalledWith({
      name: 'SUPPORT'
    });
    expect(client.handlers.get('departments').delete).toHaveBeenCalledTimes(1);
    expect(client.handlers.get('departments').upsert).toHaveBeenCalledWith(
      { team_id: 't1', name: 'SUPPORT' },
      { onConflict: 'team_id,name', ignoreDuplicates: true }
    );
  });

  it('skips rename when source and target are identical', async () => {
    const client = createClient();
    await renameDepartment(client, { teamId: 't1', fromName: 'ops', toName: 'OPS' });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('replaces team department ids and supports null targets', async () => {
    const client = createClient({
      tables: {
        departments: {
          maybeSingleResult: { data: { id: 'source-1' }, error: null }
        }
      }
    });

    await replaceDepartmentForTeam(client, { teamId: 't1', fromDepartment: 'OPS', toDepartment: null });

    expect(client.handlers.get('employees').update).toHaveBeenCalledWith({ department_id: null });
  });

  it('throws when replaceDepartmentForTeam cannot resolve explicit target department', async () => {
    const client = createClient({
      tables: {
        departments: {
          maybeSingleResult: { data: null, error: null }
        }
      }
    });

    await expect(
      replaceDepartmentForTeam(client, { teamId: 't1', fromDepartment: 'OPS', toDepartment: 'SERVICE' })
    ).rejects.toThrow('Department SERVICE not found for this team.');
  });

  it('updates employee department with lookup validation', async () => {
    const client = createClient({
      tables: {
        departments: {
          maybeSingleResult: { data: { id: 'dep-1' }, error: null }
        }
      }
    });

    await updateEmployeeDepartment(client, { employeeId: 'e1', teamId: 't1', department: 'OPS' });
    expect(client.handlers.get('employees').update).toHaveBeenCalledWith({ department_id: 'dep-1' });
  });

  it('fails employee department update for missing team or department', async () => {
    const missingTeamClient = createClient();
    await expect(
      updateEmployeeDepartment(missingTeamClient, { employeeId: 'e1', teamId: null, department: 'OPS' })
    ).rejects.toThrow('Team is required when assigning a department.');

    const missingDepartmentClient = createClient({
      tables: {
        departments: {
          maybeSingleResult: { data: null, error: null }
        }
      }
    });

    await expect(
      updateEmployeeDepartment(missingDepartmentClient, { employeeId: 'e1', teamId: 't1', department: 'OPS' })
    ).rejects.toThrow('Department OPS not found for this team.');
  });

  it('creates and updates shifts', async () => {
    const client = createClient();
    await upsertShift(
      client,
      {
        isNew: true,
        employeeId: 'e1',
        day: '2',
        startTime: '09:00',
        endTime: '17:00',
        weekStart: '2026-03-09'
      },
      '2026-03-16'
    );
    await upsertShift(
      client,
      {
        id: 's1',
        isNew: false,
        employeeId: 'e1',
        day: 2,
        startTime: '10:00',
        endTime: '18:00'
      },
      '2026-03-16'
    );

    expect(client.handlers.get('shifts').insert).toHaveBeenCalledWith({
      employee_id: 'e1',
      day: 2,
      start_time: '09:00',
      end_time: '17:00',
      week_start: '2026-03-09'
    });
    expect(client.handlers.get('shifts').update).toHaveBeenCalledWith({
      employee_id: 'e1',
      day: 2,
      start_time: '10:00',
      end_time: '18:00',
      week_start: '2026-03-16'
    });
  });

  it('handles swap, notification, post, and delete mutations', async () => {
    const client = createClient();

    await removeShift(client, 's1');
    await createSwapRequest(client, {
      shiftId: 's1',
      offeredShiftId: 's2',
      requestedBy: 'e1',
      targetEmployeeId: 'e2',
      reason: ''
    });
    await setSwapRequestStatus(client, 'r1', 'approved');
    await markAllNotificationsRead(client);
    await insertMessagePost(client, { teamId: 't1', authorId: 'e1', kind: 'manager', message: 'note' });

    expect(client.handlers.get('shifts').delete).toHaveBeenCalledTimes(1);
    expect(client.handlers.get('swap_requests').insert).toHaveBeenCalledWith({
      shift_id: 's1',
      offered_shift_id: 's2',
      requested_by: 'e1',
      target_employee_id: 'e2',
      reason: null,
      status: 'pending_target'
    });
    expect(client.handlers.get('swap_requests').update).toHaveBeenCalledWith({ status: 'approved' });
    expect(client.handlers.get('notifications').update).toHaveBeenCalledTimes(1);
    expect(client.handlers.get('message_posts').insert).toHaveBeenCalledWith({
      team_id: 't1',
      author_id: 'e1',
      kind: 'manager',
      message: 'note'
    });
  });

  it('filters invalid notifications and skips empty inserts', async () => {
    const client = createClient();

    await insertNotifications(client, [
      { teamId: 't1', targetEmployeeId: 'e1', senderEmployeeId: 'm1', title: 'A', body: 'B' },
      { teamId: 't1', targetEmployeeId: '', title: 'X', body: 'Y' },
      null
    ]);

    expect(client.handlers.get('notifications').insert).toHaveBeenCalledWith([
      {
        team_id: 't1',
        recipient_employee_id: 'e1',
        sender_employee_id: 'm1',
        title: 'A',
        body: 'B'
      }
    ]);

    const emptyClient = createClient();
    await insertNotifications(emptyClient, []);
    expect(emptyClient.from).not.toHaveBeenCalled();
  });

  it('imports csv shifts and returns inserted count', async () => {
    const client = createClient({
      tables: {
        shifts: {
          insertSelectResult: { data: [{ id: 's1' }, { id: 's2' }], error: null }
        }
      }
    });

    const count = await insertCsvShifts(
      client,
      [
        { employeeId: 'e1', day: 0, startTime: '09:00', endTime: '17:00' },
        { employeeId: 'e2', day: 1, startTime: '10:00', endTime: '14:00' }
      ],
      '2026-03-09'
    );

    expect(count).toBe(2);
    expect(client.handlers.get('shifts').insert).toHaveBeenCalledWith([
      {
        employee_id: 'e1',
        day: 0,
        start_time: '09:00',
        end_time: '17:00',
        week_start: '2026-03-09'
      },
      {
        employee_id: 'e2',
        day: 1,
        start_time: '10:00',
        end_time: '14:00',
        week_start: '2026-03-09'
      }
    ]);
  });

  it('returns zero for empty csv shift imports', async () => {
    const client = createClient();
    const count = await insertCsvShifts(client, [], '2026-03-09');
    expect(count).toBe(0);
    expect(client.from).not.toHaveBeenCalled();
  });
});
