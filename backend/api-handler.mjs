import crypto from "node:crypto";

const GOOGLE_TOKENINFO_URL = "https://www.googleapis.com/oauth2/v3/tokeninfo";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

const PROJECT_PK_PREFIX = "PROJECT#";
const PROJECT_NAME_PK_PREFIX = "PROJECT_NAME#";
const PROJECT_SK_META = "META";
const PROJECT_NAME_SK_LOCK = "LOCK";
const COMPETITOR_LIST_PK_PREFIX = "COMPETITOR_LIST#";
const COMPETITOR_LIST_SK_META = "META";
const GAME_PK_PREFIX = "GAME#";
const GAME_SK_META = "META";
const PREDICTION_PK_PREFIX = "PREDICTION#";
const PREDICTION_SK_META = "META";
const PREDICTION_GAME_GSI_PK_PREFIX = "GAME#";
const PREDICTION_COMPETITION_LOCK_PK_PREFIX = "PREDICTION_COMPETITION#";
const PREDICTION_COMPETITION_LOCK_SK = "LOCK";
const ADMIN_LOCK_PK = "ADMIN#LOCK";
const ADMIN_LOCK_SK = "LOCK";
const USER_PK_PREFIX = "USER#";
const USER_SK_PROFILE = "PROFILE";
const SESSION_PK_PREFIX = "SESSION#";
const SESSION_SK_META = "META";
const SESSION_COOKIE_NAME = "sport_rank_session";

const inMemoryProjectsById = new Map();
const inMemoryProjectIdByNameKey = new Map();
const inMemoryCompetitorListsById = new Map();
const inMemoryGamesById = new Map();
const inMemoryPredictionsById = new Map();
const inMemoryCompetitionLockByGameUser = new Map();
let inMemoryAdminLockUserId = null;
const inMemoryUsersById = new Map();
const inMemorySessionsById = new Map();

function json(statusCode, payload, options = {}) {
  const headers = options.headers ?? {};
  const cookies = options.cookies ?? [];
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    },
    ...(cookies.length > 0 ? { cookies } : {}),
    body: JSON.stringify(payload)
  };
}

function normalizeProjectName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeDisplayName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeColor(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`Invalid color value "${value}". Use a 6-digit hex color.`);
  }
  return `#${hex.toUpperCase()}`;
}

function parseCompetitorListInput(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Competitor list must be an object.");
  }
  const id = String(payload.id ?? "").trim();
  const name = normalizeProjectName(payload.name ?? "");
  if (!id) {
    throw new Error("Competitor list id is required.");
  }
  if (!name) {
    throw new Error("Competitor list name is required.");
  }
  if (!Array.isArray(payload.competitors)) {
    throw new Error("Competitor list must include a competitors array.");
  }
  const competitors = payload.competitors.map((competitor) => {
    if (!competitor || typeof competitor !== "object" || Array.isArray(competitor)) {
      throw new Error("Competitor must be an object.");
    }
    const competitorId = String(competitor.id ?? "").trim();
    const competitorName = String(competitor.name ?? "").trim();
    if (!competitorId) {
      throw new Error("Competitor id is required.");
    }
    if (!competitorName) {
      throw new Error("Competitor name is required.");
    }
    return {
      id: competitorId,
      name: competitorName,
      subtitle: competitor.subtitle ? String(competitor.subtitle) : null,
      number: competitor.number ? String(competitor.number) : null,
      color: normalizeColor(competitor.color)
    };
  });
  const seen = new Set();
  competitors.forEach((competitor) => {
    if (seen.has(competitor.id)) {
      throw new Error(`Competitor list has duplicate id "${competitor.id}".`);
    }
    seen.add(competitor.id);
  });
  return {
    id,
    name,
    competitors
  };
}

function parseGameInput(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Game must be an object.");
  }
  const id = String(payload.id ?? "").trim();
  const name = normalizeProjectName(payload.name ?? "");
  const competitorListId = String(payload.competitorListId ?? "").trim();
  const closesAtRaw = String(payload.closesAt ?? "").trim();
  if (!id) {
    throw new Error("Game id is required.");
  }
  if (!name) {
    throw new Error("Game name is required.");
  }
  if (!competitorListId) {
    throw new Error("Game competitorListId is required.");
  }
  if (!closesAtRaw) {
    throw new Error("Game closesAt is required.");
  }
  const closesAt = new Date(closesAtRaw);
  if (Number.isNaN(closesAt.getTime())) {
    throw new Error("Game closesAt must be a valid datetime.");
  }
  const results = Array.isArray(payload.results)
    ? payload.results.map((entry) => String(entry))
    : null;
  return {
    id,
    name,
    competitorListId,
    closesAt: closesAt.toISOString(),
    results
  };
}

function parsePredictionInput(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Prediction must be an object.");
  }
  const id = String(payload.id ?? "").trim();
  const gameId = String(payload.gameId ?? "").trim();
  const type = String(payload.type ?? "").trim();
  const name = String(payload.name ?? "").trim();
  const competitorIds = Array.isArray(payload.competitorIds)
    ? payload.competitorIds.map((entry) => String(entry))
    : null;
  if (!id) {
    throw new Error("Prediction id is required.");
  }
  if (!gameId) {
    throw new Error("Prediction gameId is required.");
  }
  if (type !== "competition" && type !== "fun") {
    throw new Error('Prediction type must be "competition" or "fun".');
  }
  if (!competitorIds || competitorIds.length === 0) {
    throw new Error("Prediction competitorIds is required.");
  }
  if (type === "competition" && name) {
    throw new Error("Competition predictions must not include a name.");
  }
  return {
    id,
    gameId,
    type,
    name,
    competitorIds
  };
}

function parsePredictionUpdateInput(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Prediction update must be an object.");
  }
  const name = String(payload.name ?? "").trim();
  const competitorIds = Array.isArray(payload.competitorIds)
    ? payload.competitorIds.map((entry) => String(entry))
    : null;
  if (!competitorIds || competitorIds.length === 0) {
    throw new Error("Prediction competitorIds is required.");
  }
  return {
    name,
    competitorIds
  };
}

function toProjectNameKey(projectName) {
  return normalizeProjectName(projectName).toLowerCase();
}

function parseCookies(cookieHeader) {
  const cookies = {};
  const raw = String(cookieHeader ?? "");
  if (!raw) {
    return cookies;
  }
  raw.split(";").forEach((part) => {
    const [rawName, ...rest] = part.trim().split("=");
    if (!rawName) {
      return;
    }
    cookies[rawName] = decodeURIComponent(rest.join("=") ?? "");
  });
  return cookies;
}

function getSessionIdFromEvent(event) {
  const headers = event?.headers ?? {};
  const cookieHeader = String(headers.cookie ?? headers.Cookie ?? "");
  const parsedFromHeader = parseCookies(cookieHeader);
  const fromHeader = String(parsedFromHeader[SESSION_COOKIE_NAME] ?? "").trim();
  if (fromHeader) {
    return {
      sessionId: fromHeader,
      headerPresent: cookieHeader.length > 0
    };
  }

  const cookieList = Array.isArray(event?.cookies) ? event.cookies : [];
  const parsedFromList = parseCookies(cookieList.join("; "));
  const fromList = String(parsedFromList[SESSION_COOKIE_NAME] ?? "").trim();
  return {
    sessionId: fromList,
    headerPresent: cookieHeader.length > 0 || cookieList.length > 0
  };
}

