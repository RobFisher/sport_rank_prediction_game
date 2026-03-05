import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePredictionScore,
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
