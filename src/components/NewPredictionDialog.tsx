import { useEffect, useMemo, useState } from "react";
import type { Game, PredictionType } from "../predictionModel.js";

interface NewPredictionDialogProps {
  open: boolean;
  games: Game[];
  onCreate: (gameId: string, type: PredictionType) => void;
  onClose: () => void;
}

export function NewPredictionDialog({
  open,
  games,
  onCreate,
  onClose
}: NewPredictionDialogProps) {
  const gameOptions = useMemo(() => games, [games]);
  const [gameId, setGameId] = useState(gameOptions[0]?.id ?? "");
  const [type, setType] = useState<PredictionType>("fun");

  useEffect(() => {
    if (open) {
      setGameId(gameOptions[0]?.id ?? "");
      setType("fun");
    }
  }, [open, gameOptions]);

  if (!open) {
    return null;
  }

  const canCreate = gameId.length > 0;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form
        className="modal-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canCreate) {
            return;
          }
          onCreate(gameId, type);
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
            <option value="competition">Competition</option>
            <option value="fun">Fun</option>
          </select>
        </label>
        <p className="modal-support">
          This creates a placeholder prediction pane. Save the prediction to finalize it.
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
