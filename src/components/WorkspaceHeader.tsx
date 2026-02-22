interface WorkspaceHeaderProps {
  projectName: string;
  statusMessage: string;
  googleConnected: boolean;
  googleBusy: boolean;
  googleAuthError: string | null;
  googleStatus: string | null;
  backendStatus: string | null;
  canUploadCompetitors: boolean;
  onToggleGoogleConnection: () => void;
  onUploadCompetitors: () => void;
}

export function WorkspaceHeader({
  projectName,
  statusMessage,
  googleConnected,
  googleBusy,
  googleAuthError,
  googleStatus,
  backendStatus,
  canUploadCompetitors,
  onToggleGoogleConnection,
  onUploadCompetitors
}: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <div>
        <p className="eyebrow">Prototype UI</p>
        <h1>Sport Rank Prediction Game - {projectName}</h1>
        <p className="subtitle">
          Reorder competitors within each prediction pane and save predictions to the
          backend.
        </p>
      </div>
      <div className="workspace-actions">
        <div className="workspace-primary-actions">
          {canUploadCompetitors && (
            <button onClick={onUploadCompetitors} title="Upload competitor list JSON">
              Admin: Upload Competitors
            </button>
          )}
          <button
            className={googleConnected ? "google-connected" : "google-disconnected"}
            onClick={onToggleGoogleConnection}
            disabled={googleBusy}
          >
            {googleConnected ? "Disconnect Google" : "Login with Google"}
          </button>
        </div>
        <div className="workspace-status-lines">
          <span className="status-info">{statusMessage}</span>
          {googleAuthError && <span className="status-error">{googleAuthError}</span>}
          {googleStatus && <span className="status-info">{googleStatus}</span>}
          {backendStatus && <span className="status-info">{backendStatus}</span>}
        </div>
      </div>
    </header>
  );
}
