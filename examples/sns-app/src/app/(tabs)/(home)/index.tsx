import { useRouter } from 'rehynav';
import { PostList } from '../../../components/PostList';

export default function HomeFeed() {
  const router = useRouter();
  return (
    <div className="screen">
      <button type="button" onClick={() => router.push('/new-post')} style={{ marginBottom: 16 }}>
        ✏️ New post
      </button>
      <PostList basePath="" />
    </div>
  );
}
