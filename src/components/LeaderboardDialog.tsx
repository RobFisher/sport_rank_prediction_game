import { useEffect, useState } from "react";
import type {
  LeaderboardColumnType,
  LeaderboardStanding,
  LeaderboardTable
} from "../predictionModel.js";

interface LeaderboardDialogProps {
  open: boolean;
  canShowLeaderboard: boolean;
  leaderboards: LeaderboardTable[];
  onClose: () => void;
}

function formatAverageScore(score: number): string {
  const roundedScore = Math.round(score * 100) / 100;
  return Number.isInteger(roundedScore) ? String(roundedScore) : roundedScore.toFixed(2);
}

function getColumnLabel(column: LeaderboardColumnType): string {
  switch (column) {
    case "games_entered":
      return "Games entered";
    case "avg_score":
      return "Avg score";
    case "first":
      return "1st";
    case "second":
      return "2nd";
    case "third":
      return "3rd";
    case "points":
      return "Points";
  }
}

function renderColumnValue(row: LeaderboardStanding, column: LeaderboardColumnType): string | number {
  switch (column) {
    case "games_entered":
      return row.gamesEntered;
    case "avg_score":
      return formatAverageScore(row.averageScore);
    case "first":
      return row.firstPlaces;
    case "second":
      return row.secondPlaces;
    case "third":
      return row.thirdPlaces;
    case "points":
      return row.points;
  }
}

export function LeaderboardDialog({
  open,
  canShowLeaderboard,
  leaderboards,
  onClose
}: LeaderboardDialogProps) {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setActiveTabIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (activeTabIndex >= leaderboards.length) {
      setActiveTabIndex(0);
    }
  }, [activeTabIndex, leaderboards.length]);

  if (!open) {
    return null;
  }

  const activeLeaderboard = leaderboards[activeTabIndex] ?? null;
  const activeRows = activeLeaderboard?.rows ?? [];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card modal-card-large">
        <h2>Leaderboard</h2>
        {!canShowLeaderboard ? (
          <p className="empty-state">Sign in to view leaderboard scores.</p>
        ) : leaderboards.length === 0 ? (
          <p className="empty-state">No leaderboards configured.</p>
        ) : (
          <>
            <div className="leaderboard-tabs" role="tablist" aria-label="Leaderboard tabs">
              {leaderboards.map((leaderboard, index) => (
                <button
                  key={leaderboard.definition.title}
                  type="button"
                  role="tab"
                  className={
                    index === activeTabIndex
                      ? "leaderboard-tab leaderboard-tab-active"
                      : "leaderboard-tab"
                  }
                  aria-selected={index === activeTabIndex}
                  onClick={() => setActiveTabIndex(index)}
                >
                  {leaderboard.definition.title}
                </button>
              ))}
            </div>
            {activeLeaderboard && activeRows.length === 0 ? (
              <p className="empty-state">
                No completed competition results yet for {activeLeaderboard.definition.title}.
              </p>
            ) : activeLeaderboard ? (
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th scope="col">Username</th>
                    {activeLeaderboard.definition.columns.map((column) => (
                      <th key={column} scope="col">
                        {getColumnLabel(column)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeRows.map((row) => (
                    <tr key={row.userId}>
                      <td>{row.displayName}</td>
                      {activeLeaderboard.definition.columns.map((column) => (
                        <td key={`${row.userId}-${column}`}>{renderColumnValue(row, column)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </>
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
