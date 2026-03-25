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

export interface PredictionScoreContribution {
  competitorId: string;
  predictedPosition: number;
  actualPosition: number;
  scoreDelta: number;
  direction: "up" | "down" | "exact";
}

export interface LeaderboardStanding {
  userId: string;
  displayName: string;
  gamesEntered: number;
  averageScore: number;
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
  points: number;
}

export const F1_CHAMPIONSHIP_POINTS_BY_PLACE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const;

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
  const contributions = calculatePredictionScoreContributions(competitorIds, results);
  if (!contributions) {
    return null;
  }

  return contributions.reduce((total, contribution) => total + contribution.scoreDelta, 0);
}

export function calculatePredictionScoreContributions(
  competitorIds: string[],
  results: string[] | null | undefined
): PredictionScoreContribution[] | null {
  if (!results || results.length === 0 || competitorIds.length !== results.length) {
    return null;
  }

  const resultIndexByCompetitorId = new Map<string, number>();
  results.forEach((competitorId, index) => {
    resultIndexByCompetitorId.set(competitorId, index);
  });

  const contributions: PredictionScoreContribution[] = [];
  for (let predictionIndex = 0; predictionIndex < competitorIds.length; predictionIndex += 1) {
    const competitorId = competitorIds[predictionIndex];
    const resultIndex = resultIndexByCompetitorId.get(competitorId);
    if (resultIndex === undefined) {
      return null;
    }

    const delta = resultIndex - predictionIndex;
    contributions.push({
      competitorId,
      predictedPosition: predictionIndex + 1,
      actualPosition: resultIndex + 1,
      scoreDelta: Math.abs(delta),
      direction: delta === 0 ? "exact" : delta > 0 ? "down" : "up"
    });
  }

  return contributions;
}

export function calculateLeaderboardStandings(
  predictions: Prediction[],
  games: Game[]
): LeaderboardStanding[] {
  const gamesById = new Map(games.map((game) => [game.id, game]));
  const scoredCompetitionPredictionsByGameId = new Map<
    string,
    Array<{ userId: string; displayName: string; score: number }>
  >();

  predictions.forEach((prediction) => {
    if (prediction.type !== "competition") {
      return;
    }

    const userId = prediction.ownerUserId?.trim() ?? "";
    if (!userId) {
      return;
    }

    const game = gamesById.get(prediction.gameId);
    const score = calculatePredictionScore(prediction.competitorIds, game?.results ?? null);
    if (score === null) {
      return;
    }

    const displayName = prediction.ownerDisplayName?.trim() || prediction.ownerUserId || "Unknown";
    const predictionsForGame = scoredCompetitionPredictionsByGameId.get(prediction.gameId) ?? [];
    predictionsForGame.push({ userId, displayName, score });
    scoredCompetitionPredictionsByGameId.set(prediction.gameId, predictionsForGame);
  });

  const standingsByUserId = new Map<
    string,
    LeaderboardStanding & {
      totalScore: number;
    }
  >();

  scoredCompetitionPredictionsByGameId.forEach((predictionsForGame) => {
    const sorted = [...predictionsForGame].sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }
      const displayNameComparison = left.displayName.localeCompare(right.displayName);
      if (displayNameComparison !== 0) {
        return displayNameComparison;
      }
      return left.userId.localeCompare(right.userId);
    });

    let currentPlace = 0;
    let lastScore: number | null = null;

    sorted.forEach((entry) => {
      if (lastScore !== entry.score) {
        currentPlace += 1;
        lastScore = entry.score;
      }

      const standing = standingsByUserId.get(entry.userId) ?? {
        userId: entry.userId,
        displayName: entry.displayName,
        gamesEntered: 0,
        averageScore: 0,
        firstPlaces: 0,
        secondPlaces: 0,
        thirdPlaces: 0,
        points: 0,
        totalScore: 0
      };

      standing.gamesEntered += 1;
      standing.totalScore += entry.score;
      if (currentPlace === 1) {
        standing.firstPlaces += 1;
      }
      if (currentPlace === 2) {
        standing.secondPlaces += 1;
      }
      if (currentPlace === 3) {
        standing.thirdPlaces += 1;
      }
      standing.points += F1_CHAMPIONSHIP_POINTS_BY_PLACE[currentPlace - 1] ?? 0;
      standingsByUserId.set(entry.userId, standing);
    });
  });

  return [...standingsByUserId.values()]
    .map(({ totalScore, ...standing }) => ({
      ...standing,
      averageScore: totalScore / standing.gamesEntered
    }))
    .sort((left, right) => {
      if (left.points !== right.points) {
        return right.points - left.points;
      }
      if (left.firstPlaces !== right.firstPlaces) {
        return right.firstPlaces - left.firstPlaces;
      }
      if (left.secondPlaces !== right.secondPlaces) {
        return right.secondPlaces - left.secondPlaces;
      }
      if (left.thirdPlaces !== right.thirdPlaces) {
        return right.thirdPlaces - left.thirdPlaces;
      }
      if (left.gamesEntered !== right.gamesEntered) {
        return right.gamesEntered - left.gamesEntered;
      }
      return left.displayName.localeCompare(right.displayName);
    });
}

export function isCompetitionClosedByTime(closesAt: string, nowMs = Date.now()): boolean {
  const closesAtMs = Date.parse(closesAt);
  return Number.isFinite(closesAtMs) && closesAtMs <= nowMs;
}
