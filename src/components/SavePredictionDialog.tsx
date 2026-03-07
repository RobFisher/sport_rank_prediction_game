import { useEffect, useState } from "react";
import {
  isCompetitionClosedByTime,
  type Game,
  type PredictionType
} from "../predictionModel.js";

interface SavePredictionDialogProps {
  open: boolean;
  sourceLabel: string;
  games: Game[];
  initialGameId: string;
  initialType: PredictionType;
  initialName: string;
  hasCompetitionForGame: (gameId: string) => boolean;
  isFunNameAvailable: (gameId: string, name: string) => boolean;
  onSave: (gameId: string, type: PredictionType, name: string) => void;
  onClose: () => void;
}

export function SavePredictionDialog({
  open,
  sourceLabel,
  games,
  initialGameId,
  initialType,
  initialName,
  hasCompetitionForGame,
  isFunNameAvailable,
  onSave,
  onClose
}: SavePredictionDialogProps) {
  const [gameId, setGameId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<PredictionType>("fun");

  useEffect(() => {
    if (open) {
      const preferred =
        initialGameId && games.some((game) => game.id === initialGameId)
          ? initialGameId
          : games[0]?.id ?? "";
      setGameId(preferred);
      setName(initialName);
      setType(initialType);
    }
  }, [games, initialGameId, initialName, initialType, open]);

  useEffect(() => {
    if (!open || type !== "competition") {
      return;
    }
    const selectedGame = games.find((game) => game.id === gameId);
    const competitionClosed = selectedGame
      ? isCompetitionClosedByTime(selectedGame.closesAt)
      : false;
    const hasCompetition = gameId.length > 0 && hasCompetitionForGame(gameId);
    if (competitionClosed || hasCompetition) {
      setType("fun");
    }
  }, [gameId, games, hasCompetitionForGame, open, type]);

  if (!open) {
    return null;
  }

  const selectedGame = games.find((game) => game.id === gameId);
  const competitionClosed = selectedGame
    ? isCompetitionClosedByTime(selectedGame.closesAt)
    : false;
  const hasCompetition = gameId.length > 0 && hasCompetitionForGame(gameId);
  const competitionDisabled = hasCompetition || competitionClosed;
  const trimmedName = name.trim();
  const requiresName = type === "fun";
  const funNameTaken =
    type === "fun" &&
    trimmedName.length > 0 &&
    !isFunNameAvailable(gameId, trimmedName);
  const canSave =
    gameId.length > 0 &&
    (type !== "competition" || !competitionDisabled) &&
    (!requiresName || (trimmedName.length > 0 && !funNameTaken));

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form
        className="modal-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) {
            return;
          }
          onSave(gameId, type, trimmedName);
        }}
      >
        <h2>Save as prediction</h2>
        <p className="modal-support">
          Create a new prediction from {sourceLabel}. Only games with the same competitor list are
          available.
        </p>
        <label>
          Target game
          <select value={gameId} onChange={(event) => setGameId(event.target.value)}>
            {games.map((game) => (
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
        <label>
          Fun prediction name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={type === "competition"}
            placeholder={type === "competition" ? "Not used for competition entries" : ""}
          />
        </label>
        {funNameTaken ? (
          <p className="status-error">You already have a fun prediction with this name.</p>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="modal-create" disabled={!canSave}>
            Save As
          </button>
        </div>
      </form>
    </div>
  );
}
