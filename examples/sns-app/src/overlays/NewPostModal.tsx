import { useCallback, useState } from 'react';
import { useBeforeNavigate, useOverlay } from 'rehynav';

export function NewPostModal() {
  const overlay = useOverlay();
  const [text, setText] = useState('');

  // useBeforeNavigate — prevent navigation when there are unsaved changes.
  // Return false to block, true to allow.
  useBeforeNavigate(
    useCallback(
      (_from, _to, _direction) => {
        if (text.length > 0) {
          return window.confirm('You have unsaved changes. Discard and leave?');
        }
        return true;
      },
      [text],
    ),
  );

  const handleSubmit = () => {
    alert(`Post created: "${text}"`);
    setText('');
    overlay.close();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <header className="screen-header">
          <button type="button" onClick={() => overlay.close()}>
            Cancel
          </button>
          <h1>New Post</h1>
          <button type="button" disabled={text.length === 0} onClick={handleSubmit}>
            Post
          </button>
        </header>

        <textarea
          className="post-input"
          placeholder="What's on your mind?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
        />
      </div>
    </div>
  );
}
