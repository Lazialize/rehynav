import { useLocalSearchParams, useRouter } from 'rehynav';
import { getPost } from '../data';

/** Shared post-detail screen body, reused by each tab's own stack. */
export function PostDetailView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const post = getPost(id);

  if (!post) {
    return (
      <div className="screen">
        <p>Post not found.</p>
        <button type="button" onClick={() => router.back()}>
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2>@{post.author}</h2>
      <p style={{ color: '#888' }}>{post.timestamp}</p>
      <p style={{ fontSize: 18, margin: '16px 0' }}>{post.content}</p>
      <p>♥ {post.likes} likes</p>
    </div>
  );
}
