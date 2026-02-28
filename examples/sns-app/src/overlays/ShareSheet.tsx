import type { ScreenComponentProps } from 'rehynav';
import { useOverlay } from 'rehynav';

export function ShareSheet({ params }: ScreenComponentProps<{ postId: string; title: string }>) {
  const overlay = useOverlay();

  const handleShare = (method: string) => {
    alert(`Shared post #${params.postId} via ${method}`);
    overlay.close();
  };

  return (
    <div className="sheet-backdrop">
      <div className="sheet-content">
        <div className="sheet-handle" />
        <h2>Share</h2>
        <p className="sheet-preview">"{params.title}"</p>

        <div className="share-options">
          <button type="button" onClick={() => handleShare('Copy Link')}>
            Copy Link
          </button>
          <button type="button" onClick={() => handleShare('Twitter')}>
            Twitter
          </button>
          <button type="button" onClick={() => handleShare('Message')}>
            Message
          </button>
        </div>

        <button type="button" className="sheet-close" onClick={() => overlay.close()}>
          Close
        </button>
      </div>
    </div>
  );
}
