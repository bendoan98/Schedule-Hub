import { buildDepartmentList, toStoredDepartment } from '../utils/department';

function normalizeError(error, fallback) {
  if (!error) {
    return null;
  }

  return new Error(error.message || fallback);
}

function mapEmployee(row, departmentNamesById) {
  return {
    id: row.id,
    teamId: row.team_id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department_id ? departmentNamesById.get(row.department_id) ?? null : null,
    departmentId: row.department_id ?? null,
    colorIndex: row.color_index ?? 0
  };
}

function mapTeam(row) {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

function mapDepartmentName(row) {
  return toStoredDepartment(row.name);
}

function mapShift(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    day: row.day,
    startTime: row.start_time,
    endTime: row.end_time,
    weekStart: row.week_start
  };
}

function mapSwapRequest(row) {
  return {
    id: row.id,
    shiftId: row.shift_id,
    requestedBy: row.requested_by,
    reason: row.reason ?? '',
    status: row.status,
    createdAt: row.created_at
  };
}

function mapNotification(row) {
  return {
    id: row.id,
    teamId: row.team_id,
    targetEmployeeId: row.recipient_employee_id,
    senderEmployeeId: row.sender_employee_id ?? null,
    title: row.title,
    body: row.body,
    read: Boolean(row.read_at),
    createdAt: row.created_at
  };
}

function mapMessagePost(row) {
  return {
    id: row.id,
    teamId: row.team_id,
    authorId: row.author_id,
    kind: row.kind,
    message: row.message,
    createdAt: row.created_at
  };
}

function normalizeNotificationPayload(payload) {
  return {
    team_id: payload.teamId,
    recipient_employee_id: payload.targetEmployeeId ?? null,
    sender_employee_id: payload.senderEmployeeId ?? null,
    title: payload.title,
    body: payload.body
  };
}

function shiftPayload(shift, weekStart) {
  return {
    employee_id: shift.employeeId,
    day: Number(shift.day),
    start_time: shift.startTime,
    end_time: shift.endTime,
    week_start: shift.weekStart ?? weekStart
  };
}

function mapRpcTeamResult(data, fallbackErrorMessage) {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    throw new Error(fallbackErrorMessage);
  }

  return {
    id: row.team_id,
    name: row.team_name,
    inviteCode: row.invite_code,
    assignedRole: row.assigned_role
  };
}

export async function fetchAppData(client) {
  const [employeesRes, teamsRes, departmentsRes, shiftsRes, swapRes, notificationsRes, postsRes] = await Promise.all([
    client
      .from('employees')
      .select('id, team_id, name, email, role, department_id, color_index')
      .order('name', { ascending: true }),
    client
      .from('teams')
      .select('id, name, invite_code, created_by, created_at')
      .limit(1),
    client
      .from('departments')
      .select('id, team_id, name')
      .order('name', { ascending: true }),
    client
      .from('shifts')
      .select('id, employee_id, day, start_time, end_time, week_start')
      .order('week_start', { ascending: false }),
    client
      .from('swap_requests')
      .select('id, shift_id, requested_by, reason, status, created_at')
      .order('created_at', { ascending: false }),
    client
      .from('notifications')
      .select('id, team_id, recipient_employee_id, sender_employee_id, title, body, read_at, created_at')
      .order('created_at', { ascending: false }),
    client
      .from('message_posts')
      .select('id, team_id, author_id, kind, message, created_at')
      .order('created_at', { ascending: false })
  ]);

  const firstError =
    employeesRes.error ||
    teamsRes.error ||
    departmentsRes.error ||
    shiftsRes.error ||
    swapRes.error ||
    notificationsRes.error ||
    postsRes.error;

  const normalizedError = normalizeError(firstError, 'Unable to fetch schedule data from Supabase.');

  if (normalizedError) {
    throw normalizedError;
  }

  const departmentNamesById = new Map(
    (departmentsRes.data ?? []).map((row) => [row.id, toStoredDepartment(row.name)])
  );

  return {
    employees: (employeesRes.data ?? []).map((row) => mapEmployee(row, departmentNamesById)),
    team: teamsRes.data?.[0] ? mapTeam(teamsRes.data[0]) : null,
    departments: buildDepartmentList((departmentsRes.data ?? []).map(mapDepartmentName)),
    shifts: (shiftsRes.data ?? []).map(mapShift),
    swapRequests: (swapRes.data ?? []).map(mapSwapRequest),
    notifications: (notificationsRes.data ?? []).map(mapNotification),
    boardPosts: (postsRes.data ?? []).map(mapMessagePost)
  };
}

