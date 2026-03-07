import { test } from "node:test";
import assert from "node:assert/strict";

import {
  handler,
  listCompetitorListsFromDynamoScan,
  listGamesFromDynamoScan,
  listProjectSummariesFromDynamoScan,
  listPredictionsForGameFromDynamoQuery
} from "../backend/api-handler.mjs";

interface HandlerResponse {
  statusCode: number;
  body: string;
}

class FakeScanCommand {
  input: Record<string, unknown>;

  constructor(input: Record<string, unknown>) {
    this.input = input;
  }
}

class FakeQueryCommand {
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

test("listPredictionsForGameFromDynamoQuery follows LastEvaluatedKey across pages", async () => {
  const queryInputs: Array<Record<string, unknown>> = [];
  const responses = [
    {
      Items: [
        {
          predictionId: "prediction-1",
          gameId: "game-1",
          ownerUserId: "user-a",
          ownerDisplayName: "User A",
          type: "competition",
          name: "",
          competitorIds: ["c-1", "c-2"],
          createdAt: "2026-02-25T00:00:00.000Z",
          updatedAt: "2026-02-25T00:00:00.000Z"
        }
      ],
      LastEvaluatedKey: {
        pk: "PREDICTION#prediction-1",
        sk: "META"
      }
    },
    {
      Items: [
        {
          predictionId: "prediction-2",
          gameId: "game-1",
          ownerUserId: "user-b",
          ownerDisplayName: "User B",
          type: "fun",
          name: "My Fun Pick",
          competitorIds: ["c-3", "c-4"],
          createdAt: "2026-02-26T00:00:00.000Z",
          updatedAt: "2026-02-26T00:00:00.000Z"
        }
      ]
    }
  ];
  let responseIndex = 0;
  const fakeClient = {
    async send(command: { input: Record<string, unknown> }) {
      queryInputs.push(command.input);
      const nextResponse = responses[responseIndex];
      responseIndex += 1;
      return nextResponse;
    }
  };

  const predictions = await listPredictionsForGameFromDynamoQuery(
    fakeClient,
    FakeQueryCommand,
    "AppTable",
    "game-1"
  );

  assert.equal(queryInputs.length, 2);
  assert.deepEqual(queryInputs[0], {
    TableName: "AppTable",
    IndexName: "gsi1",
    KeyConditionExpression: "gsi1pk = :gsi1pk",
    ExpressionAttributeValues: {
      ":gsi1pk": "GAME#game-1"
    }
  });
  assert.deepEqual(queryInputs[1], {
    TableName: "AppTable",
    IndexName: "gsi1",
    KeyConditionExpression: "gsi1pk = :gsi1pk",
    ExpressionAttributeValues: {
      ":gsi1pk": "GAME#game-1"
    },
    ExclusiveStartKey: {
      pk: "PREDICTION#prediction-1",
      sk: "META"
    }
  });
  assert.deepEqual(predictions, [
    {
      predictionId: "prediction-1",
      gameId: "game-1",
      ownerUserId: "user-a",
      ownerDisplayName: "User A",
      type: "competition",
      name: "",
      competitorIds: ["c-1", "c-2"],
      createdAt: "2026-02-25T00:00:00.000Z",
      updatedAt: "2026-02-25T00:00:00.000Z"
    },
    {
      predictionId: "prediction-2",
      gameId: "game-1",
      ownerUserId: "user-b",
      ownerDisplayName: "User B",
      type: "fun",
      name: "My Fun Pick",
      competitorIds: ["c-3", "c-4"],
      createdAt: "2026-02-26T00:00:00.000Z",
      updatedAt: "2026-02-26T00:00:00.000Z"
    }
  ]);
});

test("first local user keeps admin claim after providing display name", async () => {
  const originalFetch = globalThis.fetch;
  const originalClientId = process.env.VITE_GOOGLE_CLIENT_ID;
  process.env.VITE_GOOGLE_CLIENT_ID = "manual-test-client-id";

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("oauth2/v3/tokeninfo")) {
      return {
        ok: true,
        async json() {
          return {
            aud: "manual-test-client-id",
            exp: String(Math.floor(Date.now() / 1000) + 3600),
            email: "first-admin@example.com",
            sub: "first-admin-user"
          };
        }
      } as Response;
    }
    return {
      ok: true,
      async json() {
        return {
          name: "First Admin"
        };
      }
    } as Response;
  }) as typeof fetch;

  try {
    const missingDisplayNameResponse = (await handler({
      rawPath: "/api/auth/google/session",
      body: JSON.stringify({
        accessToken: "token-without-display-name"
      }),
      headers: {},
      requestContext: {
        http: {
          method: "POST"
        }
      }
    })) as HandlerResponse;

    assert.equal(missingDisplayNameResponse.statusCode, 400);
    assert.deepEqual(JSON.parse(missingDisplayNameResponse.body), {
      message: "Display name is required."
    });

    const successfulResponse = (await handler({
      rawPath: "/api/auth/google/session",
      body: JSON.stringify({
        accessToken: "token-with-display-name",
        displayName: "Admin One"
      }),
      headers: {},
      requestContext: {
        http: {
          method: "POST"
        }
      }
    })) as HandlerResponse;

    assert.equal(successfulResponse.statusCode, 200);
    const parsed = JSON.parse(successfulResponse.body);
    assert.equal(parsed.authenticated, true);
    assert.equal(parsed.user.displayName, "Admin One");
    assert.equal(parsed.user.isAdmin, true);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalClientId === undefined) {
      delete process.env.VITE_GOOGLE_CLIENT_ID;
    } else {
      process.env.VITE_GOOGLE_CLIENT_ID = originalClientId;
    }
  }
});
