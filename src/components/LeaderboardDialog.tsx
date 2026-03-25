import type { LeaderboardStanding } from "../predictionModel.js";

interface LeaderboardDialogProps {
  open: boolean;
  canShowLeaderboard: boolean;
  rows: LeaderboardStanding[];
  onClose: () => void;
}

function formatAverageScore(score: number): string {
  const roundedScore = Math.round(score * 100) / 100;
  return Number.isInteger(roundedScore) ? String(roundedScore) : roundedScore.toFixed(2);
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
          <p className="empty-state">No completed competition results yet.</p>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th scope="col">Username</th>
                <th scope="col">Games entered</th>
                <th scope="col">Avg score</th>
                <th scope="col">1st</th>
                <th scope="col">2nd</th>
                <th scope="col">3rd</th>
                <th scope="col">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId}>
                  <td>{row.displayName}</td>
                  <td>{row.gamesEntered}</td>
                  <td>{formatAverageScore(row.averageScore)}</td>
                  <td>{row.firstPlaces}</td>
                  <td>{row.secondPlaces}</td>
                  <td>{row.thirdPlaces}</td>
                  <td>{row.points}</td>
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
