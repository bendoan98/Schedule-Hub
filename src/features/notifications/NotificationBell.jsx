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
