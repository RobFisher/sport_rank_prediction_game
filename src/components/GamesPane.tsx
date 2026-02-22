import type { Game } from "../predictionModel.js";

interface GamesPaneProps {
  games: Game[];
  predictionsLoaded: boolean;
  predictionCountsByGameId: Map<string, number>;
  canCreateGame: boolean;
  onCreateGame: () => void;
  onOpenGame: (gameId: string) => void;
}

export function GamesPane({
  games,
  predictionsLoaded,
  predictionCountsByGameId,
  canCreateGame,
  onCreateGame,
  onOpenGame
}: GamesPaneProps) {
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
          <ul className="game-list">
            {games.map((game) => {
              const count = predictionCountsByGameId.get(game.id);
              return (
                <li key={game.id} className="game-row">
                  <button type="button" onClick={() => onOpenGame(game.id)}>
                    <div className="game-copy">
                      <strong>{game.name}</strong>
                      <span>Closes {new Date(game.closesAt).toLocaleString()}</span>
                    </div>
                    <span className="game-count">
                      {predictionsLoaded ? `${count ?? 0} predictions` : "--"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}
