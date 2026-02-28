import { useState } from 'react';
import { Link } from 'rehynav';
import { posts } from '../data';

export function SearchScreen() {
  const [query, setQuery] = useState('');

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
        <h1>Search</h1>
      </header>

      <input
        type="text"
        className="search-input"
        placeholder="Search posts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <ul className="post-list">
        {filtered.map((post) => (
          <li key={post.id} className="post-card">
            {/* Same PostDetailScreen, but under search tab's stack */}
            <Link to="search/post-detail" params={{ postId: post.id }}>
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
