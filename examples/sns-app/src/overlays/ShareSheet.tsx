import type { ScreenComponentProps } from 'rehynav';
import { useSheet } from 'rehynav';

export function ShareSheet({ params }: ScreenComponentProps<{ postId: string; title: string }>) {
  const sheet = useSheet();

  const handleShare = (method: string) => {
    alert(`Shared post #${params.postId} via ${method}`);
    sheet.close();
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

        <button type="button" className="sheet-close" onClick={() => sheet.close()}>
          Close
        </button>
      </div>
    </div>
  );
}