function buildSetCookie(sessionId, maxAgeSeconds) {
  const secureByDefault = process.env.SESSION_COOKIE_SECURE
    ? process.env.SESSION_COOKIE_SECURE === "true"
    : Boolean(process.env.AWS_EXECUTION_ENV);
  const sameSite = String(process.env.SESSION_COOKIE_SAME_SITE ?? "")
    .trim()
    .toLowerCase();
  const sameSiteValue =
    sameSite === "none"
      ? "None"
      : sameSite === "strict"
        ? "Strict"
        : sameSite === "lax"
          ? "Lax"
          : process.env.AWS_EXECUTION_ENV
            ? "None"
            : "Lax";
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSiteValue}`,
    `Max-Age=${maxAgeSeconds}`
  ];
  if (secureByDefault) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function clearCookieHeader() {
  const secureByDefault = process.env.SESSION_COOKIE_SECURE
    ? process.env.SESSION_COOKIE_SECURE === "true"
    : Boolean(process.env.AWS_EXECUTION_ENV);
  const sameSite = String(process.env.SESSION_COOKIE_SAME_SITE ?? "")
    .trim()
    .toLowerCase();
  const sameSiteValue =
    sameSite === "none"
      ? "None"
      : sameSite === "strict"
        ? "Strict"
        : sameSite === "lax"
          ? "Lax"
          : process.env.AWS_EXECUTION_ENV
            ? "None"
            : "Lax";
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSiteValue}`,
    "Max-Age=0"
  ];
  if (secureByDefault) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

async function parseJsonBody(rawBody) {
  if (!rawBody) {
    return null;
  }
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error("Body must be valid JSON.");
  }
}

function buildProjectSummary(project) {
  return {
    projectId: project.projectId,
    name: project.name,
    ownerUserId: project.ownerUserId,
    version: project.version,
    updatedAt: project.updatedAt
  };
}

function buildProjectDetails(project) {
  return {
    ...buildProjectSummary(project),
    payload: project.payload
  };
}

function buildCompetitorListSummary(list) {
  return {
    competitorListId: list.competitorListId,
    name: list.name,
    updatedAt: list.updatedAt
  };
}

function buildCompetitorListDetails(list) {
  return {
    ...buildCompetitorListSummary(list),
    competitors: list.competitors
  };
}

function buildGameSummary(game) {
  return {
    gameId: game.gameId,
    name: game.name,
    competitorListId: game.competitorListId,
    closesAt: game.closesAt,
    updatedAt: game.updatedAt,
    results: game.results ?? null
  };
}

export async function listProjectSummariesFromDynamoScan(
  dynamodbClient,
  ScanCommand,
  tableName
) {
  const projects = [];
  let exclusiveStartKey = undefined;

  do {
    const response = await dynamodbClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "itemType = :itemType",
        ExpressionAttributeValues: {
          ":itemType": "project"
        },
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {})
      })
    );

    for (const item of response.Items ?? []) {
      projects.push({
        projectId: String(item.projectId),
        name: String(item.name),
        ownerUserId: String(item.ownerUserId),
        version: Number(item.version ?? 1),
        updatedAt: String(item.updatedAt)
      });
    }

    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return projects;
}

export async function listCompetitorListsFromDynamoScan(
  dynamodbClient,
  ScanCommand,
  tableName
) {
  const lists = [];
  let exclusiveStartKey = undefined;

  do {
    const response = await dynamodbClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "itemType = :itemType",
        ExpressionAttributeValues: {
          ":itemType": "competitor_list"
        },
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {})
      })
    );

    for (const item of response.Items ?? []) {
      lists.push({
        competitorListId: String(item.competitorListId),
        name: String(item.name),
        competitors: Array.isArray(item.competitors) ? item.competitors : [],
        updatedAt: String(item.updatedAt)
      });
    }

    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return lists;
}

export async function listGamesFromDynamoScan(dynamodbClient, ScanCommand, tableName) {
  const games = [];
  let exclusiveStartKey = undefined;

  do {
    const response = await dynamodbClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "itemType = :itemType",
        ExpressionAttributeValues: {
          ":itemType": "game"
        },
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {})
      })
    );

    for (const item of response.Items ?? []) {
      games.push({
        gameId: String(item.gameId),
        name: String(item.name),
        competitorListId: String(item.competitorListId),
        closesAt: String(item.closesAt),
        updatedAt: String(item.updatedAt),
        results: Array.isArray(item.results)
          ? item.results.map((entry) => String(entry))
          : null
      });
    }

    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return games;
}

export async function listPredictionsForGameFromDynamoQuery(
  dynamodbClient,
  QueryCommand,
  tableName,
  gameId
) {
  const predictions = [];
  let lastEvaluatedKey = undefined;

  do {
    const response = await dynamodbClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "gsi1",
        KeyConditionExpression: "gsi1pk = :gsi1pk",
        ExpressionAttributeValues: {
          ":gsi1pk": `${PREDICTION_GAME_GSI_PK_PREFIX}${gameId}`
        },
        ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {})
      })
    );

    for (const item of response.Items ?? []) {
      predictions.push({
        predictionId: String(item.predictionId),
        gameId: String(item.gameId),
        ownerUserId: String(item.ownerUserId),
        ownerDisplayName: String(item.ownerDisplayName),
        type: String(item.type),
        name: String(item.name ?? ""),
        competitorIds: Array.isArray(item.competitorIds)
          ? item.competitorIds.map((entry) => String(entry))
          : [],
        createdAt: String(item.createdAt),
        updatedAt: String(item.updatedAt)
      });
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return predictions;
}

