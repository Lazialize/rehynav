import type { ScreenComponentProps } from 'rehynav';
import { useNavigation, useSheet } from 'rehynav';
import { getPost } from '../data';

// ScreenComponentProps gives you typed `params` based on route definition
export function PostDetailScreen({ params }: ScreenComponentProps<{ postId: string }>) {
  const navigation = useNavigation();
  const sheet = useSheet();
  const post = getPost(params.postId);

  if (!post) {
    return <div className="screen">Post not found</div>;
  }

  return (
    <div className="screen">
      <header className="screen-header">
        {/* goBack — smart back: closes overlay → pops stack → switches tab */}
        <button type="button" onClick={() => navigation.goBack()}>
          ← Back
        </button>
        <h1>Post</h1>
      </header>

      <article className="post-detail">
        <h2>@{post.author}</h2>
        <p>{post.content}</p>
        <div className="post-meta">
          {post.likes} likes · {post.timestamp}
        </div>

        {/* useSheet — open a bottom sheet overlay */}
        <button
          type="button"
          className="share-button"
          onClick={() => sheet.open('share', { postId: post.id, title: post.content })}
        >
          Share
        </button>
      </article>
    </div>
  );
}
