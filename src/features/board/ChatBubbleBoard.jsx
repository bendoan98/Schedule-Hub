import { useRef, useState } from 'react';
import MessageBoard from './MessageBoard';
import useDismissibleLayer from '../../hooks/useDismissibleLayer';

export default function ChatBubbleBoard({ posts, currentUser, role, onAddPost }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const closeChat = () => setIsOpen(false);

  useDismissibleLayer({
    isOpen,
    containerRef,
    onDismiss: closeChat,
    closeOnEscape: true
  });

  return (
    <div className="chat-widget" ref={containerRef}>
      {isOpen ? (
        <section className="chat-window" role="dialog" aria-label="Team chat">
          <header className="chat-window-header">
            <h4>Team Chat</h4>
            <button type="button" onClick={closeChat} aria-label="Close chat">
              ×
            </button>
          </header>

          <MessageBoard posts={posts} currentUser={currentUser} role={role} onAddPost={onAddPost} embedded />
        </section>
      ) : null}

      <button
        type="button"
        className={`chat-bubble-button ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((value) => !value)}
        aria-label={isOpen ? 'Close team chat' : 'Open team chat'}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M4 4h16v11H8l-4 4V4Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M8 8h8M8 11h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
