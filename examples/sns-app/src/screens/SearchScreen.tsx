import { useRef, useState } from 'react';
import { Link, useIsFocused, useScrollRestoration } from 'rehynav';
import { posts } from '../data';

export function SearchScreen() {
  const [query, setQuery] = useState('');

  // useIsFocused — boolean indicating if this screen is currently focused
  const isFocused = useIsFocused();

  // useScrollRestoration — preserves scroll position
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollRestoration(scrollRef);

  const filtered = query
    ? posts.filter(
        (p) =>
          p.content.toLowerCase().includes(query.toLowerCase()) ||
          p.author.toLowerCase().includes(query.toLowerCase()),
      )
    : posts;

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Search {isFocused ? '' : '(inactive)'}</h1>
      </header>

      <input
        type="text"
        className="search-input"
        placeholder="Search posts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <ul className="post-list" ref={scrollRef} style={{ overflow: 'auto', flex: 1 }}>
        {filtered.map((post) => (
          <li key={post.id} className="post-card">
            {/* Same PostDetailScreen, but under search tab's stack */}
            <Link to={`/search/post-detail/${post.id}`}>
              <strong>@{post.author}</strong>
              <p>{post.content}</p>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && <li className="empty">No results</li>}
      </ul>
    </div>
  );
}
