import { Link } from 'rehynav';
import { type Post, posts } from '../data';

/** Renders a feed of posts, each linking to a detail route under `basePath`. */
export function PostList({ basePath }: { basePath: string }) {
  return (
    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} basePath={basePath} />
      ))}
    </ul>
  );
}

function PostCard({ post, basePath }: { post: Post; basePath: string }) {
  return (
    <li
      style={{
        border: '1px solid #eee',
        borderRadius: 12,
        padding: 12,
        background: '#fff',
      }}
    >
      <strong>@{post.author}</strong>
      <span style={{ color: '#888', marginLeft: 8 }}>{post.timestamp}</span>
      <p style={{ margin: '8px 0' }}>{post.content}</p>
      <Link href={`${basePath}/post/${post.id}`} style={{ color: '#1d9bf0' }}>
        ♥ {post.likes} · View
      </Link>
    </li>
  );
}
