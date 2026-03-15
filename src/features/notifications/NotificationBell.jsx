import { useEffect, useMemo, useRef, useState } from 'react';

export default function NotificationBell({ notifications, onMarkAllRead }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  useEffect(() => {
    function handlePointerDown(event) {
      if (!isOpen) {
        return;
      }

      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setIsOpen((value) => !value)}
        className="bell-button"
      >
        <svg className="bell-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
