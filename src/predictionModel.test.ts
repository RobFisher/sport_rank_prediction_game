import test from "node:test";
import assert from "node:assert/strict";
import {
  F1_CHAMPIONSHIP_POINTS_BY_PLACE,
  calculatePredictionScore,
  calculateLeaderboardStandings,
  calculatePredictionScoreContributions,
  isCompetitionClosedByTime
} from "./predictionModel.js";

test("calculatePredictionScore returns null when no results", () => {
  assert.equal(calculatePredictionScore(["a", "b"], null), null);
});

test("calculatePredictionScore returns 0 for perfect order", () => {
  assert.equal(calculatePredictionScore(["a", "b", "c"], ["a", "b", "c"]), 0);
});

test("calculatePredictionScore sums absolute rank differences", () => {
  assert.equal(calculatePredictionScore(["a", "b", "c"], ["c", "b", "a"]), 4);
});

test("calculatePredictionScore returns null for mismatched competitors", () => {
  assert.equal(calculatePredictionScore(["a", "b", "c"], ["a", "b", "d"]), null);
});

test("calculatePredictionScoreContributions returns direction and delta per competitor", () => {
  assert.deepEqual(calculatePredictionScoreContributions(["max", "lando", "charles"], [
    "lando",
    "charles",
    "max"
  ]), [
    {
      competitorId: "max",
      predictedPosition: 1,
      actualPosition: 3,
      scoreDelta: 2,
      direction: "down"
    },
    {
      competitorId: "lando",
      predictedPosition: 2,
      actualPosition: 1,
      scoreDelta: 1,
      direction: "up"
    },
    {
      competitorId: "charles",
      predictedPosition: 3,
      actualPosition: 2,
      scoreDelta: 1,
      direction: "up"
    }
  ]);
});

test("calculatePredictionScoreContributions returns exact for correct placements", () => {
  assert.deepEqual(calculatePredictionScoreContributions(["a", "b"], ["a", "b"]), [
    {
      competitorId: "a",
      predictedPosition: 1,
      actualPosition: 1,
      scoreDelta: 0,
      direction: "exact"
    },
    {
      competitorId: "b",
      predictedPosition: 2,
      actualPosition: 2,
      scoreDelta: 0,
      direction: "exact"
    }
  ]);
});

test("F1 points table matches the standard top-10 distribution", () => {
  assert.deepEqual(F1_CHAMPIONSHIP_POINTS_BY_PLACE, [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]);
});

