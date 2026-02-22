import { useEffect, useState } from "react";
import type { Prediction } from "../predictionModel.js";

interface SavePredictionDialogProps {
  open: boolean;
  prediction: Prediction | null;
  mode: "save" | "save-as";
  saveLabel: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

export function SavePredictionDialog({
  open,
  prediction,
  mode,
  saveLabel,
  onSave,
  onClose
}: SavePredictionDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open && prediction) {
      setName(prediction.name);
    }
  }, [open, prediction]);

  if (!open || !prediction) {
    return null;
  }

  const isSaveAs = mode === "save-as";
  const trimmedName = name.trim();
  const requiresName = isSaveAs || prediction.type === "fun";
  const canSave = !requiresName || trimmedName.length > 0;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form
        className="modal-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) {
            return;
          }
          onSave(trimmedName);
        }}
      >
        <h2>Save prediction</h2>
        <p className="modal-support">
          Prediction type: {prediction.type === "competition" ? "Competition" : "Fun"}
        </p>
        <label>
          Fun prediction name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!isSaveAs && prediction.type === "competition"}
            placeholder={
              !isSaveAs && prediction.type === "competition"
                ? "Not used for competition entries"
                : ""
            }
          />
        </label>
        <p className="modal-support">
          {isSaveAs
            ? "This creates a new fun prediction under your account."
            : "Competition predictions can be edited until the game closes. Fun predictions can be edited any time."}
        </p>
        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="modal-create" disabled={!canSave}>
            {saveLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