export async function createTeamForCurrentUser(client, teamName) {
  const { data, error } = await client.rpc('create_team_for_current_user', {
    p_team_name: teamName
  });

  if (error) {
    throw normalizeError(error, 'Unable to create team.');
  }

  return mapRpcTeamResult(data, 'Unable to read created team response.');
}

export async function joinTeamWithInviteCode(client, inviteCode) {
  const { data, error } = await client.rpc('join_team_with_invite_code', {
    p_invite_code: inviteCode
  });

  if (error) {
    throw normalizeError(error, 'Unable to join team with invite code.');
  }

  return mapRpcTeamResult(data, 'Unable to read joined team response.');
}

export async function createDepartment(client, teamId, departmentName) {
  const name = toStoredDepartment(departmentName);
  const { error } = await client.from('departments').insert({
    team_id: teamId,
    name
  });

  if (error) {
    throw normalizeError(error, 'Unable to create department.');
  }
}

export async function renameDepartment(client, { teamId, fromName, toName }) {
  const source = toStoredDepartment(fromName);
  const target = toStoredDepartment(toName);

  if (source === target) {
    return;
  }

  const { error } = await client
    .from('departments')
    .update({ name: target })
    .eq('team_id', teamId)
    .eq('name', source);

  if (error) {
    throw normalizeError(error, 'Unable to rename department.');
  }
}

export async function deleteDepartment(client, { teamId, name }) {
  const normalized = toStoredDepartment(name);
  const { error } = await client
    .from('departments')
    .delete()
    .eq('team_id', teamId)
    .eq('name', normalized);

  if (error) {
    throw normalizeError(error, 'Unable to delete department.');
  }
}

export async function ensureDepartment(client, teamId, departmentName) {
  const name = toStoredDepartment(departmentName);
  const { error } = await client.from('departments').upsert(
    {
      team_id: teamId,
      name
    },
    {
      onConflict: 'team_id,name',
      ignoreDuplicates: true
    }
  );

  if (error) {
    throw normalizeError(error, 'Unable to ensure department exists.');
  }
}

export async function replaceDepartmentForTeam(client, { teamId, fromDepartment, toDepartment }) {
  const source = toStoredDepartment(fromDepartment);
  const target = toDepartment == null ? null : toStoredDepartment(toDepartment);

  if (source === target) {
    return;
  }

  const { data: sourceDepartmentRow, error: sourceLookupError } = await client
    .from('departments')
    .select('id')
    .eq('team_id', teamId)
    .eq('name', source)
    .maybeSingle();

  if (sourceLookupError) {
    throw normalizeError(sourceLookupError, 'Unable to resolve source department.');
  }

  let targetDepartmentId = null;

  if (target) {
    const { data: targetDepartmentRow, error: targetLookupError } = await client
      .from('departments')
      .select('id')
      .eq('team_id', teamId)
      .eq('name', target)
      .maybeSingle();

    if (targetLookupError) {
      throw normalizeError(targetLookupError, 'Unable to resolve target department.');
    }

    if (!targetDepartmentRow?.id && !sourceDepartmentRow?.id) {
      throw new Error(`Department ${target} not found for this team.`);
    }

    // During rename flow, target name does not exist yet. Keep source department ID.
    targetDepartmentId = targetDepartmentRow?.id ?? sourceDepartmentRow.id;
  }

  if (!sourceDepartmentRow?.id) {
    return;
  }

  const query = client
    .from('employees')
    .update({ department_id: targetDepartmentId })
    .eq('team_id', teamId)
    .eq('department_id', sourceDepartmentRow.id);

  const { error } = await query;

  if (error) {
    throw normalizeError(error, 'Unable to update team department members.');
  }
}

