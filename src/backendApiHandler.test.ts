import { test } from "node:test";
import assert from "node:assert/strict";

// @ts-expect-error backend handler is plain .mjs without TypeScript declarations
import {
  listCompetitorListsFromDynamoScan,
  listGamesFromDynamoScan,
  listProjectSummariesFromDynamoScan
} from "../backend/api-handler.mjs";

class FakeScanCommand {
  input: Record<string, unknown>;

  constructor(input: Record<string, unknown>) {
    this.input = input;
  }
}

test("listProjectSummariesFromDynamoScan follows LastEvaluatedKey across pages", async () => {
  const scanInputs: Array<Record<string, unknown>> = [];
  const responses = [
    {
      Items: [
        {
          projectId: "project-1",
          name: "Old Project",
          ownerUserId: "user-a",
          version: 1,
          updatedAt: "2026-02-20T00:00:00.000Z"
        }
      ],
      LastEvaluatedKey: {
        pk: "PROJECT#project-1",
        sk: "META"
      }
    },
    {
      Items: [
        {
          projectId: "project-2",
          name: "New Project",
          ownerUserId: "user-b",
          version: "3",
          updatedAt: "2026-02-21T00:00:00.000Z"
        }
      ]
    }
  ];
  let responseIndex = 0;
  const fakeClient = {
    async send(command: { input: Record<string, unknown> }) {
      scanInputs.push(command.input);
      const nextResponse = responses[responseIndex];
      responseIndex += 1;
      return nextResponse;
    }
  };

  const projects = await listProjectSummariesFromDynamoScan(
    fakeClient,
    FakeScanCommand,
    "AppTable"
  );

  assert.equal(scanInputs.length, 2);
  assert.deepEqual(scanInputs[0], {
    TableName: "AppTable",
    FilterExpression: "itemType = :itemType",
    ExpressionAttributeValues: {
      ":itemType": "project"
    }
  });
  assert.deepEqual(scanInputs[1], {
    TableName: "AppTable",
    FilterExpression: "itemType = :itemType",
    ExpressionAttributeValues: {
      ":itemType": "project"
    },
    ExclusiveStartKey: {
      pk: "PROJECT#project-1",
      sk: "META"
    }
  });
  assert.deepEqual(projects, [
    {
      projectId: "project-1",
      name: "Old Project",
      ownerUserId: "user-a",
      version: 1,
      updatedAt: "2026-02-20T00:00:00.000Z"
    },
    {
      projectId: "project-2",
      name: "New Project",
      ownerUserId: "user-b",
      version: 3,
      updatedAt: "2026-02-21T00:00:00.000Z"
    }
  ]);
});

test("listCompetitorListsFromDynamoScan follows LastEvaluatedKey across pages", async () => {
  const scanInputs: Array<Record<string, unknown>> = [];
  const responses = [
    {
      Items: [
        {
          competitorListId: "list-1",
          name: "F1 Drivers",
          competitors: [
            {
              id: "driver-1",
              name: "Driver One"
            }
          ],
          updatedAt: "2026-01-02T00:00:00.000Z"
        }
      ],
      LastEvaluatedKey: {
        pk: "COMPETITOR_LIST#list-1",
        sk: "META"
      }
    },
    {
      Items: [
        {
          competitorListId: "list-2",
          name: "F1 Constructors",
          competitors: [],
          updatedAt: "2026-01-03T00:00:00.000Z"
        }
      ]
    }
  ];
  let responseIndex = 0;
  const fakeClient = {
    async send(command: { input: Record<string, unknown> }) {
      scanInputs.push(command.input);
      const nextResponse = responses[responseIndex];
      responseIndex += 1;
      return nextResponse;
    }
  };

  const lists = await listCompetitorListsFromDynamoScan(
    fakeClient,
    FakeScanCommand,
    "AppTable"
  );

  assert.equal(scanInputs.length, 2);
  assert.deepEqual(scanInputs[0], {
    TableName: "AppTable",
    FilterExpression: "itemType = :itemType",
    ExpressionAttributeValues: {
      ":itemType": "competitor_list"
    }
  });
  assert.deepEqual(scanInputs[1], {
    TableName: "AppTable",
    FilterExpression: "itemType = :itemType",
    ExpressionAttributeValues: {
      ":itemType": "competitor_list"
    },
    ExclusiveStartKey: {
      pk: "COMPETITOR_LIST#list-1",
      sk: "META"
    }
  });
  assert.deepEqual(lists, [
    {
      competitorListId: "list-1",
      name: "F1 Drivers",
      competitors: [
        {
          id: "driver-1",
          name: "Driver One"
        }
      ],
      updatedAt: "2026-01-02T00:00:00.000Z"
    },
    {
      competitorListId: "list-2",
      name: "F1 Constructors",
      competitors: [],
      updatedAt: "2026-01-03T00:00:00.000Z"
    }
  ]);
});

test("listGamesFromDynamoScan follows LastEvaluatedKey across pages", async () => {
  const scanInputs: Array<Record<string, unknown>> = [];
  const responses = [
    {
      Items: [
        {
          gameId: "game-1",
          name: "Season Predictions",
          competitorListId: "list-1",
          closesAt: "2026-01-02T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
          results: ["a", "b"]
        }
      ],
      LastEvaluatedKey: {
        pk: "GAME#game-1",
        sk: "META"
      }
    },
    {
      Items: [
        {
          gameId: "game-2",
          name: "Race Predictions",
          competitorListId: "list-2",
          closesAt: "2026-01-03T00:00:00.000Z",
          updatedAt: "2026-01-03T00:00:00.000Z"
        }
      ]
    }
  ];
  let responseIndex = 0;
  const fakeClient = {
    async send(command: { input: Record<string, unknown> }) {
      scanInputs.push(command.input);
      const nextResponse = responses[responseIndex];
      responseIndex += 1;
      return nextResponse;
    }
  };

  const games = await listGamesFromDynamoScan(fakeClient, FakeScanCommand, "AppTable");

  assert.equal(scanInputs.length, 2);
  assert.deepEqual(scanInputs[0], {
    TableName: "AppTable",
    FilterExpression: "itemType = :itemType",
    ExpressionAttributeValues: {
      ":itemType": "game"
    }
  });
  assert.deepEqual(scanInputs[1], {
    TableName: "AppTable",
    FilterExpression: "itemType = :itemType",
    ExpressionAttributeValues: {
      ":itemType": "game"
    },
    ExclusiveStartKey: {
      pk: "GAME#game-1",
      sk: "META"
    }
  });
  assert.deepEqual(games, [
    {
      gameId: "game-1",
      name: "Season Predictions",
      competitorListId: "list-1",
      closesAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      results: ["a", "b"]
    },
    {
      gameId: "game-2",
      name: "Race Predictions",
      competitorListId: "list-2",
      closesAt: "2026-01-03T00:00:00.000Z",
      updatedAt: "2026-01-03T00:00:00.000Z",
      results: null
    }
  ]);
});
