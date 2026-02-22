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
  onRemovePane: (paneIndex: number) => void;
}

export function PredictionPane({
  paneIndex,
  paneCount,
  prediction,
  game,
  competitorList,
  onMoveCompetitor,
  onSavePrediction,
  onRemovePane
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

  return (
    <article className="pane">
      <header className="pane-header">
        <div className="pane-title">
          <strong>{game.name}</strong>
          <span className="pane-meta">
            {title} • closes {new Date(game.closesAt).toLocaleString()}
          </span>
          <span className="pane-meta">{subtitle}</span>
        </div>
        <button className="pane-export" onClick={() => onSavePrediction(prediction.id)}>
          Save
        </button>
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
                  onDrop={(event) => {
                    if (dragFromIndex === null) {
                      return;
                    }
                    event.preventDefault();
                    const fromIndex =
                      dragFromIndex ?? Number(event.dataTransfer.getData("text/plain"));
                    if (!Number.isNaN(fromIndex) && fromIndex !== index) {
                      onMoveCompetitor(prediction.id, fromIndex, index);
                    }
                    setDragFromIndex(null);
                    setDragOverIndex(null);
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
                    const rect = event.currentTarget.getBoundingClientRect();
                    const nextIndex =
                      event.clientY < rect.top + rect.height / 2 ? index : index + 1;
                    setDragOverIndex(nextIndex);
                  }}
                  onDrop={(event) => {
                    if (dragFromIndex === null) {
                      return;
                    }
                    event.preventDefault();
                    const fromIndex =
                      dragFromIndex ?? Number(event.dataTransfer.getData("text/plain"));
                    const toIndex = dragOverIndex ?? index;
                    if (!Number.isNaN(fromIndex) && fromIndex !== toIndex) {
                      onMoveCompetitor(prediction.id, fromIndex, toIndex);
                    }
                    setDragFromIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragFromIndex(null);
                    setDragOverIndex(null);
                  }}
                >
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
            onDrop={(event) => {
              if (dragFromIndex === null) {
                return;
              }
              event.preventDefault();
              const fromIndex =
                dragFromIndex ?? Number(event.dataTransfer.getData("text/plain"));
              if (
                !Number.isNaN(fromIndex) &&
                fromIndex !== prediction.competitorIds.length
              ) {
                onMoveCompetitor(prediction.id, fromIndex, prediction.competitorIds.length);
              }
              setDragFromIndex(null);
              setDragOverIndex(null);
            }}
          />
        </ol>
      </div>
    </article>
  );
}
