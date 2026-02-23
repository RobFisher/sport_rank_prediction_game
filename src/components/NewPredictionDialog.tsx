import { useEffect, useMemo, useState } from "react";
import type { Game, PredictionType } from "../predictionModel.js";

interface NewPredictionDialogProps {
  open: boolean;
  games: Game[];
  initialGameId?: string | null;
  hasCompetitionForGame: (gameId: string) => boolean;
  isFunNameAvailable: (gameId: string, name: string) => boolean;
  onCreate: (gameId: string, type: PredictionType, name: string) => void;
  onClose: () => void;
}

export function NewPredictionDialog({
  open,
  games,
  initialGameId,
  hasCompetitionForGame,
  isFunNameAvailable,
  onCreate,
  onClose
}: NewPredictionDialogProps) {
  const gameOptions = useMemo(() => games, [games]);
  const [gameId, setGameId] = useState(gameOptions[0]?.id ?? "");
  const [type, setType] = useState<PredictionType>("fun");
  const [funName, setFunName] = useState("");

  useEffect(() => {
    if (open) {
      const preferred =
        initialGameId && gameOptions.some((game) => game.id === initialGameId)
          ? initialGameId
          : gameOptions[0]?.id ?? "";
      setGameId(preferred);
      setType("fun");
      setFunName("");
    }
  }, [open, gameOptions, initialGameId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const selectedGame = gameOptions.find((entry) => entry.id === gameId);
    const closesAtMs = selectedGame ? Date.parse(selectedGame.closesAt) : Number.NaN;
    const closed = Number.isFinite(closesAtMs) && closesAtMs <= Date.now();
    if (type === "competition" && (hasCompetitionForGame(gameId) || closed)) {
      setType("fun");
    }
  }, [gameId, gameOptions, hasCompetitionForGame, open, type]);

  if (!open) {
    return null;
  }

  const selectedGame = gameOptions.find((entry) => entry.id === gameId);
  const closesAtMs = selectedGame ? Date.parse(selectedGame.closesAt) : Number.NaN;
  const competitionClosed = Number.isFinite(closesAtMs) && closesAtMs <= Date.now();
  const hasCompetition = gameId.length > 0 && hasCompetitionForGame(gameId);
  const competitionDisabled = hasCompetition || competitionClosed;
  const trimmedFunName = funName.trim();
  const funNameTaken =
    type === "fun" &&
    trimmedFunName.length > 0 &&
    !isFunNameAvailable(gameId, trimmedFunName);
  const canCreate =
    gameId.length > 0 &&
    (type !== "competition" || !competitionDisabled) &&
    (type !== "fun" || (trimmedFunName.length > 0 && !funNameTaken));

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form
        className="modal-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canCreate) {
            return;
          }
          onCreate(gameId, type, trimmedFunName);
        }}
      >
        <h2>New prediction</h2>
        <label>
          Game
          <select value={gameId} onChange={(event) => setGameId(event.target.value)}>
            {gameOptions.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prediction type
          <select value={type} onChange={(event) => setType(event.target.value as PredictionType)}>
            <option value="competition" disabled={competitionDisabled}>
              {competitionClosed
                ? "Competition (closed)"
                : hasCompetition
                  ? "Competition (already entered)"
                  : "Competition"}
            </option>
            <option value="fun">Fun</option>
          </select>
        </label>
        {type === "fun" && (
          <label>
            Fun prediction name
            <input
              type="text"
              value={funName}
              onChange={(event) => setFunName(event.target.value)}
              placeholder="Enter a unique name"
            />
          </label>
        )}
        {type === "fun" && funNameTaken && (
          <p className="status-error">You already have a fun prediction with this name.</p>
        )}
        <p className="modal-support">
          This creates a prediction entry and opens it in a new pane.
        </p>
        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="modal-create" disabled={!canCreate}>
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