function createInMemoryStore() {
  return {
    async listProjects() {
      return [...inMemoryProjectsById.values()]
        .map((project) => buildProjectSummary(project))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async getProject(projectId) {
      const project = inMemoryProjectsById.get(projectId);
      return project ? buildProjectDetails(project) : null;
    },

    async createProject(actor, name, payload) {
      const normalizedName = normalizeProjectName(name);
      const nameKey = toProjectNameKey(normalizedName);
      if (!normalizedName) {
        throw new Error("Project name is required.");
      }
      if (!payload) {
        throw new Error("Project payload is required.");
      }
      if (inMemoryProjectIdByNameKey.has(nameKey)) {
        return { conflict: true };
      }
      const projectId = `project-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      const now = new Date().toISOString();
      const project = {
        projectId,
        name: normalizedName,
        ownerUserId: actor.userId,
        payload,
        version: 1,
        createdAt: now,
        updatedAt: now
      };
      inMemoryProjectsById.set(projectId, project);
      inMemoryProjectIdByNameKey.set(nameKey, projectId);
      return { project: buildProjectDetails(project) };
    },

    async updateProject(actor, projectId, name, payload) {
      const project = inMemoryProjectsById.get(projectId);
      if (!project) {
        return { notFound: true };
      }
      if (project.ownerUserId !== actor.userId) {
        return { forbidden: true };
      }
      const normalizedName = normalizeProjectName(name);
      const nextNameKey = toProjectNameKey(normalizedName);
      const currentNameKey = toProjectNameKey(project.name);
      if (!normalizedName) {
        throw new Error("Project name is required.");
      }
      if (!payload) {
        throw new Error("Project payload is required.");
      }
      if (nextNameKey !== currentNameKey && inMemoryProjectIdByNameKey.has(nextNameKey)) {
        return { conflict: true };
      }
      if (nextNameKey !== currentNameKey) {
        inMemoryProjectIdByNameKey.delete(currentNameKey);
        inMemoryProjectIdByNameKey.set(nextNameKey, projectId);
      }
      const updatedProject = {
        ...project,
        name: normalizedName,
        payload,
        version: project.version + 1,
        updatedAt: new Date().toISOString()
      };
      inMemoryProjectsById.set(projectId, updatedProject);
      return { project: buildProjectDetails(updatedProject) };
    },

    async listCompetitorLists() {
      return [...inMemoryCompetitorListsById.values()]
        .map((list) => buildCompetitorListDetails(list))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async getCompetitorList(competitorListId) {
      const list = inMemoryCompetitorListsById.get(competitorListId);
      return list ? buildCompetitorListDetails(list) : null;
    },

    async createCompetitorList(actor, list) {
      if (inMemoryCompetitorListsById.has(list.id)) {
        return { conflict: true };
      }
      const now = new Date().toISOString();
      const stored = {
        competitorListId: list.id,
        name: list.name,
        competitors: list.competitors,
        createdAt: now,
        updatedAt: now
      };
      inMemoryCompetitorListsById.set(list.id, stored);
      return { list: buildCompetitorListDetails(stored) };
    },

    async updateCompetitorList(actor, competitorListId, list) {
      const existing = inMemoryCompetitorListsById.get(competitorListId);
      if (!existing) {
        return { notFound: true };
      }
      const now = new Date().toISOString();
      const updated = {
        ...existing,
        name: list.name,
        competitors: list.competitors,
        updatedAt: now
      };
      inMemoryCompetitorListsById.set(competitorListId, updated);
      return { list: buildCompetitorListDetails(updated) };
    },

    async listGames() {
      return [...inMemoryGamesById.values()]
        .map((game) => buildGameSummary(game))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async getGame(gameId) {
      const game = inMemoryGamesById.get(gameId);
      return game ? buildGameSummary(game) : null;
    },

    async createGame(actor, game) {
      if (inMemoryGamesById.has(game.id)) {
        return { conflict: true };
      }
      const now = new Date().toISOString();
      const stored = {
        gameId: game.id,
        name: game.name,
        competitorListId: game.competitorListId,
        closesAt: game.closesAt,
        results: game.results ?? null,
        createdAt: now,
        updatedAt: now
      };
      inMemoryGamesById.set(game.id, stored);
      return { game: buildGameSummary(stored) };
    },

    async updateGame(actor, gameId, game) {
      const existing = inMemoryGamesById.get(gameId);
      if (!existing) {
        return { notFound: true };
      }
      const now = new Date().toISOString();
      const updated = {
        ...existing,
        name: game.name,
        competitorListId: game.competitorListId,
        closesAt: game.closesAt,
        results: game.results ?? null,
        updatedAt: now
      };
      inMemoryGamesById.set(gameId, updated);
      return { game: buildGameSummary(updated) };
    },

    async listPredictionsForGame(gameId) {
      return [...inMemoryPredictionsById.values()]
        .filter((prediction) => prediction.gameId === gameId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((prediction) => ({
          predictionId: prediction.predictionId,
          gameId: prediction.gameId,
          ownerUserId: prediction.ownerUserId,
          ownerDisplayName: prediction.ownerDisplayName,
          type: prediction.type,
          name: prediction.name ?? "",
          competitorIds: prediction.competitorIds,
          createdAt: prediction.createdAt,
          updatedAt: prediction.updatedAt
        }));
    },

    async getPrediction(predictionId) {
      const prediction = inMemoryPredictionsById.get(predictionId);
      if (!prediction) {
        return null;
      }
      return {
        predictionId: prediction.predictionId,
        gameId: prediction.gameId,
        ownerUserId: prediction.ownerUserId,
        ownerDisplayName: prediction.ownerDisplayName,
        type: prediction.type,
        name: prediction.name ?? "",
        competitorIds: prediction.competitorIds,
        createdAt: prediction.createdAt,
        updatedAt: prediction.updatedAt
      };
    },

    async createPrediction(actor, prediction, game) {
      if (inMemoryPredictionsById.has(prediction.id)) {
        return { conflict: true };
      }
      const gameId = game.gameId ?? game.id;
      if (prediction.type === "competition") {
        const lockKey = `${gameId}#${actor.userId}`;
        if (inMemoryCompetitionLockByGameUser.has(lockKey)) {
          return { conflict: true };
        }
        const closesAt = Date.parse(game.closesAt);
        if (Number.isFinite(closesAt) && closesAt <= Date.now()) {
          return { closed: true };
        }
        inMemoryCompetitionLockByGameUser.set(lockKey, prediction.id);
      }
      const now = new Date().toISOString();
      const stored = {
        predictionId: prediction.id,
        gameId: prediction.gameId,
        ownerUserId: actor.userId,
        ownerDisplayName: actor.displayName,
        type: prediction.type,
        name: prediction.name ?? "",
        competitorIds: prediction.competitorIds,
        createdAt: now,
        updatedAt: now
      };
      inMemoryPredictionsById.set(prediction.id, stored);
      return { prediction: stored };
    },

    async updatePrediction(actor, predictionId, prediction, game) {
      const existing = inMemoryPredictionsById.get(predictionId);
      if (!existing) {
        return { notFound: true };
      }
      if (existing.ownerUserId !== actor.userId) {
        return { forbidden: true };
      }
      if (existing.type === "competition") {
        const closesAt = Date.parse(game.closesAt);
        if (Number.isFinite(closesAt) && closesAt <= Date.now()) {
          return { locked: true };
        }
      }
      const now = new Date().toISOString();
      const updated = {
        ...existing,
        name: existing.type === "competition" ? "" : prediction.name ?? "",
        competitorIds: prediction.competitorIds,
        updatedAt: now
      };
      inMemoryPredictionsById.set(predictionId, updated);
      return { prediction: updated };
    },

    async deletePrediction(actor, predictionId, game) {
      const existing = inMemoryPredictionsById.get(predictionId);
      if (!existing) {
        return { notFound: true };
      }
      if (existing.ownerUserId !== actor.userId) {
        return { forbidden: true };
      }
      if (existing.type === "competition") {
        const closesAt = Date.parse(game.closesAt);
        if (Number.isFinite(closesAt) && closesAt <= Date.now()) {
          return { locked: true };
        }
      }
      inMemoryPredictionsById.delete(predictionId);
      if (existing.type === "competition") {
        const gameId = game.gameId ?? game.id;
        const lockKey = `${gameId}#${actor.userId}`;
        inMemoryCompetitionLockByGameUser.delete(lockKey);
      }
      return { deleted: true };
    },

    async upsertUser(googleIdentity, preferredDisplayName) {
      const displayName =
        normalizeDisplayName(preferredDisplayName) ||
        normalizeDisplayName(googleIdentity.name) ||
        googleIdentity.email;
      const existing = inMemoryUsersById.get(googleIdentity.sub);
      const existingIsAdmin = existing?.isAdmin;
      const now = new Date().toISOString();
      let isAdmin =
        typeof existingIsAdmin === "boolean"
          ? existingIsAdmin
          : false;
      if (existingIsAdmin && !inMemoryAdminLockUserId) {
        inMemoryAdminLockUserId = googleIdentity.sub;
      }
      if (!existing && !inMemoryAdminLockUserId) {
        inMemoryAdminLockUserId = googleIdentity.sub;
        isAdmin = true;
      }
      const user = {
        userId: googleIdentity.sub,
        email: googleIdentity.email,
        displayName,
        isAdmin,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      };
      inMemoryUsersById.set(googleIdentity.sub, user);
      return user;
    },

    async createSession(user, ttlSeconds) {
      const sessionId = crypto.randomBytes(24).toString("base64url");
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      inMemorySessionsById.set(sessionId, {
        sessionId,
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        isAdmin: Boolean(user.isAdmin),
        expiresAt
      });
      return {
        sessionId,
        user: {
          userId: user.userId,
          email: user.email,
          displayName: user.displayName,
          isAdmin: Boolean(user.isAdmin)
        },
        expiresAt
      };
    },

    async getSession(sessionId) {
      const session = inMemorySessionsById.get(sessionId);
      if (!session) {
        return null;
      }
      if (Date.parse(session.expiresAt) <= Date.now()) {
        inMemorySessionsById.delete(sessionId);
        return null;
      }
      return session;
    },

    async deleteSession(sessionId) {
      inMemorySessionsById.delete(sessionId);
    },

    async getUserById(userId) {
      const user = inMemoryUsersById.get(String(userId));
      if (!user) {
        return null;
      }
      return {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        isAdmin: Boolean(user.isAdmin)
      };
    }
  };
}

