import { useOverlay } from 'rehynav';

export function ConfirmOverlay() {
  const overlay = useOverlay();

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Confirm Overlay</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
          This is a test overlay. Verify that goBack() closes this before popping the stack.
        </p>
        <div className="info-row">
          <span className="info-label">Overlay open</span>
          <span className="info-value">{overlay.isOpen ? 'Yes' : 'No'}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Current</span>
          <span className="info-value">{overlay.current ?? 'none'}</span>
        </div>
        <div className="action-list" style={{ marginTop: 12 }}>
          <button type="button" className="btn" onClick={() => overlay.close()}>
            overlay.close()
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => overlay.open('detail-overlay', { title: 'From Confirm' })}
          >
            Stack another overlay
          </button>
        </div>
      </div>
    </div>
  );
}
