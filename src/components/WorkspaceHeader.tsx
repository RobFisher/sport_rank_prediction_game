interface WorkspaceHeaderProps {
  projectName: string;
  statusMessage: string;
  canAddPane: boolean;
  googleConnected: boolean;
  googleBusy: boolean;
  googleAuthError: string | null;
  googleStatus: string | null;
  backendStatus: string | null;
  canUploadCompetitors: boolean;
  canCreateGame: boolean;
  onNewPrediction: () => void;
  onLoadSample: () => void;
  onToggleGoogleConnection: () => void;
  onUploadCompetitors: () => void;
  onCreateGame: () => void;
}

export function WorkspaceHeader({
  projectName,
  statusMessage,
  canAddPane,
  googleConnected,
  googleBusy,
  googleAuthError,
  googleStatus,
  backendStatus,
  canUploadCompetitors,
  canCreateGame,
  onNewPrediction,
  onLoadSample,
  onToggleGoogleConnection,
  onUploadCompetitors,
  onCreateGame
}: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <div>
        <p className="eyebrow">Prototype UI</p>
        <h1>Sport Rank Prediction Game - {projectName}</h1>
        <p className="subtitle">
          Reorder competitors within each prediction pane. Backend connections are
          placeholders for now.
        </p>
      </div>
      <div className="workspace-actions">
        <div className="workspace-primary-actions">
          <button onClick={onNewPrediction} disabled={!canAddPane}>
            New Prediction
          </button>
          <button onClick={onLoadSample}>Reload Sample Data</button>
          {canUploadCompetitors && (
            <button onClick={onUploadCompetitors} title="Upload competitor list JSON">
              Admin: Upload Competitors
            </button>
          )}
          {canCreateGame && (
            <button onClick={onCreateGame} title="Create a new game">
              Admin: Create Game
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