export async function updateEmployeeDepartment(client, { employeeId, teamId, department }) {
  let departmentId = null;

  if (department != null) {
    if (!teamId) {
      throw new Error('Team is required when assigning a department.');
    }

    const { data: departmentRow, error: lookupError } = await client
      .from('departments')
      .select('id')
      .eq('team_id', teamId)
      .eq('name', department)
      .maybeSingle();

    if (lookupError) {
      throw normalizeError(lookupError, 'Unable to resolve department.');
    }

    if (!departmentRow?.id) {
      throw new Error(`Department ${department} not found for this team.`);
    }

    departmentId = departmentRow.id;
  }

  const { error } = await client
    .from('employees')
    .update({ department_id: departmentId })
    .eq('id', employeeId);

  if (error) {
    throw normalizeError(error, 'Unable to update employee department.');
  }
}

export async function upsertShift(client, shift, weekStart) {
  const payload = shiftPayload(shift, weekStart);

  if (shift.isNew) {
    const { error } = await client.from('shifts').insert(payload);

    if (error) {
      throw normalizeError(error, 'Unable to create shift.');
    }

    return;
  }

  const { error } = await client.from('shifts').update(payload).eq('id', shift.id);

  if (error) {
    throw normalizeError(error, 'Unable to update shift.');
  }
}

export async function removeShift(client, shiftId) {
  const { error } = await client.from('shifts').delete().eq('id', shiftId);

  if (error) {
    throw normalizeError(error, 'Unable to delete shift.');
  }
}

export async function createSwapRequest(client, { shiftId, requestedBy, reason }) {
  const { error } = await client.from('swap_requests').insert({
    shift_id: shiftId,
    requested_by: requestedBy,
    reason: reason || null,
    status: 'pending'
  });

  if (error) {
    throw normalizeError(error, 'Unable to create swap request.');
  }
}

export async function setSwapRequestStatus(client, requestId, status) {
  const { error } = await client.from('swap_requests').update({ status }).eq('id', requestId);

  if (error) {
    throw normalizeError(error, 'Unable to update swap request status.');
  }
}

export async function markAllNotificationsRead(client) {
  const { error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);

  if (error) {
    throw normalizeError(error, 'Unable to mark notifications as read.');
  }
}

export async function insertNotifications(client, notifications) {
  const payload = (notifications ?? [])
    .filter((notification) => notification?.teamId && notification?.targetEmployeeId && notification?.title && notification?.body)
    .map(normalizeNotificationPayload);

  if (!payload.length) {
    return;
  }

  const { error } = await client.from('notifications').insert(payload);

  if (error) {
    throw normalizeError(error, 'Unable to create notifications.');
  }
}

export async function insertMessagePost(client, post) {
  const { error } = await client.from('message_posts').insert({
    team_id: post.teamId,
    author_id: post.authorId,
    kind: post.kind,
    message: post.message
  });

  if (error) {
    throw normalizeError(error, 'Unable to add message board post.');
  }
}

export async function insertCsvShifts(client, shifts, weekStart) {
  if (!shifts.length) {
    return 0;
  }

  const payload = shifts.map((shift) => shiftPayload(shift, weekStart));
  const { data, error } = await client.from('shifts').insert(payload).select('id');

  if (error) {
    throw normalizeError(error, 'Unable to import CSV shifts.');
  }

  return data?.length ?? shifts.length;
}
