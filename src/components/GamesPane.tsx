import { isCompetitionClosedByTime, type Game } from "../predictionModel.js";

interface GamesPaneProps {
  games: Game[];
  predictionsLoaded: boolean;
  predictionCountsByGameId: Map<string, number>;
  canCreateGame: boolean;
  onCreateGame: () => void;
  canDeleteGame: boolean;
  onDeleteGame: (gameId: string) => void;
  onOpenGame: (gameId: string) => void;
}

export function GamesPane({
  games,
  predictionsLoaded,
  predictionCountsByGameId,
  canCreateGame,
  onCreateGame,
  canDeleteGame,
  onDeleteGame,
  onOpenGame
}: GamesPaneProps) {
  const openGames = games
    .filter((game) => !isCompetitionClosedByTime(game.closesAt))
    .sort((left, right) => left.closesAt.localeCompare(right.closesAt));
  const closedGames = games
    .filter((game) => isCompetitionClosedByTime(game.closesAt))
    .sort((left, right) => right.closesAt.localeCompare(left.closesAt));

  function renderGameRow(game: Game) {
    const count = predictionCountsByGameId.get(game.id);
    const closeLabel = isCompetitionClosedByTime(game.closesAt) ? "Closed" : "Closes";
    return (
      <li key={game.id} className="game-row">
        <button
          type="button"
          className="game-open"
          onClick={() => onOpenGame(game.id)}
        >
          <div className="game-copy">
            <strong>{game.name}</strong>
            <span>
              {closeLabel} {new Date(game.closesAt).toLocaleString()}
            </span>
          </div>
          <span className="game-count">
            {predictionsLoaded ? `${count ?? 0} predictions` : "--"}
          </span>
        </button>
        {canDeleteGame ? (
          <button
            type="button"
            className="game-delete"
            onClick={() => onDeleteGame(game.id)}
          >
            Delete
          </button>
        ) : null}
      </li>
    );
  }

  return (
    <article className="pane">
      <header className="pane-header">
        <div className="pane-title">
          <strong>Games</strong>
          <span className="pane-meta">
            {predictionsLoaded
              ? "Browse live games and open predictions."
              : "Sign in to view prediction counts."}
          </span>
        </div>
        {canCreateGame && (
          <button className="pane-export" onClick={onCreateGame}>
            Admin: Create Game
          </button>
        )}
      </header>
      <div className="pane-body">
        {games.length === 0 ? (
          <p className="empty-state">No games available yet.</p>
        ) : (
          <>
            <p className="pane-meta">Open games</p>
            {openGames.length === 0 ? (
              <p className="empty-state">No open games.</p>
            ) : (
              <ul className="game-list">{openGames.map((game) => renderGameRow(game))}</ul>
            )}
            <p className="pane-meta">Closed games</p>
            {closedGames.length === 0 ? (
              <p className="empty-state">No closed games.</p>
            ) : (
              <ul className="game-list">{closedGames.map((game) => renderGameRow(game))}</ul>
            )}
          </>
        )}
      </div>
    </article>
  );
}
