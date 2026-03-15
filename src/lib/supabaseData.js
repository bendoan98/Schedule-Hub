function normalizeError(error, fallback) {
  if (!error) {
    return null;
  }

  return new Error(error.message || fallback);
}

function mapEmployee(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    colorIndex: row.color_index ?? 0
  };
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
    targetEmployeeId: row.target_employee_id,
    title: row.title,
    body: row.body,
    read: row.read,
    createdAt: row.created_at
  };
}

function mapMessagePost(row) {
  return {
    id: row.id,
    authorId: row.author_id,
    kind: row.kind,
    message: row.message,
    createdAt: row.created_at
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

export async function fetchAppData(client) {
  const [employeesRes, shiftsRes, swapRes, notificationsRes, postsRes] = await Promise.all([
    client
      .from('employees')
      .select('id, name, email, role, department, color_index')
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
      .select('id, target_employee_id, title, body, read, created_at')
      .order('created_at', { ascending: false }),
    client
      .from('message_posts')
      .select('id, author_id, kind, message, created_at')
      .order('created_at', { ascending: false })
  ]);

  const firstError =
    employeesRes.error ||
    shiftsRes.error ||
    swapRes.error ||
    notificationsRes.error ||
    postsRes.error;

  const normalizedError = normalizeError(firstError, 'Unable to fetch schedule data from Supabase.');

  if (normalizedError) {
    throw normalizedError;
  }

  return {
    employees: (employeesRes.data ?? []).map(mapEmployee),
    shifts: (shiftsRes.data ?? []).map(mapShift),
    swapRequests: (swapRes.data ?? []).map(mapSwapRequest),
    notifications: (notificationsRes.data ?? []).map(mapNotification),
    boardPosts: (postsRes.data ?? []).map(mapMessagePost)
  };
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

export async function markAllNotificationsRead(client, { role, currentEmployeeId }) {
  let query = client.from('notifications').update({ read: true }).eq('read', false);

  if (role !== 'manager') {
    query = query.or(`target_employee_id.eq.${currentEmployeeId},target_employee_id.is.null`);
  }

  const { error } = await query;

  if (error) {
    throw normalizeError(error, 'Unable to mark notifications as read.');
  }
}

export async function insertMessagePost(client, post) {
  const { error } = await client.from('message_posts').insert({
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
