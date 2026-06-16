import { useState } from 'react';
import { PostList } from '../../../components/PostList';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  return (
    <div className="screen">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search posts"
        style={{
          width: '100%',
          padding: 8,
          borderRadius: 8,
          border: '1px solid #ccc',
          marginBottom: 16,
        }}
      />
      {/* Detail links stay within the search tab's own stack at /search/post/:id. */}
      <PostList basePath="/search" />
    </div>
  );
}
