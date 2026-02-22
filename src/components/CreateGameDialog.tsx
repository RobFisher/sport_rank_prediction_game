import { useEffect, useState } from "react";
import type { CompetitorList } from "../predictionModel.js";

interface CreateGameDialogProps {
  open: boolean;
  competitorLists: CompetitorList[];
  onCreate: (name: string, competitorListId: string, closesAt: string) => void;
  onClose: () => void;
}

export function CreateGameDialog({
  open,
  competitorLists,
  onCreate,
  onClose
}: CreateGameDialogProps) {
  const [name, setName] = useState("");
  const [competitorListId, setCompetitorListId] = useState("");
  const [closesAtLocal, setClosesAtLocal] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("");
    setCompetitorListId(competitorLists[0]?.id ?? "");
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    setClosesAtLocal(now.toISOString().slice(0, 16));
  }, [open, competitorLists]);

  if (!open) {
    return null;
  }

  const trimmedName = name.trim();
  const canCreate =
    trimmedName.length > 0 && competitorListId.length > 0 && closesAtLocal.length > 0;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form
        className="modal-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canCreate) {
            return;
          }
          const closesAt = new Date(closesAtLocal).toISOString();
          onCreate(trimmedName, competitorListId, closesAt);
        }}
      >
        <h2>Create game</h2>
        <label>
          Game name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="F1 2026 Constructors Championship"
          />
        </label>
        <label>
          Competitor list
          <select
            value={competitorListId}
            onChange={(event) => setCompetitorListId(event.target.value)}
            disabled={competitorLists.length === 0}
          >
            {competitorLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </label>
        {competitorLists.length === 0 && (
          <p className="modal-support">
            Upload a competitor list before creating a game.
          </p>
        )}
        <label>
          Competition deadline
          <input
            type="datetime-local"
            value={closesAtLocal}
            onChange={(event) => setClosesAtLocal(event.target.value)}
          />
        </label>
        <p className="modal-support">
          Competition predictions lock at the deadline. Fun predictions remain editable.
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
