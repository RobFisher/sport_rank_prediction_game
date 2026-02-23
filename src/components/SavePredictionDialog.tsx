import { useEffect, useState } from "react";
import type { Prediction, PredictionType } from "../predictionModel.js";

interface SavePredictionDialogProps {
  open: boolean;
  prediction: Prediction | null;
  saveLabel: string;
  allowCompetition: boolean;
  onSave: (type: PredictionType, name: string) => void;
  onClose: () => void;
}

export function SavePredictionDialog({
  open,
  prediction,
  saveLabel,
  allowCompetition,
  onSave,
  onClose
}: SavePredictionDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PredictionType>("fun");

  useEffect(() => {
    if (open && prediction) {
      setName(prediction.name);
      if (prediction.type === "competition" && allowCompetition) {
        setType("competition");
      } else if (prediction.type === "fun") {
        setType("fun");
      } else {
        setType("fun");
      }
    }
  }, [open, prediction, allowCompetition]);

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
            <option value="competition" disabled={!allowCompetition}>
              {allowCompetition
                ? "Competition"
                : "Competition (already entered or closed)"}
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
        <p className="modal-support">
          Changing type or fun name will create a new prediction. Keeping both unchanged
          updates the current prediction.
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
