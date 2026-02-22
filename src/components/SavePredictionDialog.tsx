import { useEffect, useState } from "react";
import type { Prediction, PredictionType } from "../predictionModel.js";

interface SavePredictionDialogProps {
  open: boolean;
  prediction: Prediction | null;
  onSave: (type: PredictionType, name: string) => void;
  onClose: () => void;
}

export function SavePredictionDialog({
  open,
  prediction,
  onSave,
  onClose
}: SavePredictionDialogProps) {
  const [type, setType] = useState<PredictionType>("fun");
  const [name, setName] = useState("");

  useEffect(() => {
    if (open && prediction) {
      setType(prediction.type);
      setName(prediction.name);
    }
  }, [open, prediction]);

  if (!open || !prediction) {
    return null;
  }

  const trimmedName = name.trim();
  const requiresName = type === "fun";
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
          onSave(type, trimmedName);
        }}
      >
        <h2>Save prediction</h2>
        <label>
          Prediction type
          <select value={type} onChange={(event) => setType(event.target.value as PredictionType)}>
            <option value="competition">Competition</option>
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
        <p className="modal-support">
          Competition predictions are locked after the closing time. Fun predictions can be
          edited later.
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
