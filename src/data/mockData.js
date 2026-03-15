import { toIsoDate, getMonday } from '../utils/date';

const weekStart = toIsoDate(getMonday());

export const mockEmployees = [
  {
    id: 'emp-jamie',
    name: 'Jamie Chen',
    email: 'jamie.chen@example.com',
    role: 'employee',
    department: 'KITCHEN',
    colorIndex: 0
  },
  {
    id: 'emp-alex',
    name: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    role: 'manager',
    department: 'OPERATIONS',
    colorIndex: 1
  },
  {
    id: 'emp-sam',
    name: 'Sam Rivera',
    email: 'sam.rivera@example.com',
    role: 'employee',
    department: 'DRIVER',
    colorIndex: 2
  }
];

export const mockShifts = [
  {
    id: 'shift-1',
    employeeId: 'emp-jamie',
    day: 0,
    startTime: '09:00',
    endTime: '17:00',
    weekStart
  },
  {
    id: 'shift-2',
    employeeId: 'emp-jamie',
    day: 3,
    startTime: '13:00',
    endTime: '21:00',
    weekStart
  },
  {
    id: 'shift-3',
    employeeId: 'emp-sam',
    day: 1,
    startTime: '07:00',
    endTime: '15:00',
    weekStart
  },
  {
    id: 'shift-4',
    employeeId: 'emp-sam',
    day: 5,
    startTime: '15:00',
    endTime: '23:00',
    weekStart
  }
];

export const mockSwapRequests = [
  {
    id: 'swap-1',
    shiftId: 'shift-3',
    requestedBy: 'emp-sam',
    reason: 'Medical appointment in the morning.',
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

export const mockNotifications = [
  {
    id: 'notif-1',
    title: 'Swap Request Submitted',
    body: 'Sam Rivera requested a swap for Tuesday 07:00 - 15:00.',
    read: false,
    createdAt: new Date().toISOString()
  }
];

export const mockBoardPosts = [
  {
    id: 'post-1',
    authorId: 'emp-alex',
    authorName: 'Alex Morgan',
    kind: 'announcement',
    message: 'Reminder: time-off requests are due by Wednesday.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'post-2',
    authorId: 'emp-jamie',
    authorName: 'Jamie Chen',
    kind: 'comment',
    message: 'Received, thanks for the reminder.',
    createdAt: new Date().toISOString()
  }
];
