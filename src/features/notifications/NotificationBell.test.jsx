// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import NotificationBell from './NotificationBell';

describe('NotificationBell', () => {
  it('opens, marks read, and closes when clicking outside', () => {
    const onMarkAllRead = vi.fn();

    render(
      <NotificationBell
        notifications={[
          { id: 'n1', title: 'New Schedule', body: 'Week published', read: false },
          { id: 'n2', title: 'Dept', body: 'Updated', read: true }
        ]}
        onMarkAllRead={onMarkAllRead}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Updates')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /mark all read/i }));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);

    fireEvent.pointerDown(document.body);
    expect(screen.queryByText('Updates')).not.toBeInTheDocument();
  });

  it('shows empty state when no notifications exist', () => {
    render(<NotificationBell notifications={[]} onMarkAllRead={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('No notifications.')).toBeInTheDocument();
  });
});
