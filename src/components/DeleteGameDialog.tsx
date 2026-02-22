import { useEffect, useState } from "react";
import type { Game } from "../predictionModel.js";

interface DeleteGameDialogProps {
  open: boolean;
  game: Game | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteGameDialog({
  open,
  game,
  onConfirm,
  onClose
}: DeleteGameDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");

  useEffect(() => {
    if (open) {
      setConfirmationText("");
    }
  }, [open]);

  if (!open || !game) {
    return null;
  }

  const matches = confirmationText.trim() === game.name;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form
        className="modal-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (!matches) {
            return;
          }
          onConfirm();
        }}
      >
        <h2>Delete game</h2>
        <p className="modal-support">
          This permanently deletes the game and all predictions under it. Type the game name
          exactly to confirm.
        </p>
        <label>
          Confirm by typing: {game.name}
          <input
            type="text"
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="modal-create" disabled={!matches}>
            Delete game
          </button>
        </div>
      </form>
    </div>
  );
}
