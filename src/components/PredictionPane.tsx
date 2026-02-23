import { Fragment, useState } from "react";
import type { CompetitorList, Game, Prediction } from "../predictionModel.js";

interface PredictionPaneProps {
  paneIndex: number;
  paneCount: number;
  prediction: Prediction;
  game: Game;
  competitorList: CompetitorList;
  onMoveCompetitor: (predictionId: string, fromIndex: number, toIndex: number) => void;
  onSavePrediction: (predictionId: string) => void;
  onDeletePrediction?: (predictionId: string) => void;
  onRemovePane: (paneIndex: number) => void;
  saveDisabled?: boolean;
  saveLabel?: string;
  deleteDisabled?: boolean;
  hasUnsavedChanges?: boolean;
}

export function PredictionPane({
  paneIndex,
  paneCount,
  prediction,
  game,
  competitorList,
  onMoveCompetitor,
  onSavePrediction,
  onDeletePrediction,
  onRemovePane,
  saveDisabled,
  saveLabel,
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
          {saveLabel ?? "Save"}
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
                  className="competitor-row"
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
