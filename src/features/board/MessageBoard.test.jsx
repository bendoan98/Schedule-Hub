// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import MessageBoard from './MessageBoard';

describe('MessageBoard', () => {
  it('pins the latest announcement and replaces older announcements', () => {
    const posts = [
      {
        id: 'announcement-1',
        authorId: 'mgr-1',
        authorName: 'Manager One',
        kind: 'announcement',
        message: 'Old announcement',
        createdAt: '2026-03-10T09:00:00.000Z'
      },
      {
        id: 'comment-1',
        authorId: 'emp-1',
        authorName: 'Employee One',
        kind: 'comment',
        message: 'Regular chat message',
        createdAt: '2026-03-10T10:00:00.000Z'
      },
      {
        id: 'announcement-2',
        authorId: 'mgr-1',
        authorName: 'Manager One',
        kind: 'announcement',
        message: 'Latest announcement',
        createdAt: '2026-03-10T11:00:00.000Z'
      }
    ];

    render(
      <MessageBoard
        posts={posts}
        currentUser={{ id: 'emp-1', name: 'Employee One' }}
        role="employee"
        onAddPost={() => {}}
        embedded
      />
    );

    expect(screen.getByText('Pinned Announcement')).toBeInTheDocument();
    expect(screen.getByText('Latest announcement')).toBeInTheDocument();
    expect(screen.queryByText('Old announcement')).not.toBeInTheDocument();
    expect(screen.getByText('Regular chat message')).toBeInTheDocument();
  });
});

