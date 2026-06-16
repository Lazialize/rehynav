import { useState } from 'react';
import { useRouter } from 'rehynav';

export default function NewPostScreen() {
  const router = useRouter();
  const [text, setText] = useState('');

  return (
    <div className="screen">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's happening?"
        rows={5}
        style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
      />
      <button
        type="button"
        disabled={!text.trim()}
        onClick={() => router.back()}
        style={{ marginTop: 12 }}
      >
        Post
      </button>
    </div>
  );
}
