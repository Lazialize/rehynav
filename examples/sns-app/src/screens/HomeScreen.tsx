import { Link, useModal } from 'rehynav';
import { posts } from '../data';

export function HomeScreen() {
  // useModal — open overlays imperatively
  const modal = useModal();

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Home</h1>
        <button type="button" className="fab" onClick={() => modal.open('new-post')}>
          + New Post
        </button>
      </header>

      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.id} className="post-card">
            {/* Link — declarative, type-safe navigation */}
            <Link to="home/post-detail/:postId" params={{ postId: post.id }}>
              <strong>@{post.author}</strong>
              <p>{post.content}</p>
              <span className="post-meta">
                {post.likes} likes · {post.timestamp}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
