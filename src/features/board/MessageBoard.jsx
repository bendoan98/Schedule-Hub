import { useState } from 'react';

export default function MessageBoard({ posts, currentUser, role, onAddPost, embedded = false }) {
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState('announcement');

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

  return (
    <section className={`board-panel ${embedded ? 'board-panel-embedded' : 'panel'}`}>
      {!embedded ? <h3>Message Board</h3> : null}

      <form className="board-form" onSubmit={handleSubmit}>
        {role === 'manager' ? (
          <label>
            Post Type
            <select value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="announcement">Announcement</option>
              <option value="comment">Comment</option>
            </select>
          </label>
        ) : null}

        <label>
          Message
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Share an update with the team"
            rows={3}
          />
        </label>

        <button type="submit" className="primary">
          Post
        </button>
      </form>

      <div className="board-list">
        {posts.map((post) => (
          <article key={post.id} className="board-post">
            <p className={`post-kind kind-${post.kind}`}>{post.kind.toUpperCase()}</p>
            <h4>{post.authorName}</h4>
            <p>{post.message}</p>
            <small>{new Date(post.createdAt).toLocaleString()}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
