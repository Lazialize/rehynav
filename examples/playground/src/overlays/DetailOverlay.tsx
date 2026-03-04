import type { ScreenComponentProps } from 'rehynav';
import { useOverlay } from 'rehynav';

export function DetailOverlay({ params }: ScreenComponentProps<{ title?: string }>) {
  const overlay = useOverlay();

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>
          Detail Overlay: {params.title ?? 'Untitled'}
        </h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
          Params received: <code>{JSON.stringify(params)}</code>
        </p>
        <div className="action-list">
          <button type="button" className="btn" onClick={() => overlay.close()}>
            overlay.close()
          </button>
          <button type="button" className="btn" onClick={() => overlay.close('detail-overlay')}>
            overlay.close('detail-overlay')
          </button>
        </div>
      </div>
    </div>
  );
}