test("calculateLeaderboardStandings counts entered games, podiums, and F1 points", () => {
  assert.deepEqual(
    calculateLeaderboardStandings(
      [
        {
          id: "prediction-1",
          gameId: "game-1",
          type: "competition",
          name: "",
          competitorIds: ["a", "b", "c"],
          createdAt: "2026-01-01T00:00:00Z",
          ownerUserId: "u1",
          ownerDisplayName: "Alice"
        },
        {
          id: "prediction-2",
          gameId: "game-1",
          type: "competition",
          name: "",
          competitorIds: ["a", "c", "b"],
          createdAt: "2026-01-01T00:00:00Z",
          ownerUserId: "u2",
          ownerDisplayName: "Bob"
        },
        {
          id: "prediction-3",
          gameId: "game-1",
          type: "competition",
          name: "",
          competitorIds: ["c", "b", "a"],
          createdAt: "2026-01-01T00:00:00Z",
          ownerUserId: "u3",
          ownerDisplayName: "Charlie"
        },
        {
          id: "prediction-4",
          gameId: "game-2",
          type: "competition",
          name: "",
          competitorIds: ["b", "a", "c"],
          createdAt: "2026-01-01T00:00:00Z",
          ownerUserId: "u2",
          ownerDisplayName: "Bob"
        },
        {
          id: "prediction-5",
          gameId: "game-2",
          type: "competition",
          name: "",
          competitorIds: ["a", "b", "c"],
          createdAt: "2026-01-01T00:00:00Z",
          ownerUserId: "u1",
          ownerDisplayName: "Alice"
        },
        {
          id: "prediction-fun",
          gameId: "game-2",
          type: "fun",
          name: "Ignored",
          competitorIds: ["c", "a", "b"],
          createdAt: "2026-01-01T00:00:00Z",
          ownerUserId: "u4",
          ownerDisplayName: "Dana"
        }
      ],
      [
        {
          id: "game-1",
          name: "Game 1",
          competitorListId: "list-1",
          closesAt: "2026-01-01T00:00:00Z",
          results: ["a", "b", "c"]
        },
        {
          id: "game-2",
          name: "Game 2",
          competitorListId: "list-1",
          closesAt: "2026-01-01T00:00:00Z",
          results: ["b", "a", "c"]
        }
      ]
    ),
    [
      {
        userId: "u1",
        displayName: "Alice",
        gamesEntered: 2,
        firstPlaces: 1,
        secondPlaces: 1,
        thirdPlaces: 0,
        points: 43
      },
      {
        userId: "u2",
        displayName: "Bob",
        gamesEntered: 2,
        firstPlaces: 1,
        secondPlaces: 1,
        thirdPlaces: 0,
        points: 43
      },
      {
        userId: "u3",
        displayName: "Charlie",
        gamesEntered: 1,
        firstPlaces: 0,
        secondPlaces: 0,
        thirdPlaces: 1,
        points: 15
      }
    ]
  );
});

test("calculateLeaderboardStandings awards shared places and points for tied scores", () => {
  assert.deepEqual(
    calculateLeaderboardStandings(
      [
        {
          id: "prediction-1",
          gameId: "game-1",
          type: "competition",
          name: "",
          competitorIds: ["a", "b", "c"],
          createdAt: "2026-01-01T00:00:00Z",
          ownerUserId: "u1",
          ownerDisplayName: "Alice"
        },
        {
          id: "prediction-2",
          gameId: "game-1",
          type: "competition",
          name: "",
          competitorIds: ["a", "b", "c"],
          createdAt: "2026-01-01T00:00:00Z",
          ownerUserId: "u2",
          ownerDisplayName: "Bob"
        },
        {
          id: "prediction-3",
          gameId: "game-1",
          type: "competition",
          name: "",
          competitorIds: ["b", "a", "c"],
          createdAt: "2026-01-01T00:00:00Z",
          ownerUserId: "u3",
          ownerDisplayName: "Charlie"
        }
      ],
      [
        {
          id: "game-1",
          name: "Game 1",
          competitorListId: "list-1",
          closesAt: "2026-01-01T00:00:00Z",
          results: ["a", "b", "c"]
        }
      ]
    ),
    [
      {
        userId: "u1",
        displayName: "Alice",
        gamesEntered: 1,
        firstPlaces: 1,
        secondPlaces: 0,
        thirdPlaces: 0,
        points: 25
      },
      {
        userId: "u2",
        displayName: "Bob",
        gamesEntered: 1,
        firstPlaces: 1,
        secondPlaces: 0,
        thirdPlaces: 0,
        points: 25
      },
      {
        userId: "u3",
        displayName: "Charlie",
        gamesEntered: 1,
        firstPlaces: 0,
        secondPlaces: 1,
        thirdPlaces: 0,
        points: 18
      }
    ]
  );
});

test("isCompetitionClosedByTime is false before close time", () => {
  assert.equal(
    isCompetitionClosedByTime("2030-01-01T00:00:00Z", Date.parse("2029-12-31T23:59:59Z")),
    false
  );
});

test("isCompetitionClosedByTime is true at or after close time", () => {
  assert.equal(
    isCompetitionClosedByTime("2030-01-01T00:00:00Z", Date.parse("2030-01-01T00:00:00Z")),
    true
  );
});
