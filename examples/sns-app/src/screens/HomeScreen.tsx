import { useRef } from 'react';
import { Link, useNavigation, useOverlay, useScrollRestoration } from 'rehynav';
import { posts } from '../data';

export function HomeScreen() {
  // useOverlay — open overlays imperatively
  const overlay = useOverlay();
  const navigation = useNavigation();

  // useScrollRestoration — preserves scroll position across tab switches and overlay open/close
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollRestoration(scrollRef);

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Home</h1>
        <button type="button" className="fab" onClick={() => overlay.open('new-post')}>
          + New Post
        </button>
      </header>

      <ul className="post-list" ref={scrollRef} style={{ overflow: 'auto', flex: 1 }}>
        {posts.map((post) => (
          <li key={post.id} className="post-card">
            {/* Link — declarative, type-safe navigation */}
            {/* preload — pre-render the detail screen on touch start for instant navigation */}
            <Link
              to={`/home/post-detail/${post.id}`}
              onTouchStart={() => navigation.preload(`/home/post-detail/${post.id}`)}
            >
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
