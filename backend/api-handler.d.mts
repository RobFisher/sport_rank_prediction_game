type DynamoInput = Record<string, unknown>;

type DynamoResponse = {
  Items?: Array<Record<string, unknown>>;
  LastEvaluatedKey?: Record<string, unknown>;
};

type DynamoClient = {
  send(command: { input: DynamoInput }): Promise<DynamoResponse>;
};

type DynamoCommandConstructor = new (input: DynamoInput) => { input: DynamoInput };

export type ProjectSummary = {
  projectId: string;
  name: string;
  ownerUserId: string;
  version: number;
  updatedAt: string;
};

export type CompetitorListSummary = {
  competitorListId: string;
  name: string;
  competitors: Array<Record<string, unknown>>;
  updatedAt: string;
};

export type GameSummary = {
  gameId: string;
  name: string;
  competitorListId: string;
  closesAt: string;
  updatedAt: string;
  results: string[] | null;
};

export type PredictionSummary = {
  predictionId: string;
  gameId: string;
  ownerUserId: string;
  ownerDisplayName: string;
  type: string;
  name: string;
  competitorIds: string[];
  createdAt: string;
  updatedAt: string;
};

export function listProjectSummariesFromDynamoScan(
  dynamodbClient: DynamoClient,
  ScanCommand: DynamoCommandConstructor,
  tableName: string
): Promise<ProjectSummary[]>;

export function listCompetitorListsFromDynamoScan(
  dynamodbClient: DynamoClient,
  ScanCommand: DynamoCommandConstructor,
  tableName: string
): Promise<CompetitorListSummary[]>;

export function listGamesFromDynamoScan(
  dynamodbClient: DynamoClient,
  ScanCommand: DynamoCommandConstructor,
  tableName: string
): Promise<GameSummary[]>;

export function listPredictionsForGameFromDynamoQuery(
  dynamodbClient: DynamoClient,
  QueryCommand: DynamoCommandConstructor,
  tableName: string,
  gameId: string
): Promise<PredictionSummary[]>;

export function handler(event: unknown): Promise<unknown>;
