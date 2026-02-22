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

      <ol className="competitor-list">
        {prediction.competitorIds.map((competitorId, index) => {
          const competitor = competitorById.get(competitorId);
          if (!competitor) {
            return null;
          }

          return (
            <li className="competitor-row" key={`${prediction.id}-${competitorId}`}>
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
          );
        })}
      </ol>
    </article>
  );
}
