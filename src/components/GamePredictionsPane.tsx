import type { Game, Prediction } from "../predictionModel.js";

interface GamePredictionsPaneProps {
  game: Game;
  predictions: Prediction[];
  canShowPredictions: boolean;
  isLoading: boolean;
  canCreatePrediction: boolean;
  onCreatePrediction: () => void;
  onOpenPrediction: (predictionId: string) => void;
  onClosePane: () => void;
  paneCount: number;
}

function predictionLabel(prediction: Prediction): string {
  if (prediction.type === "competition") {
    return "Competition";
  }
  const trimmed = prediction.name.trim();
  return trimmed.length > 0 ? trimmed : "Fun prediction";
}

export function GamePredictionsPane({
  game,
  predictions,
  canShowPredictions,
  isLoading,
  canCreatePrediction,
  onCreatePrediction,
  onOpenPrediction,
  onClosePane,
  paneCount
}: GamePredictionsPaneProps) {
  const sorted = [...predictions].sort((a, b) => {
    const left = a.updatedAt ?? a.createdAt;
    const right = b.updatedAt ?? b.createdAt;
    return right.localeCompare(left);
  });

  return (
    <article className="pane">
      <header className="pane-header">
        <div className="pane-title">
          <strong>{game.name}</strong>
          <span className="pane-meta">
            Predictions • closes {new Date(game.closesAt).toLocaleString()}
          </span>
        </div>
        {canCreatePrediction && (
          <button className="pane-export" onClick={onCreatePrediction}>
            New Prediction
          </button>
        )}
        <button
          className="pane-close"
          onClick={onClosePane}
          disabled={paneCount <= 1}
          title="Remove pane"
          aria-label="Close pane"
        >
          &times;
        </button>
      </header>
      <div className="pane-body">
        {!canShowPredictions ? (
          <p className="empty-state">Sign in to view predictions.</p>
        ) : isLoading ? (
          <p className="empty-state">Loading predictions...</p>
        ) : sorted.length === 0 ? (
          <p className="empty-state">No predictions yet.</p>
        ) : (
          <>
            <p className="pane-meta">
              Competition entries can be edited until the closing time.
            </p>
            <ul className="prediction-list">
              {sorted.map((prediction) => (
                <li key={prediction.id} className="prediction-row">
                  <button type="button" onClick={() => onOpenPrediction(prediction.id)}>
                    <div className="prediction-copy">
                      <strong>{predictionLabel(prediction)}</strong>
                      <span>{prediction.ownerDisplayName ?? "Anonymous"}</span>
                    </div>
                    <span className="prediction-meta">
                      {prediction.type === "competition" ? "Competition" : "Fun"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </article>
  );
}