async function createDynamoStore() {
  const tableName = process.env.APP_TABLE_NAME;
  if (!tableName) {
    throw new Error("APP_TABLE_NAME is required for DynamoDB store.");
  }

  const [{ DynamoDBClient }, dynamodb] = await Promise.all([
    import("@aws-sdk/client-dynamodb"),
    import("@aws-sdk/lib-dynamodb")
  ]);
  const {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    ScanCommand,
    DeleteCommand,
    UpdateCommand
  } = dynamodb;
  const dynamodbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  return {
    async listProjects() {
      const items = await listProjectSummariesFromDynamoScan(
        dynamodbClient,
        ScanCommand,
        tableName
      );
      return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async getProject(projectId) {
      const response = await dynamodbClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            pk: `${PROJECT_PK_PREFIX}${projectId}`,
            sk: PROJECT_SK_META
          }
        })
      );
      const item = response.Item;
      if (!item) {
        return null;
      }
      return {
        projectId: String(item.projectId),
        name: String(item.name),
        ownerUserId: String(item.ownerUserId),
        version: Number(item.version ?? 1),
        updatedAt: String(item.updatedAt),
        payload: item.payload
      };
    },

    async createProject(actor, name, payload) {
      const normalizedName = normalizeProjectName(name);
      const nameKey = toProjectNameKey(normalizedName);
      if (!normalizedName) {
        throw new Error("Project name is required.");
      }
      if (!payload) {
        throw new Error("Project payload is required.");
      }
      const existingName = await dynamodbClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            pk: `${PROJECT_NAME_PK_PREFIX}${nameKey}`,
            sk: PROJECT_NAME_SK_LOCK
          }
        })
      );
      if (existingName.Item) {
        return { conflict: true };
      }

      const projectId = `project-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      const now = new Date().toISOString();
      const projectItem = {
        pk: `${PROJECT_PK_PREFIX}${projectId}`,
        sk: PROJECT_SK_META,
        itemType: "project",
        projectId,
        name: normalizedName,
        ownerUserId: actor.userId,
        payload,
        version: 1,
        createdAt: now,
        updatedAt: now
      };

      await dynamodbClient.send(
        new PutCommand({
          TableName: tableName,
          Item: projectItem,
          ConditionExpression: "attribute_not_exists(pk)"
        })
      );
      try {
        await dynamodbClient.send(
          new PutCommand({
            TableName: tableName,
            Item: {
              pk: `${PROJECT_NAME_PK_PREFIX}${nameKey}`,
              sk: PROJECT_NAME_SK_LOCK,
              itemType: "project_name",
              projectId
            },
            ConditionExpression: "attribute_not_exists(pk)"
          })
        );
      } catch (error) {
        await dynamodbClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: {
              pk: projectItem.pk,
              sk: projectItem.sk
            }
          })
        );
        if (error && typeof error === "object" && "name" in error && error.name === "ConditionalCheckFailedException") {
          return { conflict: true };
        }
        throw error;
      }

      return {
        project: {
          projectId,
          name: normalizedName,
          ownerUserId: actor.userId,
          version: 1,
          updatedAt: now,
          payload
        }
      };
    },

    async updateProject(actor, projectId, name, payload) {
      const current = await this.getProject(projectId);
      if (!current) {
        return { notFound: true };
      }
      if (current.ownerUserId !== actor.userId) {
        return { forbidden: true };
      }
      const normalizedName = normalizeProjectName(name);
      const nextNameKey = toProjectNameKey(normalizedName);
      const currentNameKey = toProjectNameKey(current.name);
      if (!normalizedName) {
        throw new Error("Project name is required.");
      }
      if (!payload) {
        throw new Error("Project payload is required.");
      }
      if (nextNameKey !== currentNameKey) {
        const existingName = await dynamodbClient.send(
          new GetCommand({
            TableName: tableName,
            Key: {
              pk: `${PROJECT_NAME_PK_PREFIX}${nextNameKey}`,
              sk: PROJECT_NAME_SK_LOCK
            }
          })
        );
        if (existingName.Item) {
          return { conflict: true };
        }
      }
      const now = new Date().toISOString();
      const nextVersion = current.version + 1;
      await dynamodbClient.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            pk: `${PROJECT_PK_PREFIX}${projectId}`,
            sk: PROJECT_SK_META
          },
          UpdateExpression:
            "SET #name = :name, #payload = :payload, #version = :version, #updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#name": "name",
            "#payload": "payload",
            "#version": "version",
            "#updatedAt": "updatedAt"
          },
          ExpressionAttributeValues: {
            ":name": normalizedName,
            ":payload": payload,
            ":version": nextVersion,
            ":updatedAt": now
          }
        })
      );
      if (nextNameKey !== currentNameKey) {
        await dynamodbClient.send(
          new PutCommand({
            TableName: tableName,
            Item: {
              pk: `${PROJECT_NAME_PK_PREFIX}${nextNameKey}`,
              sk: PROJECT_NAME_SK_LOCK,
              itemType: "project_name",
              projectId
            },
            ConditionExpression: "attribute_not_exists(pk)"
          })
        );
        await dynamodbClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: {
              pk: `${PROJECT_NAME_PK_PREFIX}${currentNameKey}`,
              sk: PROJECT_NAME_SK_LOCK
            }
          })
        );
      }
      return {
        project: {
          projectId,
          name: normalizedName,
          ownerUserId: actor.userId,
          version: nextVersion,
          updatedAt: now,
          payload
        }
      };
    },

    async listCompetitorLists() {
      const items = await listCompetitorListsFromDynamoScan(
        dynamodbClient,
        ScanCommand,
        tableName
      );
      return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async getCompetitorList(competitorListId) {
      const response = await dynamodbClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            pk: `${COMPETITOR_LIST_PK_PREFIX}${competitorListId}`,
            sk: COMPETITOR_LIST_SK_META
          }
        })
      );
      const item = response.Item;
      if (!item) {
        return null;
      }
      return {
        competitorListId: String(item.competitorListId),
        name: String(item.name),
        competitors: Array.isArray(item.competitors) ? item.competitors : [],
        updatedAt: String(item.updatedAt)
      };
    },

    async createCompetitorList(actor, list) {
      const now = new Date().toISOString();
      const item = {
        pk: `${COMPETITOR_LIST_PK_PREFIX}${list.id}`,
        sk: COMPETITOR_LIST_SK_META,
        itemType: "competitor_list",
        competitorListId: list.id,
        name: list.name,
        competitors: list.competitors,
        createdAt: now,
        updatedAt: now
      };
      try {
        await dynamodbClient.send(
          new PutCommand({
            TableName: tableName,
            Item: item,
            ConditionExpression: "attribute_not_exists(pk)"
          })
        );
      } catch (error) {
        if (error && error.name === "ConditionalCheckFailedException") {
          return { conflict: true };
        }
        throw error;
      }
      return {
        list: {
          competitorListId: list.id,
          name: list.name,
          competitors: list.competitors,
          updatedAt: now
        }
      };
    },

    async updateCompetitorList(actor, competitorListId, list) {
      const existing = await dynamodbClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            pk: `${COMPETITOR_LIST_PK_PREFIX}${competitorListId}`,
            sk: COMPETITOR_LIST_SK_META
          }
        })
      );
      if (!existing.Item) {
        return { notFound: true };
      }
      const now = new Date().toISOString();
      await dynamodbClient.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            pk: `${COMPETITOR_LIST_PK_PREFIX}${competitorListId}`,
            sk: COMPETITOR_LIST_SK_META,
            itemType: "competitor_list",
            competitorListId,
            name: list.name,
            competitors: list.competitors,
            createdAt: existing.Item.createdAt ?? now,
            updatedAt: now
          }
        })
      );
      return {
        list: {
          competitorListId,
          name: list.name,
          competitors: list.competitors,
          updatedAt: now
        }
      };
    },

    async listGames() {
      const items = await listGamesFromDynamoScan(dynamodbClient, ScanCommand, tableName);
      return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async getGame(gameId) {
      const response = await dynamodbClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            pk: `${GAME_PK_PREFIX}${gameId}`,
            sk: GAME_SK_META
          }
        })
      );
      const item = response.Item;
      if (!item) {
        return null;
      }
      return {
        gameId: String(item.gameId),
        name: String(item.name),
        competitorListId: String(item.competitorListId),
        closesAt: String(item.closesAt),
        updatedAt: String(item.updatedAt),
        results: Array.isArray(item.results)
          ? item.results.map((entry) => String(entry))
          : null
      };
    },

    async createGame(actor, game) {
      const now = new Date().toISOString();
      const item = {
        pk: `${GAME_PK_PREFIX}${game.id}`,
        sk: GAME_SK_META,
        itemType: "game",
        gameId: game.id,
        name: game.name,
        competitorListId: game.competitorListId,
        closesAt: game.closesAt,
        results: game.results ?? null,
        createdAt: now,
        updatedAt: now
      };
      try {
        await dynamodbClient.send(
          new PutCommand({
            TableName: tableName,
            Item: item,
            ConditionExpression: "attribute_not_exists(pk)"
          })
        );
      } catch (error) {
        if (error && error.name === "ConditionalCheckFailedException") {
          return { conflict: true };
        }
        throw error;
      }
      return { game: buildGameSummary({ ...item, results: item.results }) };
    },

    async updateGame(actor, gameId, game) {
      const existing = await dynamodbClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            pk: `${GAME_PK_PREFIX}${gameId}`,
            sk: GAME_SK_META
          }
        })
      );
      if (!existing.Item) {
        return { notFound: true };
      }
      const now = new Date().toISOString();
      await dynamodbClient.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            pk: `${GAME_PK_PREFIX}${gameId}`,
            sk: GAME_SK_META,
            itemType: "game",
            gameId,
            name: game.name,
            competitorListId: game.competitorListId,
            closesAt: game.closesAt,
            results: game.results ?? null,
            createdAt: existing.Item.createdAt ?? now,
            updatedAt: now
          }
        })
      );
      return {
        game: {
          gameId,
          name: game.name,
          competitorListId: game.competitorListId,
          closesAt: game.closesAt,
          updatedAt: now,
          results: game.results ?? null
        }
      };
    },

    async listPredictionsForGame(gameId) {
      const items = await listPredictionsForGameFromDynamoQuery(
        dynamodbClient,
        QueryCommand,
        tableName,
        gameId
      );
      return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async getPrediction(predictionId) {
      const response = await dynamodbClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            pk: `${PREDICTION_PK_PREFIX}${predictionId}`,
            sk: PREDICTION_SK_META
          }
        })
      );
      const item = response.Item;
      if (!item) {
        return null;
      }
      return {
        predictionId: String(item.predictionId),
        gameId: String(item.gameId),
        ownerUserId: String(item.ownerUserId),
        ownerDisplayName: String(item.ownerDisplayName),
        type: String(item.type),
        name: String(item.name ?? ""),
        competitorIds: Array.isArray(item.competitorIds)
          ? item.competitorIds.map((entry) => String(entry))
          : [],
        createdAt: String(item.createdAt),
        updatedAt: String(item.updatedAt)
      };
    },

    async createPrediction(actor, prediction, game) {
      let lockCreated = false;
      const now = new Date().toISOString();
      const gameId = game.gameId ?? game.id;
      if (prediction.type === "competition") {
        const closesAt = Date.parse(game.closesAt);
        if (Number.isFinite(closesAt) && closesAt <= Date.now()) {
          return { closed: true };
        }
        try {
          await dynamodbClient.send(
            new PutCommand({
              TableName: tableName,
              Item: {
                pk: `${PREDICTION_COMPETITION_LOCK_PK_PREFIX}${gameId}#${actor.userId}`,
                sk: PREDICTION_COMPETITION_LOCK_SK,
                itemType: "prediction_competition_lock",
                predictionId: prediction.id,
                gameId,
                userId: actor.userId,
                createdAt: now
              },
              ConditionExpression: "attribute_not_exists(pk)"
            })
          );
          lockCreated = true;
        } catch (error) {
          if (error && error.name === "ConditionalCheckFailedException") {
            return { conflict: true };
          }
          throw error;
        }
      }

      const item = {
        pk: `${PREDICTION_PK_PREFIX}${prediction.id}`,
        sk: PREDICTION_SK_META,
        itemType: "prediction",
        predictionId: prediction.id,
        gameId: prediction.gameId,
        ownerUserId: actor.userId,
        ownerDisplayName: actor.displayName,
        type: prediction.type,
        name: prediction.name ?? "",
        competitorIds: prediction.competitorIds,
        gsi1pk: `${PREDICTION_GAME_GSI_PK_PREFIX}${prediction.gameId}`,
        gsi1sk: `PREDICTION#${now}#${prediction.id}`,
        createdAt: now,
        updatedAt: now
      };

      try {
        await dynamodbClient.send(
          new PutCommand({
            TableName: tableName,
            Item: item,
            ConditionExpression: "attribute_not_exists(pk)"
          })
        );
      } catch (error) {
        if (lockCreated) {
          await dynamodbClient.send(
            new DeleteCommand({
              TableName: tableName,
              Key: {
                pk: `${PREDICTION_COMPETITION_LOCK_PK_PREFIX}${gameId}#${actor.userId}`,
                sk: PREDICTION_COMPETITION_LOCK_SK
              }
            })
          );
        }
        if (error && error.name === "ConditionalCheckFailedException") {
          return { conflict: true };
        }
        throw error;
      }

      return {
        prediction: {
          predictionId: prediction.id,
          gameId: prediction.gameId,
          ownerUserId: actor.userId,
          ownerDisplayName: actor.displayName,
          type: prediction.type,
          name: prediction.name ?? "",
          competitorIds: prediction.competitorIds,
          createdAt: now,
          updatedAt: now
        }
      };
    },

    async updatePrediction(actor, predictionId, prediction, game) {
      const existing = await dynamodbClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            pk: `${PREDICTION_PK_PREFIX}${predictionId}`,
            sk: PREDICTION_SK_META
          }
        })
      );
      if (!existing.Item) {
        return { notFound: true };
      }
      if (String(existing.Item.ownerUserId) !== actor.userId) {
        return { forbidden: true };
      }
      if (String(existing.Item.type) === "competition") {
        const closesAt = Date.parse(game.closesAt);
        if (Number.isFinite(closesAt) && closesAt <= Date.now()) {
          return { locked: true };
        }
      }
      const now = new Date().toISOString();
      const nameValue =
        String(existing.Item.type) === "competition" ? "" : prediction.name ?? "";
      await dynamodbClient.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            pk: `${PREDICTION_PK_PREFIX}${predictionId}`,
            sk: PREDICTION_SK_META
          },
          UpdateExpression:
            "SET #name = :name, #competitorIds = :competitorIds, #updatedAt = :updatedAt, #gsi1sk = :gsi1sk",
          ExpressionAttributeNames: {
            "#name": "name",
            "#competitorIds": "competitorIds",
            "#updatedAt": "updatedAt",
            "#gsi1sk": "gsi1sk"
          },
          ExpressionAttributeValues: {
            ":name": nameValue,
            ":competitorIds": prediction.competitorIds,
            ":updatedAt": now,
            ":gsi1sk": `PREDICTION#${now}#${predictionId}`
          }
        })
      );
      return {
        prediction: {
          predictionId,
          gameId: String(existing.Item.gameId),
          ownerUserId: String(existing.Item.ownerUserId),
          ownerDisplayName: String(existing.Item.ownerDisplayName),
          type: String(existing.Item.type),
          name: nameValue,
          competitorIds: prediction.competitorIds,
          createdAt: String(existing.Item.createdAt),
          updatedAt: now
        }
      };
    },

    async deletePrediction(actor, predictionId, game) {
      const existing = await dynamodbClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            pk: `${PREDICTION_PK_PREFIX}${predictionId}`,
            sk: PREDICTION_SK_META
          }
        })
      );
      if (!existing.Item) {
        return { notFound: true };
      }
      if (String(existing.Item.ownerUserId) !== actor.userId) {
        return { forbidden: true };
      }
      if (String(existing.Item.type) === "competition") {
        const closesAt = Date.parse(game.closesAt);
        if (Number.isFinite(closesAt) && closesAt <= Date.now()) {
          return { locked: true };
        }
      }
      await dynamodbClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: {
            pk: `${PREDICTION_PK_PREFIX}${predictionId}`,
            sk: PREDICTION_SK_META
          }
        })
      );
      if (String(existing.Item.type) === "competition") {
        const gameId = game.gameId ?? game.id;
        await dynamodbClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: {
              pk: `${PREDICTION_COMPETITION_LOCK_PK_PREFIX}${gameId}#${actor.userId}`,
              sk: PREDICTION_COMPETITION_LOCK_SK
            }
          })
        );
      }
      return { deleted: true };
    },

    async upsertUser(googleIdentity, preferredDisplayName) {
      const now = new Date().toISOString();
      const existing = await dynamodbClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            pk: `${USER_PK_PREFIX}${googleIdentity.sub}`,
            sk: USER_SK_PROFILE
          }
        })
      );
      let isAdmin = existing.Item?.isAdmin;
      if (typeof isAdmin !== "boolean") {
        isAdmin = false;
      }
      if (!existing.Item) {
        const adminLock = await dynamodbClient.send(
          new GetCommand({
            TableName: tableName,
            Key: {
              pk: ADMIN_LOCK_PK,
              sk: ADMIN_LOCK_SK
            }
          })
        );
        if (adminLock.Item) {
          isAdmin = false;
        } else {
          const usersScan = await dynamodbClient.send(
            new ScanCommand({
              TableName: tableName,
              FilterExpression: "begins_with(pk, :prefix) AND sk = :sk",
              ExpressionAttributeValues: {
                ":prefix": USER_PK_PREFIX,
                ":sk": USER_SK_PROFILE
              },
              ProjectionExpression: "pk",
              Limit: 1,
              ConsistentRead: true
            })
          );
          if (!usersScan.Items || usersScan.Items.length === 0) {
            try {
              await dynamodbClient.send(
                new PutCommand({
                  TableName: tableName,
                  Item: {
                    pk: ADMIN_LOCK_PK,
                    sk: ADMIN_LOCK_SK,
                    itemType: "admin_lock",
                    userId: googleIdentity.sub,
                    createdAt: now
                  },
                  ConditionExpression: "attribute_not_exists(pk)"
                })
              );
              isAdmin = true;
            } catch (error) {
              if (error && error.name === "ConditionalCheckFailedException") {
                isAdmin = false;
              } else {
                throw error;
              }
            }
          } else {
            isAdmin = false;
          }
        }
      } else if (typeof existing.Item?.isAdmin !== "boolean") {
        const adminLock = await dynamodbClient.send(
          new GetCommand({
            TableName: tableName,
            Key: {
              pk: ADMIN_LOCK_PK,
              sk: ADMIN_LOCK_SK
            }
          })
        );
        if (adminLock.Item?.userId === googleIdentity.sub) {
          isAdmin = true;
        }
      }
      const displayName =
        normalizeDisplayName(preferredDisplayName) ||
        normalizeDisplayName(googleIdentity.name) ||
        googleIdentity.email;
      const user = {
        userId: googleIdentity.sub,
        email: googleIdentity.email,
        displayName,
        isAdmin,
        createdAt: existing.Item?.createdAt ?? now,
        updatedAt: now
      };
      await dynamodbClient.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            pk: `${USER_PK_PREFIX}${googleIdentity.sub}`,
            sk: USER_SK_PROFILE,
            itemType: "user",
            ...user
          }
        })
      );
      return user;
    },

    async createSession(user, ttlSeconds) {
      const sessionId = crypto.randomBytes(24).toString("base64url");
      const expiresAtEpochSeconds = Math.floor(Date.now() / 1000) + ttlSeconds;
      const expiresAt = new Date(expiresAtEpochSeconds * 1000).toISOString();
      await dynamodbClient.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            pk: `${SESSION_PK_PREFIX}${sessionId}`,
            sk: SESSION_SK_META,
            itemType: "session",
            sessionId,
            userId: user.userId,
            email: user.email,
            displayName: user.displayName,
            isAdmin: Boolean(user.isAdmin),
            expiresAt,
            ttlEpochSeconds: expiresAtEpochSeconds
          }
        })
      );
      return {
        sessionId,
        user: {
          userId: user.userId,
          email: user.email,
          displayName: user.displayName,
          isAdmin: Boolean(user.isAdmin)
        },
        expiresAt
      };
    },

    async getSession(sessionId) {
      const response = await dynamodbClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            pk: `${SESSION_PK_PREFIX}${sessionId}`,
            sk: SESSION_SK_META
          }
        })
      );
      const item = response.Item;
      if (!item) {
        return null;
      }
      if (Date.parse(String(item.expiresAt)) <= Date.now()) {
        await this.deleteSession(sessionId);
        return null;
      }
      return {
        sessionId,
        userId: String(item.userId),
        email: String(item.email),
        displayName: String(item.displayName),
        isAdmin: Boolean(item.isAdmin),
        expiresAt: String(item.expiresAt)
      };
    },

    async deleteSession(sessionId) {
      await dynamodbClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: {
            pk: `${SESSION_PK_PREFIX}${sessionId}`,
            sk: SESSION_SK_META
          }
        })
      );
    },

    async getUserById(userId) {
      const response = await dynamodbClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            pk: `${USER_PK_PREFIX}${String(userId)}`,
            sk: USER_SK_PROFILE
          }
        })
      );
      const item = response.Item;
      if (!item) {
        return null;
      }
      return {
        userId: String(item.userId),
        email: String(item.email),
        displayName: String(item.displayName),
        isAdmin: Boolean(item.isAdmin)
      };
    }
  };
}

