import { useState } from "react";
import type { Game, Prediction } from "../predictionModel.js";

interface GamePredictionsPaneProps {
  game: Game;
  predictions: Prediction[];
  scoresByPredictionId: Map<string, number | null>;
  currentUserId: string | null;
  canShowPredictions: boolean;
  isLoading: boolean;
  canCreatePrediction: boolean;
  canSetResults: boolean;
  canViewResults: boolean;
  onCreatePrediction: () => void;
  onSetResults: () => void;
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
  scoresByPredictionId,
  currentUserId,
  canShowPredictions,
  isLoading,
  canCreatePrediction,
  canSetResults,
  canViewResults,
  onCreatePrediction,
  onSetResults,
  onOpenPrediction,
  onClosePane,
  paneCount
}: GamePredictionsPaneProps) {
  const [onlyMyPredictions, setOnlyMyPredictions] = useState(false);
  const visiblePredictions = onlyMyPredictions
    ? predictions.filter((prediction) => prediction.ownerUserId === currentUserId)
    : predictions;
  const sorted = [...visiblePredictions].sort((leftPrediction, rightPrediction) => {
    const leftScore = scoresByPredictionId.get(leftPrediction.id) ?? null;
    const rightScore = scoresByPredictionId.get(rightPrediction.id) ?? null;

    if (leftScore !== null && rightScore !== null) {
      if (leftScore !== rightScore) {
        return leftScore - rightScore;
      }
      return rightPrediction.createdAt.localeCompare(leftPrediction.createdAt);
    }
    if (leftScore === null && rightScore === null) {
      return rightPrediction.createdAt.localeCompare(leftPrediction.createdAt);
    }
    return leftScore === null ? 1 : -1;
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
        {(canSetResults || canViewResults) && (
          <button className="pane-export" onClick={onSetResults}>
            {canSetResults ? "Admin: Set Results" : "View Results"}
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
        ) : (
          <>
            <p className="pane-meta">
              Competition entries can be edited until the closing time.
            </p>
            {currentUserId && (
              <label className="pane-filter-toggle">
                <input
                  type="checkbox"
                  checked={onlyMyPredictions}
                  onChange={(event) => setOnlyMyPredictions(event.target.checked)}
                />
                Only my predictions
              </label>
            )}
            {sorted.length === 0 ? (
              <p className="empty-state">
                {onlyMyPredictions
                  ? "No predictions found for your account."
                  : "No predictions yet."}
              </p>
            ) : (
              <ul className="prediction-list">
                {sorted.map((prediction) => {
                  const score = scoresByPredictionId.get(prediction.id) ?? null;
                  const scoreLabel = score === null ? "" : ` • ${score} pts`;
                  return (
                    <li key={prediction.id} className="prediction-row">
                    <button type="button" onClick={() => onOpenPrediction(prediction.id)}>
                      <div className="prediction-copy">
                        <strong>{predictionLabel(prediction)}</strong>
                        <span>{prediction.ownerDisplayName ?? "Anonymous"}</span>
                      </div>
                      <span className="prediction-meta">
                        {prediction.type === "competition" ? "Competition" : "Fun"}
                        {scoreLabel}
                      </span>
                    </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </article>
  );
}
