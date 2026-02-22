interface WorkspaceHeaderProps {
  projectName: string;
  statusMessage: string;
  canAddPane: boolean;
  onNewPrediction: () => void;
  onLoadSample: () => void;
}

export function WorkspaceHeader({
  projectName,
  statusMessage,
  canAddPane,
  onNewPrediction,
  onLoadSample
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
          <button disabled title="Admin upload via JSON will be added later">
            Admin: Upload JSON
          </button>
        </div>
        <div className="workspace-status-lines">
          <span className="status-info">{statusMessage}</span>
        </div>
      </div>
    </header>
  );
}