let cachedStorePromise = null;

async function getStore() {
  if (!cachedStorePromise) {
    const useDynamo = Boolean(process.env.AWS_EXECUTION_ENV && process.env.APP_TABLE_NAME);
    cachedStorePromise = useDynamo
      ? createDynamoStore()
      : Promise.resolve(createInMemoryStore());
  }
  return await cachedStorePromise;
}

async function verifyGoogleAccessToken(accessToken) {
  const configuredClientId = String(
    process.env.VITE_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? ""
  ).trim();
  if (!configuredClientId) {
    throw new Error("VITE_GOOGLE_CLIENT_ID is not configured in backend.");
  }

  const tokenInfoResponse = await fetch(
    `${GOOGLE_TOKENINFO_URL}?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!tokenInfoResponse.ok) {
    throw new Error("Google token verification failed.");
  }
  const tokenInfo = await tokenInfoResponse.json();
  if (String(tokenInfo.aud ?? "") !== configuredClientId) {
    throw new Error("Google token audience mismatch.");
  }
  const expSeconds = Number.parseInt(String(tokenInfo.exp ?? "0"), 10);
  if (!expSeconds || expSeconds * 1000 <= Date.now()) {
    throw new Error("Google token is expired.");
  }
  const email = String(tokenInfo.email ?? "").trim();
  const sub = String(tokenInfo.sub ?? tokenInfo.user_id ?? "").trim();
  if (!email || !sub) {
    throw new Error("Google token missing required identity fields.");
  }

  const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  let name = email;
  if (userInfoResponse.ok) {
    const userInfo = await userInfoResponse.json();
    name = normalizeDisplayName(userInfo.name) || email;
  }

  return {
    sub,
    email,
    name
  };
}

function readPath(event) {
  const path = event?.rawPath ?? "/";
  const requestPath = String(path);
  const projectMatch = requestPath.match(/^\/api\/projects\/([^/]+)$/);
  const competitorListMatch = requestPath.match(/^\/api\/competitor-lists\/([^/]+)$/);
  const gamePredictionsMatch = requestPath.match(/^\/api\/games\/([^/]+)\/predictions$/);
  const gameMatch = requestPath.match(/^\/api\/games\/([^/]+)$/);
  const predictionMatch = requestPath.match(/^\/api\/predictions\/([^/]+)$/);
  return {
    path: requestPath,
    projectId: projectMatch ? decodeURIComponent(projectMatch[1]) : null,
    competitorListId: competitorListMatch
      ? decodeURIComponent(competitorListMatch[1])
      : null,
    gameId: gameMatch ? decodeURIComponent(gameMatch[1]) : null,
    gamePredictionsId: gamePredictionsMatch
      ? decodeURIComponent(gamePredictionsMatch[1])
      : null,
    predictionId: predictionMatch ? decodeURIComponent(predictionMatch[1]) : null
  };
}

async function getSessionActor(event, store) {
  const { sessionId } = getSessionIdFromEvent(event);
  if (!sessionId) {
    return null;
  }
  const session = await store.getSession(sessionId);
  if (!session) {
    return null;
  }
  return {
    sessionId,
    userId: session.userId,
    email: session.email,
    displayName: session.displayName,
    isAdmin: Boolean(session.isAdmin)
  };
}

function readSessionCookieDebug(event) {
  const { sessionId, headerPresent } = getSessionIdFromEvent(event);
  return {
    headerPresent,
    hasSessionCookie: sessionId.length > 0,
    sessionIdPrefix: sessionId ? `${sessionId.slice(0, 8)}...` : null
  };
}

function requireActor(actor) {
  if (!actor) {
    return json(401, { message: "Authentication required." });
  }
  return null;
}

function requireAdmin(actor) {
  if (!actor) {
    return json(401, { message: "Authentication required." });
  }
  if (!actor.isAdmin) {
    return json(403, { message: "Administrator access required." });
  }
  return null;
}

async function withOwnerDisplayName(store, project) {
  if (!project) {
    return null;
  }
  const owner = await store.getUserById(project.ownerUserId);
  return {
    ...project,
    ownerDisplayName: normalizeDisplayName(owner?.displayName) || project.ownerUserId
  };
}

async function withOwnerDisplayNames(store, projects) {
  const ownerDisplayNameByUserId = new Map();
  return await Promise.all(
    projects.map(async (project) => {
      if (!ownerDisplayNameByUserId.has(project.ownerUserId)) {
        const owner = await store.getUserById(project.ownerUserId);
        ownerDisplayNameByUserId.set(
          project.ownerUserId,
          normalizeDisplayName(owner?.displayName) || project.ownerUserId
        );
      }
      return {
        ...project,
        ownerDisplayName: ownerDisplayNameByUserId.get(project.ownerUserId)
      };
    })
  );
}

export async function handler(event) {
  try {
    const method = event?.requestContext?.http?.method ?? "GET";
    const { path, projectId, competitorListId, gameId, gamePredictionsId, predictionId } =
      readPath(event);

    if (method === "GET" && path === "/api/health") {
      return json(200, {
        ok: true,
        env: process.env.ENV_NAME ?? "unknown",
        timestamp: new Date().toISOString()
      });
    }

    const store = await getStore();
    const actor = await getSessionActor(event, store);

    if (method === "POST" && path === "/api/auth/google/session") {
      try {
        const body = await parseJsonBody(event?.body ?? "");
        const accessToken = String(body?.accessToken ?? "").trim();
        const preferredDisplayName = normalizeDisplayName(body?.displayName ?? "");
        if (!accessToken) {
          return json(400, { message: "Google access token is required." });
        }
        const googleIdentity = await verifyGoogleAccessToken(accessToken);
        const user = await store.upsertUser(googleIdentity, preferredDisplayName);
        const sessionTtlSeconds = Number.parseInt(
          String(process.env.SESSION_TTL_SECONDS ?? "604800"),
          10
        );
        const session = await store.createSession(user, Math.max(300, sessionTtlSeconds));
        return json(
          200,
          {
            authenticated: true,
            user: {
              userId: session.user.userId,
              email: session.user.email,
              displayName: session.user.displayName,
              isAdmin: Boolean(session.user.isAdmin)
            }
          },
          {
            headers: {
              "set-cookie": buildSetCookie(
                session.sessionId,
                Math.max(300, sessionTtlSeconds)
              )
            },
            cookies: [buildSetCookie(session.sessionId, Math.max(300, sessionTtlSeconds))]
          }
        );
      } catch (error) {
        return json(401, {
          message: error instanceof Error ? error.message : "Failed to authenticate with Google."
        });
      }
    }

    if (method === "POST" && path === "/api/auth/logout") {
      if (actor?.sessionId) {
        await store.deleteSession(actor.sessionId);
      }
      return json(
        200,
        { ok: true },
        {
          headers: {
            "set-cookie": clearCookieHeader()
          },
          cookies: [clearCookieHeader()]
        }
      );
    }

    if (method === "GET" && path === "/api/me") {
      if (!actor) {
        return json(200, { authenticated: false, user: null });
      }
      return json(200, {
        authenticated: true,
        user: {
          userId: actor.userId,
          email: actor.email,
          displayName: actor.displayName,
          isAdmin: Boolean(actor.isAdmin)
        }
      });
    }

    if (method === "GET" && path === "/api/debug/session") {
      if ((process.env.ENV_NAME ?? "").toLowerCase() !== "dev") {
        return json(404, { message: "Not found." });
      }
      const cookie = readSessionCookieDebug(event);
      return json(200, {
        env: process.env.ENV_NAME ?? "unknown",
        request: {
          origin: String(event?.headers?.origin ?? ""),
          host: String(event?.headers?.host ?? "")
        },
        cookie,
        session: {
          authenticated: Boolean(actor),
          user: actor
            ? {
                userId: actor.userId,
                email: actor.email,
                displayName: actor.displayName,
                isAdmin: Boolean(actor.isAdmin)
              }
            : null
        }
      });
    }

    if (method === "POST" && path === "/api/debug/set-cookie") {
      if ((process.env.ENV_NAME ?? "").toLowerCase() !== "dev") {
        return json(404, { message: "Not found." });
      }
      const sessionTtlSeconds = Number.parseInt(
        String(process.env.SESSION_TTL_SECONDS ?? "604800"),
        10
      );
      const debugCookie = buildSetCookie(
        `debug-${crypto.randomBytes(8).toString("hex")}`,
        Math.max(300, sessionTtlSeconds)
      );
      return json(
        200,
        {
          ok: true,
          message: "Debug cookie written."
        },
        {
          headers: {
            "set-cookie": debugCookie
          },
          cookies: [debugCookie]
        }
      );
    }

    if (method === "GET" && path === "/api/projects") {
      const unauthorized = requireActor(actor);
      if (unauthorized) {
        return unauthorized;
      }
      const projects = await store.listProjects();
      return json(200, { projects: await withOwnerDisplayNames(store, projects) });
    }

    if (method === "POST" && path === "/api/projects") {
      const unauthorized = requireActor(actor);
      if (unauthorized) {
        return unauthorized;
      }
      try {
        const body = await parseJsonBody(event?.body ?? "");
        const created = await store.createProject(actor, body?.name, body?.payload);
        if (created.conflict) {
          return json(409, { message: "Project name is already in use." });
        }
        return json(201, { project: await withOwnerDisplayName(store, created.project) });
      } catch (error) {
        return json(400, {
          message: error instanceof Error ? error.message : "Invalid request."
        });
      }
    }

    if (projectId && method === "GET") {
      const unauthorized = requireActor(actor);
      if (unauthorized) {
        return unauthorized;
      }
      const project = await store.getProject(projectId);
      if (!project) {
        return json(404, { message: "Project not found." });
      }
      return json(200, { project: await withOwnerDisplayName(store, project) });
    }

    if (projectId && method === "PUT") {
      const unauthorized = requireActor(actor);
      if (unauthorized) {
        return unauthorized;
      }
      try {
        const body = await parseJsonBody(event?.body ?? "");
        const updated = await store.updateProject(actor, projectId, body?.name, body?.payload);
        if (updated.notFound) {
          return json(404, { message: "Project not found." });
        }
        if (updated.forbidden) {
          return json(403, {
            message:
              "Only the project owner can save changes. Save with a new unique name to create your own copy."
          });
        }
        if (updated.conflict) {
          return json(409, { message: "Project name is already in use." });
        }
        return json(200, { project: await withOwnerDisplayName(store, updated.project) });
      } catch (error) {
        return json(400, {
          message: error instanceof Error ? error.message : "Invalid request."
        });
      }
    }

    if (method === "GET" && path === "/api/competitor-lists") {
      const lists = await store.listCompetitorLists();
      return json(200, { lists });
    }

    if (method === "POST" && path === "/api/competitor-lists") {
      const unauthorized = requireAdmin(actor);
      if (unauthorized) {
        return unauthorized;
      }
      try {
        const body = await parseJsonBody(event?.body ?? "");
        const list = parseCompetitorListInput(body);
        const created = await store.createCompetitorList(actor, list);
        if (created.conflict) {
          return json(409, { message: "Competitor list id already exists." });
        }
        return json(201, { list: created.list });
      } catch (error) {
        return json(400, {
          message: error instanceof Error ? error.message : "Invalid request."
        });
      }
    }

    if (competitorListId && method === "GET") {
      const list = await store.getCompetitorList(competitorListId);
      if (!list) {
        return json(404, { message: "Competitor list not found." });
      }
      return json(200, { list });
    }

    if (competitorListId && method === "PUT") {
      const unauthorized = requireAdmin(actor);
      if (unauthorized) {
        return unauthorized;
      }
      try {
        const body = await parseJsonBody(event?.body ?? "");
        const list = parseCompetitorListInput({ ...body, id: competitorListId });
        const updated = await store.updateCompetitorList(actor, competitorListId, list);
        if (updated.notFound) {
          return json(404, { message: "Competitor list not found." });
        }
        return json(200, { list: updated.list });
      } catch (error) {
        return json(400, {
          message: error instanceof Error ? error.message : "Invalid request."
        });
      }
    }

    if (method === "GET" && path === "/api/games") {
      const games = await store.listGames();
      return json(200, { games });
    }

    if (method === "POST" && path === "/api/games") {
      const unauthorized = requireAdmin(actor);
      if (unauthorized) {
        return unauthorized;
      }
      try {
        const body = await parseJsonBody(event?.body ?? "");
        const game = parseGameInput(body);
        const competitorList = await store.getCompetitorList(game.competitorListId);
        if (!competitorList) {
          return json(400, { message: "Unknown competitorListId." });
        }
        const created = await store.createGame(actor, game);
        if (created.conflict) {
          return json(409, { message: "Game id already exists." });
        }
        return json(201, { game: created.game });
      } catch (error) {
        return json(400, {
          message: error instanceof Error ? error.message : "Invalid request."
        });
      }
    }

    if (gameId && method === "GET") {
      const game = await store.getGame(gameId);
      if (!game) {
        return json(404, { message: "Game not found." });
      }
      return json(200, { game });
    }

    if (gameId && method === "PUT") {
      const unauthorized = requireAdmin(actor);
      if (unauthorized) {
        return unauthorized;
      }
      try {
        const body = await parseJsonBody(event?.body ?? "");
        const game = parseGameInput({ ...body, id: gameId });
        const competitorList = await store.getCompetitorList(game.competitorListId);
        if (!competitorList) {
          return json(400, { message: "Unknown competitorListId." });
        }
        const updated = await store.updateGame(actor, gameId, game);
        if (updated.notFound) {
          return json(404, { message: "Game not found." });
        }
        return json(200, { game: updated.game });
      } catch (error) {
        return json(400, {
          message: error instanceof Error ? error.message : "Invalid request."
        });
      }
    }

    if (gamePredictionsId && method === "GET") {
      const unauthorized = requireActor(actor);
      if (unauthorized) {
        return unauthorized;
      }
      const game = await store.getGame(gamePredictionsId);
      if (!game) {
        return json(404, { message: "Game not found." });
      }
      const predictions = await store.listPredictionsForGame(gamePredictionsId);
      return json(200, { predictions });
    }

    if (method === "POST" && path === "/api/predictions") {
      const unauthorized = requireActor(actor);
      if (unauthorized) {
        return unauthorized;
      }
      try {
        const body = await parseJsonBody(event?.body ?? "");
        const prediction = parsePredictionInput(body);
        const game = await store.getGame(prediction.gameId);
        if (!game) {
          return json(400, { message: "Unknown gameId." });
        }
        const competitorList = await store.getCompetitorList(game.competitorListId);
        if (!competitorList) {
          return json(400, { message: "Unknown competitorListId." });
        }
        const competitorIds = new Set(
          competitorList.competitors.map((competitor) => competitor.id)
        );
        const invalidIds = prediction.competitorIds.filter((id) => !competitorIds.has(id));
        if (invalidIds.length > 0) {
          return json(400, {
            message: `Unknown competitor ids: ${invalidIds.join(", ")}`
          });
        }
        const created = await store.createPrediction(actor, prediction, game);
        if (created.conflict) {
          return json(409, {
            message:
              prediction.type === "competition"
                ? "Competition prediction already exists."
                : "Prediction id already exists."
          });
        }
        if (created.closed) {
          return json(403, { message: "Competition predictions are closed." });
        }
        return json(201, { prediction: created.prediction });
      } catch (error) {
        return json(400, {
          message: error instanceof Error ? error.message : "Invalid request."
        });
      }
    }

    if (predictionId && method === "GET") {
      const unauthorized = requireActor(actor);
      if (unauthorized) {
        return unauthorized;
      }
      const prediction = await store.getPrediction(predictionId);
      if (!prediction) {
        return json(404, { message: "Prediction not found." });
      }
      return json(200, { prediction });
    }

    if (predictionId && method === "PUT") {
      const unauthorized = requireActor(actor);
      if (unauthorized) {
        return unauthorized;
      }
      try {
        const body = await parseJsonBody(event?.body ?? "");
        const update = parsePredictionUpdateInput(body);
        const existing = await store.getPrediction(predictionId);
        if (!existing) {
          return json(404, { message: "Prediction not found." });
        }
        if (existing.type === "competition") {
          update.name = "";
        }
        const game = await store.getGame(existing.gameId);
        if (!game) {
          return json(400, { message: "Unknown gameId." });
        }
        const competitorList = await store.getCompetitorList(game.competitorListId);
        if (!competitorList) {
          return json(400, { message: "Unknown competitorListId." });
        }
        const competitorIds = new Set(
          competitorList.competitors.map((competitor) => competitor.id)
        );
        const invalidIds = update.competitorIds.filter((id) => !competitorIds.has(id));
        if (invalidIds.length > 0) {
          return json(400, {
            message: `Unknown competitor ids: ${invalidIds.join(", ")}`
          });
        }
        const updated = await store.updatePrediction(actor, predictionId, update, game);
        if (updated.notFound) {
          return json(404, { message: "Prediction not found." });
        }
        if (updated.forbidden) {
          return json(403, { message: "Only the prediction owner can update it." });
        }
        if (updated.locked) {
          return json(409, { message: "Competition predictions are closed." });
        }
        return json(200, { prediction: updated.prediction });
      } catch (error) {
        return json(400, {
          message: error instanceof Error ? error.message : "Invalid request."
        });
      }
    }

    if (predictionId && method === "DELETE") {
      const unauthorized = requireActor(actor);
      if (unauthorized) {
        return unauthorized;
      }
      const existing = await store.getPrediction(predictionId);
      if (!existing) {
        return json(404, { message: "Prediction not found." });
      }
      const game = await store.getGame(existing.gameId);
      if (!game) {
        return json(400, { message: "Unknown gameId." });
      }
      const deleted = await store.deletePrediction(actor, predictionId, game);
      if (deleted.notFound) {
        return json(404, { message: "Prediction not found." });
      }
      if (deleted.forbidden) {
        return json(403, { message: "Only the prediction owner can delete it." });
      }
      if (deleted.locked) {
        return json(409, { message: "Competition predictions are closed." });
      }
      return json(200, { deleted: true });
    }

    return json(404, { message: `No route for ${method} ${path}` });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown server error.";
    const includeDetail = process.env.ENV_NAME === "dev";
    return json(500, {
      message: "Internal Server Error",
      ...(includeDetail ? { detail } : {})
    });
  }
}
