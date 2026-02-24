import test from "node:test";
import assert from "node:assert/strict";
import { calculatePredictionScore } from "./predictionModel.js";

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
