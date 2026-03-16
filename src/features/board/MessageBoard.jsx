import { useEffect, useMemo, useRef, useState } from 'react';

export default function MessageBoard({ posts, currentUser, role, onAddPost, embedded = false }) {
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState('comment');
  const streamRef = useRef(null);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
  }, [posts]);

  const latestAnnouncement = useMemo(() => {
    const announcements = sortedPosts.filter((post) => post.kind === 'announcement');
    return announcements.length > 0 ? announcements[announcements.length - 1] : null;
  }, [sortedPosts]);

  const streamPosts = useMemo(
    () => sortedPosts.filter((post) => post.kind !== 'announcement'),
    [sortedPosts]
  );

  useEffect(() => {
    if (!streamRef.current) {
      return;
    }

    streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [streamPosts.length]);

  function handleSubmit(event) {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    onAddPost({
      message: message.trim(),
      kind: role === 'manager' ? kind : 'comment',
      authorId: currentUser.id,
      authorName: currentUser.name
    });

    setMessage('');
  }

  function handleKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    handleSubmit(event);
  }

  return (
    <section className={`board-panel ${embedded ? 'board-panel-embedded' : 'panel'}`}>
      {!embedded ? <h3>Message Board</h3> : null}

      <div className="chat-content-stack">
        {latestAnnouncement ? (
          <section className="chat-pinned-announcement" aria-live="polite">
            <small className="chat-pinned-label">Pinned Announcement</small>
            <div className="chat-pinned-meta">
              <strong>{latestAnnouncement.authorId === currentUser.id ? 'You' : latestAnnouncement.authorName}</strong>
              <small>{new Date(latestAnnouncement.createdAt).toLocaleString()}</small>
            </div>
            <p>{latestAnnouncement.message}</p>
          </section>
        ) : null}

        <div className="chat-stream" ref={streamRef}>
          {streamPosts.length === 0 ? <p className="chat-empty">No messages yet.</p> : null}

          {streamPosts.map((post) => {
            const isSelf = post.authorId === currentUser.id;

            return (
              <article
                key={post.id}
                className={`chat-message ${isSelf ? 'self' : 'other'} ${
                  post.kind === 'announcement' ? 'announcement' : 'comment'
                }`}
              >
                <div className="chat-meta">
                  <strong>{isSelf ? 'You' : post.authorName}</strong>
                  <small>{new Date(post.createdAt).toLocaleString()}</small>
                </div>
                <p className="chat-bubble">{post.message}</p>
              </article>
            );
          })}
        </div>
      </div>

      <form className="chat-composer" onSubmit={handleSubmit}>
        {role === 'manager' ? (
          <div className="chat-kind-toggle" role="tablist" aria-label="Message type">
            <button
              type="button"
              className={kind === 'comment' ? 'active' : ''}
              onClick={() => setKind('comment')}
            >
              Message
            </button>
            <button
              type="button"
              className={kind === 'announcement' ? 'active' : ''}
              onClick={() => setKind('announcement')}
            >
              Announcement
            </button>
          </div>
        ) : null}

        <div className="chat-input-row">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={2}
          />

          <button type="submit" className="primary chat-send-btn">
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
