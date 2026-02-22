import { useEffect, useState } from "react";
import type { Prediction } from "../predictionModel.js";

interface SavePredictionDialogProps {
  open: boolean;
  prediction: Prediction | null;
  onSave: (name: string) => void;
  onClose: () => void;
}

export function SavePredictionDialog({
  open,
  prediction,
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

  const trimmedName = name.trim();
  const canSave = prediction.type === "fun" && trimmedName.length > 0;

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
            disabled={prediction.type === "competition"}
            placeholder={
              prediction.type === "competition" ? "Not used for competition entries" : ""
            }
          />
        </label>
        <p className="modal-support">
          Competition predictions are locked once saved. Fun predictions can be edited later.
        </p>
        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="modal-create" disabled={!canSave}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
