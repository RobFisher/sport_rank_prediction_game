import { Fragment, useEffect, useMemo, useState } from "react";
import { moveCompetitor, type CompetitorList, type Game } from "../predictionModel.js";

interface ResultsPaneProps {
  paneIndex: number;
  paneCount: number;
  game: Game;
  competitorList: CompetitorList;
  initialCompetitorIds: string[];
  onSaveResults: (gameId: string, competitorIds: string[]) => void;
  onRemovePane: (paneIndex: number) => void;
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

export function ResultsPane({
  paneIndex,
  paneCount,
  game,
  competitorList,
  initialCompetitorIds,
  onSaveResults,
  onRemovePane
}: ResultsPaneProps) {
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [competitorIds, setCompetitorIds] = useState<string[]>(initialCompetitorIds);
  const initialSignature = initialCompetitorIds.join("|");

  useEffect(() => {
    setCompetitorIds(initialCompetitorIds);
  }, [game.id, initialSignature]);

  const hasUnsavedChanges = !areStringArraysEqual(competitorIds, initialCompetitorIds);
  const competitorById = useMemo(
    () => new Map(competitorList.competitors.map((competitor) => [competitor.id, competitor])),
    [competitorList.competitors]
  );

  function commitDragDrop(fromIndex: number, rawToIndex: number): void {
    const adjustedToIndex = fromIndex < rawToIndex ? rawToIndex - 1 : rawToIndex;
    if (fromIndex !== adjustedToIndex) {
      setCompetitorIds((current) => moveCompetitor(current, fromIndex, adjustedToIndex));
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
            Official results • closes {new Date(game.closesAt).toLocaleString()}
          </span>
          <span className="pane-meta">
            {game.results?.length ? "Saved results loaded." : "No saved results yet."}
          </span>
        </div>
        <button
          className="pane-export"
          onClick={() => onSaveResults(game.id, competitorIds)}
          disabled={!hasUnsavedChanges}
        >
          Save Results
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
          {competitorIds.map((competitorId, index) => {
            const competitor = competitorById.get(competitorId);
            if (!competitor) {
              return null;
            }
            return (
              <Fragment key={`${game.id}-result-${competitorId}`}>
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
                      onClick={() =>
                        setCompetitorIds((current) => moveCompetitor(current, index, index - 1))
                      }
                      disabled={index === 0}
                      aria-label={`Move ${competitor.name} up`}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() =>
                        setCompetitorIds((current) => moveCompetitor(current, index, index + 1))
                      }
                      disabled={index === competitorIds.length - 1}
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
              dragFromIndex !== null && dragOverIndex === competitorIds.length
                ? "competitor-drop-slot-active"
                : ""
            }`}
            onDragOver={(event) => {
              if (dragFromIndex === null) {
                return;
              }
              event.preventDefault();
              setDragOverIndex(competitorIds.length);
            }}
          />
        </ol>
      </div>
    </article>
  );
}
