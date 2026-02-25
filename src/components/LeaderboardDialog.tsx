interface LeaderboardRow {
  userId: string;
  displayName: string;
  totalScore: number;
}

interface LeaderboardDialogProps {
  open: boolean;
  canShowLeaderboard: boolean;
  rows: LeaderboardRow[];
  onClose: () => void;
}

export function LeaderboardDialog({
  open,
  canShowLeaderboard,
  rows,
  onClose
}: LeaderboardDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card modal-card-large">
        <h2>Overall leaderboard</h2>
        {!canShowLeaderboard ? (
          <p className="empty-state">Sign in to view leaderboard scores.</p>
        ) : rows.length === 0 ? (
          <p className="empty-state">No scored competition predictions yet.</p>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th scope="col">Username</th>
                <th scope="col">Total score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId}>
                  <td>{row.displayName}</td>
                  <td>{row.totalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="modal-actions">
          <button type="button" className="modal-create" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
