import { useCallback } from 'react';
import type { ScreenComponentProps } from 'rehynav';
import { useNavigation, useOverlay } from 'rehynav';
import { useFocusEffect } from '../App';
import { getPost } from '../data';

// ScreenComponentProps gives you typed `params` based on route definition
export function PostDetailScreen({ params }: ScreenComponentProps<{ postId: string }>) {
  const navigation = useNavigation();
  const overlay = useOverlay();
  const post = getPost(params.postId);

  // useFocusEffect — runs when screen gains focus, cleanup on blur.
  // Useful for analytics, data refresh, pausing/resuming subscriptions, etc.
  useFocusEffect(
    useCallback(() => {
      console.log(`[PostDetail] Focused: viewing post ${params.postId}`);
      return () => {
        console.log(`[PostDetail] Blurred: leaving post ${params.postId}`);
      };
    }, [params.postId]),
  );

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

        {/* useOverlay — open an overlay */}
        <button
          type="button"
          className="share-button"
          onClick={() => overlay.open('share', { postId: post.id, title: post.content })}
        >
          Share
        </button>
      </article>
    </div>
  );
}
