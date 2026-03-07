import { Fragment, useState } from "react";
import {
  calculatePredictionScoreContributions,
  type CompetitorList,
  type Game,
  type Prediction
} from "../predictionModel.js";

interface PredictionPaneProps {
  paneIndex: number;
  paneCount: number;
  prediction: Prediction;
  game: Game;
  score: number | null;
  competitorList: CompetitorList;
  onMoveCompetitor: (predictionId: string, fromIndex: number, toIndex: number) => void;
  onSavePrediction: (predictionId: string) => void;
  onSaveAsPrediction: (predictionId: string) => void;
  onDeletePrediction?: (predictionId: string) => void;
  onRemovePane: (paneIndex: number) => void;
  saveDisabled?: boolean;
  saveAsDisabled?: boolean;
  deleteDisabled?: boolean;
  hasUnsavedChanges?: boolean;
}

export function PredictionPane({
  paneIndex,
  paneCount,
  prediction,
  game,
  score,
  competitorList,
  onMoveCompetitor,
  onSavePrediction,
  onSaveAsPrediction,
  onDeletePrediction,
  onRemovePane,
  saveDisabled,
  saveAsDisabled,
  deleteDisabled,
  hasUnsavedChanges
}: PredictionPaneProps) {
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const competitorById = new Map(
    competitorList.competitors.map((competitor) => [competitor.id, competitor])
  );
  const title = prediction.type === "competition" ? "Competition entry" : "Fun entry";
  const subtitle =
    prediction.type === "fun"
      ? prediction.name.trim().length > 0
        ? prediction.name
        : "Untitled fun prediction"
      : "Single-entry competition prediction";
  const ownerLabel = prediction.ownerDisplayName ?? prediction.ownerUserId ?? "";
  const scoreContributions = calculatePredictionScoreContributions(
    prediction.competitorIds,
    game.results
  );
  const scoreContributionByCompetitorId = new Map(
    (scoreContributions ?? []).map((contribution) => [contribution.competitorId, contribution])
  );

  function commitDragDrop(fromIndex: number, rawToIndex: number): void {
    const adjustedToIndex = fromIndex < rawToIndex ? rawToIndex - 1 : rawToIndex;
    if (fromIndex !== adjustedToIndex) {
      onMoveCompetitor(prediction.id, fromIndex, adjustedToIndex);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>): void {
    if (dragFromIndex === null || dragOverIndex === null) {
      return;
    }
    event.preventDefault();
    const fromIndex = dragFromIndex ?? Number(event.dataTransfer.getData("text/plain"));
    if (!Number.isNaN(fromIndex)) {
      commitDragDrop(fromIndex, dragOverIndex);
    }
    setDragFromIndex(null);
    setDragOverIndex(null);
  }

  return (
    <article
      className={`pane ${hasUnsavedChanges ? "pane-dirty" : ""}`}
      onDrop={handleDrop}
      onDragOver={(event) => {
        if (dragFromIndex === null) {
          return;
        }
        event.preventDefault();
      }}
    >
      <header className="pane-header">
        <div className="pane-title">
          <strong>{game.name}</strong>
          <span className="pane-meta">
            {title} • closes {new Date(game.closesAt).toLocaleString()}
          </span>
          <span className="pane-meta">
            Score: {score === null ? "No score yet" : `${score} pts`}
          </span>
          <span className="pane-meta">{subtitle}</span>
          {ownerLabel ? (
            <span className="pane-meta">By {ownerLabel}</span>
          ) : null}
        </div>
        <button
          className="pane-export"
          onClick={() => onSavePrediction(prediction.id)}
          disabled={saveDisabled}
        >
          Save
        </button>
        <button
          className="pane-export"
          onClick={() => onSaveAsPrediction(prediction.id)}
          disabled={saveAsDisabled}
        >
          Save As
        </button>
        {onDeletePrediction ? (
          <button
            className="pane-delete"
            onClick={() => onDeletePrediction(prediction.id)}
            disabled={deleteDisabled}
          >
            Delete
          </button>
        ) : null}
        <button
          className="pane-close"
          onClick={() => onRemovePane(paneIndex)}
          disabled={paneCount <= 1}
          title="Remove pane"
          aria-label="Close pane"
        >
          ×
        </button>
      </header>

      <div className="pane-body">
        <ol className="competitor-list">
          {prediction.competitorIds.map((competitorId, index) => {
            const competitor = competitorById.get(competitorId);
            const scoreContribution = scoreContributionByCompetitorId.get(competitorId) ?? null;
            if (!competitor) {
              return null;
            }

            return (
              <Fragment key={`${prediction.id}-${competitorId}`}>
                <li
                  className={`competitor-drop-slot ${
                    dragFromIndex !== null && dragOverIndex === index
                      ? "competitor-drop-slot-active"
                      : ""
                  }`}
                  onDragOver={(event) => {
                    if (dragFromIndex === null) {
                      return;
                    }
                    event.preventDefault();
                    setDragOverIndex(index);
                  }}
                />
                <li
                  className={`competitor-row ${
                    scoreContribution?.direction === "exact" ? "competitor-row-exact" : ""
                  }`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(index));
                    setDragFromIndex(index);
                  }}
                  onDragOver={(event) => {
                    if (dragFromIndex === null) {
                      return;
                    }
                    event.preventDefault();
                  }}
                  onDragEnd={() => {
                    setDragFromIndex(null);
                    setDragOverIndex(null);
                  }}
                >
                  <span
                    className="competitor-color"
                    style={{ backgroundColor: competitor.color ?? "#e7edf7" }}
                    aria-hidden="true"
                  />
                  <span className="competitor-rank">{index + 1}</span>
                  <div className="competitor-copy">
                    <strong>{competitor.name}</strong>
                    <span>
                      {competitor.subtitle ?? "Independent"}{" "}
                      {competitor.number ? `#${competitor.number}` : ""}
                    </span>
                  </div>
                  {scoreContribution ? (
                    <span
                      className={`competitor-score-chip competitor-score-chip-${scoreContribution.direction}`}
                      title={`Predicted ${scoreContribution.predictedPosition}, finished ${scoreContribution.actualPosition}`}
                    >
                      {scoreContribution.direction === "exact"
                        ? "Exact"
                        : `${scoreContribution.direction === "down" ? "↓" : "↑"} ${scoreContribution.scoreDelta}`}
                    </span>
                  ) : null}
                  <div className="competitor-actions">
                    <button
                      onClick={() => onMoveCompetitor(prediction.id, index, index - 1)}
                      disabled={index === 0}
                      aria-label={`Move ${competitor.name} up`}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => onMoveCompetitor(prediction.id, index, index + 1)}
                      disabled={index === prediction.competitorIds.length - 1}
                      aria-label={`Move ${competitor.name} down`}
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                </li>
              </Fragment>
            );
          })}
          <li
            className={`competitor-drop-slot ${
              dragFromIndex !== null && dragOverIndex === prediction.competitorIds.length
                ? "competitor-drop-slot-active"
                : ""
            }`}
            onDragOver={(event) => {
              if (dragFromIndex === null) {
                return;
              }
              event.preventDefault();
              setDragOverIndex(prediction.competitorIds.length);
            }}
          />
        </ol>
      </div>
    </article>
  );
}
