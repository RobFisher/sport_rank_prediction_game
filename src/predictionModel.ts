export interface Competitor {
  id: string;
  name: string;
  subtitle?: string;
  number?: string;
  color?: string;
}

export interface CompetitorList {
  id: string;
  name: string;
  competitors: Competitor[];
}

export interface Game {
  id: string;
  name: string;
  competitorListId: string;
  closesAt: string;
  results?: string[] | null;
}

export type PredictionType = "competition" | "fun";

export interface Prediction {
  id: string;
  gameId: string;
  type: PredictionType;
  name: string;
  competitorIds: string[];
  createdAt: string;
  updatedAt?: string;
  ownerUserId?: string;
  ownerDisplayName?: string;
}

export interface SeedData {
  competitorLists: CompetitorList[];
  games: Game[];
  predictions: Prediction[];
}

export const seedData: SeedData = {
  competitorLists: [
    {
      id: "f1-2026-drivers",
      name: "F1 2026 Drivers",
      competitors: [
        { id: "verstappen", name: "Max Verstappen", subtitle: "Red Bull", number: "1" },
        { id: "norris", name: "Lando Norris", subtitle: "McLaren", number: "4" },
        { id: "leclerc", name: "Charles Leclerc", subtitle: "Ferrari", number: "16" },
        { id: "hamilton", name: "Lewis Hamilton", subtitle: "Ferrari", number: "44" },
        { id: "piastri", name: "Oscar Piastri", subtitle: "McLaren", number: "81" },
        { id: "russell", name: "George Russell", subtitle: "Mercedes", number: "63" },
        { id: "sainz", name: "Carlos Sainz", subtitle: "Williams", number: "55" },
        { id: "alonso", name: "Fernando Alonso", subtitle: "Aston Martin", number: "14" },
        { id: "gasly", name: "Pierre Gasly", subtitle: "Alpine", number: "10" },
        { id: "albon", name: "Alex Albon", subtitle: "Williams", number: "23" }
      ]
    }
  ],
  games: [
    {
      id: "f1-2026-drivers-championship",
      name: "F1 2026 Drivers Championship",
      competitorListId: "f1-2026-drivers",
      closesAt: "2026-03-07T18:00:00Z"
    },
    {
      id: "f1-2026-constructors",
      name: "F1 2026 Constructors Championship",
      competitorListId: "f1-2026-drivers",
      closesAt: "2026-03-07T18:00:00Z"
    }
  ],
  predictions: [
    {
      id: "prediction-competition-1",
      gameId: "f1-2026-drivers-championship",
      type: "competition",
      name: "",
      competitorIds: [
        "verstappen",
        "norris",
        "leclerc",
        "piastri",
        "hamilton",
        "russell",
        "sainz",
        "alonso",
        "gasly",
        "albon"
      ],
      createdAt: "2025-01-01T00:00:00Z"
    },
    {
      id: "prediction-fun-1",
      gameId: "f1-2026-drivers-championship",
      type: "fun",
      name: "Rain chaos",
      competitorIds: [
        "norris",
        "piastri",
        "leclerc",
        "verstappen",
        "hamilton",
        "russell",
        "alonso",
        "sainz",
        "albon",
        "gasly"
      ],
      createdAt: "2025-01-02T00:00:00Z"
    }
  ]
};

export function moveCompetitor(
  competitorIds: string[],
  fromIndex: number,
  toIndex: number
): string[] {
  if (fromIndex === toIndex) {
    return competitorIds;
  }
  const next = competitorIds.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function createPredictionFromGame(
  id: string,
  game: Game,
  competitorList: CompetitorList,
  type: PredictionType,
  name: string
): Prediction {
  const createdAt = new Date().toISOString();
  return {
    id,
    gameId: game.id,
    type,
    name,
    competitorIds: competitorList.competitors.map((competitor) => competitor.id),
    createdAt,
    updatedAt: createdAt
  };
}

export function calculatePredictionScore(
  competitorIds: string[],
  results: string[] | null | undefined
): number | null {
  if (!results || results.length === 0 || competitorIds.length !== results.length) {
    return null;
  }

  const resultIndexByCompetitorId = new Map<string, number>();
  results.forEach((competitorId, index) => {
    resultIndexByCompetitorId.set(competitorId, index);
  });

  let total = 0;
  for (let predictionIndex = 0; predictionIndex < competitorIds.length; predictionIndex += 1) {
    const competitorId = competitorIds[predictionIndex];
    const resultIndex = resultIndexByCompetitorId.get(competitorId);
    if (resultIndex === undefined) {
      return null;
    }
    total += Math.abs(predictionIndex - resultIndex);
  }

  return total;
}

export function isCompetitionClosedByTime(closesAt: string, nowMs = Date.now()): boolean {
  const closesAtMs = Date.parse(closesAt);
  return Number.isFinite(closesAtMs) && closesAtMs <= nowMs;
}
