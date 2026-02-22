import { useEffect, useState } from "react";
import type { Prediction, PredictionType } from "../predictionModel.js";

interface SavePredictionDialogProps {
  open: boolean;
  prediction: Prediction | null;
  mode: "save" | "save-as";
  saveLabel: string;
  allowCompetition: boolean;
  allowTypeChange: boolean;
  onSave: (type: PredictionType, name: string) => void;
  onClose: () => void;
}

export function SavePredictionDialog({
  open,
  prediction,
  mode,
  saveLabel,
  allowCompetition,
  allowTypeChange,
  onSave,
  onClose
}: SavePredictionDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PredictionType>("fun");

  useEffect(() => {
    if (open && prediction) {
      setName(prediction.name);
      const shouldAllowTypeChange = mode === "save-as" || allowTypeChange;
      if (shouldAllowTypeChange) {
        if (prediction.type === "competition" && allowCompetition) {
          setType("competition");
        } else if (prediction.type === "fun") {
          setType("fun");
        } else {
          setType("fun");
        }
      } else {
        setType(prediction.type);
      }
    }
  }, [open, prediction, mode, allowCompetition, allowTypeChange]);

  if (!open || !prediction) {
    return null;
  }

  const isSaveAs = mode === "save-as";
  const showTypeSelector = isSaveAs || allowTypeChange;
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
        {showTypeSelector ? (
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
        ) : (
          <p className="modal-support">
            Prediction type: {prediction.type === "competition" ? "Competition" : "Fun"}
          </p>
        )}
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
          {isSaveAs
            ? "This creates a new prediction under your account."
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
