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
        <p className="modal-support">
          The overall leaderboard is separate from raw prediction scores. For each completed
          game, competition entries are ranked by lowest score, then championship points are
          awarded using the Formula 1 drivers system: 25, 18, 15, 12, 10, 8, 6, 4, 2, 1 for
          places 1 through 10. The leaderboard also shows games entered plus counts of 1st,
          2nd, and 3rd place finishes.
        </p>
        <p className="modal-support">
          If multiple entries finish with the same score in a game, they share the same place
          and receive the same championship points.
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
