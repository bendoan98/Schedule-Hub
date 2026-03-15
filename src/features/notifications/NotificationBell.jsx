import { useMemo, useState } from 'react';

export default function NotificationBell({ notifications, onMarkAllRead }) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  return (
    <div className="notification-bell">
      <button type="button" onClick={() => setIsOpen((value) => !value)} className="bell-button">
        Notifications
        {unreadCount > 0 ? <span className="bell-badge">{unreadCount}</span> : null}
      </button>

      {isOpen ? (
        <section className="notification-popover" aria-label="Notifications">
          <header>
            <h4>Updates</h4>
            <button type="button" onClick={onMarkAllRead}>
              Mark all read
            </button>
          </header>

          {notifications.length === 0 ? <p>No notifications.</p> : null}

          <ul>
            {notifications.map((notification) => (
              <li key={notification.id} className={notification.read ? 'read' : 'unread'}>
                <p>{notification.title}</p>
                <small>{notification.body}</small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
