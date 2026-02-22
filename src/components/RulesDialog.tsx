interface RulesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function RulesDialog({ open, onClose }: RulesDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2>Game rules</h2>
        <p className="modal-support">
          A game is a specific event (for example, the 2026 Constructors Championship). Each
          game has a competitor list and a closing time for competition predictions.
        </p>
        <p className="modal-support">
          Predictions are ordered lists of competitors. You can make one competition
          prediction per game (editable until the game closes) plus any number of fun
          predictions for experimenting.
        </p>
        <p className="modal-support">
          Scoring uses a lowest-score-wins system: each competitor earns points equal to the
          difference between their predicted and actual finishing position. A perfect pick
          scores 0, off by one scores 1, and so on. Prediction scores will appear once results
          are available.
        </p>
        <div className="modal-actions">
          <button type="button" className="modal-create" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
