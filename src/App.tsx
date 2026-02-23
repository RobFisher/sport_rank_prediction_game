import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import "./app.css";
import {
  type CompetitorList,
  createPredictionFromGame,
  moveCompetitor,
  type Game,
  type Prediction,
  type PredictionType
} from "./predictionModel.js";
import {
  createCompetitorList,
  createBackendGoogleSession,
  createGame,
  deletePrediction,
  deleteGame,
  getBackendMe,
  getPrediction,
  listCompetitorLists,
  listGames,
  listPredictionsForGame,
  logoutBackendSession,
  createPrediction,
  updatePrediction,
  updateCompetitorList,
  type BackendCompetitorList,
  type BackendGame,
  type BackendPrediction,
  type BackendSessionUser
} from "./backendApi.js";
import { WorkspaceHeader } from "./components/WorkspaceHeader.js";
import { PredictionPane } from "./components/PredictionPane.js";
import { NewPredictionDialog } from "./components/NewPredictionDialog.js";
import { SavePredictionDialog } from "./components/SavePredictionDialog.js";
import { GoogleDisplayNameDialog } from "./components/GoogleDisplayNameDialog.js";
import { CreateGameDialog } from "./components/CreateGameDialog.js";
import { GamesPane } from "./components/GamesPane.js";
import { GamePredictionsPane } from "./components/GamePredictionsPane.js";
import { RulesDialog } from "./components/RulesDialog.js";
import { DeleteGameDialog } from "./components/DeleteGameDialog.js";
import { useGoogleAuth } from "./hooks/useGoogleAuth.js";

function createPredictionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `prediction-${crypto.randomUUID()}`;
  }
  return `prediction-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function createPaneId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function normalizePredictionName(value: string): string {
  return String(value ?? "").trim().toLowerCase();
}

function createGameId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return slug ? `${slug}-${suffix}` : `game-${Date.now()}`;
}

function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeColor(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`Invalid color value "${value}". Use a 6-digit hex color.`);
  }
  return `#${hex.toUpperCase()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCompetitorListPayload(payload: unknown): CompetitorList[] {
  const listCandidates: unknown[] = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.competitorLists)
      ? payload.competitorLists
      : [payload];

  return listCandidates.map((candidate) => {
    if (!isRecord(candidate)) {
      throw new Error("Competitor list must be an object.");
    }
    const id = String(candidate.id ?? "").trim();
    const name = String(candidate.name ?? "").trim();
    if (!id) {
      throw new Error("Competitor list is missing required field: id.");
    }
    if (!name) {
      throw new Error("Competitor list is missing required field: name.");
    }
    const competitorsRaw = candidate.competitors;
    if (!Array.isArray(competitorsRaw)) {
      throw new Error(`Competitor list "${id}" must include a competitors array.`);
    }
    const competitors = competitorsRaw.map((competitor) => {
      if (!isRecord(competitor)) {
        throw new Error(`Competitor in "${id}" must be an object.`);
      }
      const competitorId = String(competitor.id ?? "").trim();
      const competitorName = String(competitor.name ?? "").trim();
      if (!competitorId) {
        throw new Error(`Competitor list "${id}" has a competitor without id.`);
      }
      if (!competitorName) {
        throw new Error(`Competitor list "${id}" has a competitor without name.`);
      }
      return {
        id: competitorId,
        name: competitorName,
        subtitle: competitor.subtitle ? String(competitor.subtitle) : undefined,
        number: competitor.number ? String(competitor.number) : undefined,
        color: normalizeColor(competitor.color ? String(competitor.color) : undefined)
      };
    });
    const seen = new Set<string>();
    competitors.forEach((competitor) => {
      if (seen.has(competitor.id)) {
        throw new Error(`Competitor list "${id}" has duplicate id "${competitor.id}".`);
      }
      seen.add(competitor.id);
    });
    return {
      id,
      name,
      competitors
    };
  });
}


function toUiCompetitorList(list: BackendCompetitorList): CompetitorList {
  return {
    id: list.competitorListId,
    name: list.name,
    competitors: (list.competitors ?? []).map((competitor) => ({
      id: competitor.id,
      name: competitor.name,
      subtitle: competitor.subtitle ?? undefined,
      number: competitor.number ?? undefined,
      color: competitor.color ?? undefined
    }))
  };
}

function toUiGame(game: BackendGame): Game {
  return {
    id: game.gameId,
    name: game.name,
    competitorListId: game.competitorListId,
    closesAt: game.closesAt,
    results: game.results ?? null
  };
}

function toUiPrediction(prediction: BackendPrediction): Prediction {
  return {
    id: prediction.predictionId,
    gameId: prediction.gameId,
    type: prediction.type,
    name: prediction.name,
    competitorIds: prediction.competitorIds,
    createdAt: prediction.createdAt,
    updatedAt: prediction.updatedAt,
    ownerUserId: prediction.ownerUserId,
    ownerDisplayName: prediction.ownerDisplayName
  };
}

function mergePredictions(existing: Prediction[], incoming: Prediction[]): Prediction[] {
  const byId = new Map(existing.map((prediction) => [prediction.id, prediction]));
  incoming.forEach((prediction) => {
    byId.set(prediction.id, prediction);
  });
  return [...byId.values()];
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function isPredictionSynced(current: Prediction, persisted: Prediction): boolean {
  return (
    current.type === persisted.type &&
    current.name === persisted.name &&
    areStringArraysEqual(current.competitorIds, persisted.competitorIds)
  );
}

type PaneDescriptor =
  | { id: string; type: "games" }
  | { id: string; type: "game-predictions"; gameId: string }
  | { id: string; type: "prediction"; predictionId: string };

export function App() {
  const [competitorLists, setCompetitorLists] = useState<CompetitorList[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [persistedPredictionsById, setPersistedPredictionsById] = useState<
    Map<string, Prediction>
  >(new Map());
  const [panes, setPanes] = useState<PaneDescriptor[]>([
    { id: "games-pane", type: "games" }
  ]);
  const [newPredictionDialogOpen, setNewPredictionDialogOpen] = useState(false);
  const [newPredictionGameId, setNewPredictionGameId] = useState<string | null>(null);
  const [createGameDialogOpen, setCreateGameDialogOpen] = useState(false);
  const [saveDialogPredictionId, setSaveDialogPredictionId] = useState<string | null>(null);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [deleteGameTargetId, setDeleteGameTargetId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Loading data from backend...");
  const [googleDisplayNameDraft, setGoogleDisplayNameDraft] = useState("");
  const [googleDisplayNameDialogOpen, setGoogleDisplayNameDialogOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [backendSessionUser, setBackendSessionUser] = useState<BackendSessionUser | null>(
    null
  );
  const [predictionsLoaded, setPredictionsLoaded] = useState(false);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const competitorListInputRef = useRef<HTMLInputElement | null>(null);
  const {
    googleToken,
    googleUser,
    googleAuthError,
    googleAuthLoading,
    connectGoogle,
    disconnectGoogle
  } = useGoogleAuth();

  const gamesById = useMemo(() => {
    return new Map(games.map((game) => [game.id, game]));
  }, [games]);

  const competitorListsById = useMemo(() => {
    return new Map(competitorLists.map((list) => [list.id, list]));
  }, [competitorLists]);

  const predictionsById = useMemo(() => {
    return new Map(predictions.map((prediction) => [prediction.id, prediction]));
  }, [predictions]);

  const dirtyPredictionIds = useMemo(() => {
    const dirty = new Set<string>();
    predictions.forEach((prediction) => {
      const persisted = persistedPredictionsById.get(prediction.id);
      if (!persisted) {
        return;
      }
      if (!isPredictionSynced(prediction, persisted)) {
        dirty.add(prediction.id);
      }
    });
    return dirty;
  }, [persistedPredictionsById, predictions]);

  const predictionsByGameId = useMemo(() => {
    const map = new Map<string, Prediction[]>();
    predictions.forEach((prediction) => {
      const list = map.get(prediction.gameId) ?? [];
      list.push(prediction);
      map.set(prediction.gameId, list);
    });
    return map;
  }, [predictions]);

  const googleConnected = Boolean(backendSessionUser);
  const isAdmin = Boolean(backendSessionUser?.isAdmin);
  const googleStatus = googleConnected
    ? `Google: ${backendSessionUser?.displayName ?? backendSessionUser?.email ?? "Connected"}`
    : null;

  useEffect(() => {
    if (!googleUser) {
      setGoogleDisplayNameDialogOpen(false);
      setGoogleDisplayNameDraft("");
      return;
    }

    const backendDisplayName =
      backendSessionUser && backendSessionUser.userId === googleUser.sub
        ? backendSessionUser.displayName
        : "";
    if (backendDisplayName) {
      setGoogleDisplayNameDialogOpen(false);
      return;
    }

    setGoogleDisplayNameDraft("");
    setGoogleDisplayNameDialogOpen(true);
  }, [backendSessionUser, googleUser]);

  async function refreshBackendSessionStatus(): Promise<BackendSessionUser | null> {
    try {
      const me = await getBackendMe();
      if (me.authenticated && me.user) {
        setBackendSessionUser(me.user);
        setBackendStatus(`Backend session active for ${me.user.displayName}.`);
        return me.user;
      }
      setBackendSessionUser(null);
      setBackendStatus("Backend reachable. No active app session.");
      return null;
    } catch (error) {
      setBackendSessionUser(null);
      setBackendStatus(
        error instanceof Error
          ? `Backend not reachable: ${error.message}`
          : "Backend not reachable from this environment."
      );
      return null;
    }
  }

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const user = await refreshBackendSessionStatus();
      if (!cancelled && !user) {
        setBackendSessionUser(null);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshCompetitorLists = async () => {
    const lists = await listCompetitorLists();
    setCompetitorLists(lists.map(toUiCompetitorList));
  };

  const refreshGames = async () => {
    const loaded = await listGames();
    setGames(loaded.map(toUiGame));
  };

  const loadPredictionsForGames = async (gamesToLoad: Game[]) => {
    if (!backendSessionUser || gamesToLoad.length === 0) {
      setPredictions([]);
      setPersistedPredictionsById(new Map());
      setPredictionsLoaded(false);
      return;
    }
    setPredictionsLoading(true);
    try {
      const batches = await Promise.all(
        gamesToLoad.map(async (game) => {
          const predictionsForGame = await listPredictionsForGame(game.id);
          return predictionsForGame.map(toUiPrediction);
        })
      );
      const loadedPredictions = batches.flat();
      setPredictions(mergePredictions([], loadedPredictions));
      setPersistedPredictionsById(
        new Map(loadedPredictions.map((prediction) => [prediction.id, prediction]))
      );
      setPredictionsLoaded(true);
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Failed to load predictions: ${error.message}`
          : "Failed to load predictions."
      );
      setPredictionsLoaded(false);
    } finally {
      setPredictionsLoading(false);
    }
  };

  const ensurePredictionsForGame = async (gameId: string) => {
    if (!backendSessionUser) {
      return;
    }
    if (predictionsByGameId.has(gameId)) {
      return;
    }
    try {
      const loaded = await listPredictionsForGame(gameId);
      const uiPredictions = loaded.map(toUiPrediction);
      setPredictions((current) => mergePredictions(current, uiPredictions));
      mergePersistedPredictions(uiPredictions);
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Failed to load predictions: ${error.message}`
          : "Failed to load predictions."
      );
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const [lists, loadedGames] = await Promise.all([
          listCompetitorLists(),
          listGames()
        ]);
        if (cancelled) {
          return;
        }
        setCompetitorLists(lists.map(toUiCompetitorList));
        setGames(loadedGames.map(toUiGame));
        setStatusMessage("Loaded competitor lists and games from the backend.");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setStatusMessage(
          error instanceof Error
            ? `Failed to load backend data: ${error.message}`
            : "Failed to load backend data."
        );
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!backendSessionUser) {
      setPredictions([]);
      setPersistedPredictionsById(new Map());
      setPredictionsLoaded(false);
      setPredictionsLoading(false);
      return;
    }
    void loadPredictionsForGames(games);
  }, [backendSessionUser, games]);

  const mergePersistedPredictions = (incoming: Prediction[]) => {
    setPersistedPredictionsById((current) => {
      const next = new Map(current);
      incoming.forEach((prediction) => {
        next.set(prediction.id, prediction);
      });
      return next;
    });
  };

  const removePersistedPredictions = (predictionIds: Set<string>) => {
    if (predictionIds.size === 0) {
      return;
    }
    setPersistedPredictionsById((current) => {
      const next = new Map(current);
      predictionIds.forEach((predictionId) => {
        next.delete(predictionId);
      });
      return next;
    });
  };

  async function establishBackendSession(
    accessToken: string,
    displayNameOverride?: string
  ): Promise<{ ok: boolean; needsDisplayName: boolean }> {
    const preferredDisplayName = normalizeDisplayName(displayNameOverride ?? "");
    try {
      const me = await createBackendGoogleSession(
        accessToken,
        preferredDisplayName || undefined
      );
      if (me.authenticated && me.user) {
        setBackendSessionUser(me.user);
        setBackendStatus(`Backend session active for ${me.user.displayName}.`);
        return { ok: true, needsDisplayName: false };
      } else {
        await refreshBackendSessionStatus();
        return { ok: false, needsDisplayName: false };
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to establish backend session after Google login.";
      if (message.includes("Display name is required")) {
        return { ok: false, needsDisplayName: true };
      }
      setBackendStatus(message);
      setStatusMessage(message);
      return { ok: false, needsDisplayName: false };
    }
  }

  function toggleGoogleConnection(): void {
    if (googleConnected) {
      void (async () => {
        await logoutBackendSession();
        await disconnectGoogle();
        setBackendSessionUser(null);
        setGoogleDisplayNameDialogOpen(false);
        setBackendStatus("Signed out.");
      })();
      return;
    }
    void (async () => {
      const result = await connectGoogle();
      if (!result) {
        return;
      }
      const sessionResult = await establishBackendSession(result.accessToken);
      if (sessionResult.needsDisplayName) {
        setGoogleDisplayNameDraft("");
        setGoogleDisplayNameDialogOpen(true);
      }
    })();
  }

  function saveGoogleDisplayName(): void {
    if (!googleUser) {
      return;
    }
    const normalizedDisplayName = normalizeDisplayName(googleDisplayNameDraft);
    if (!normalizedDisplayName) {
      return;
    }
    if (googleToken) {
      void (async () => {
        const sessionResult = await establishBackendSession(
          googleToken,
          normalizedDisplayName
        );
        if (sessionResult.ok) {
          setGoogleDisplayNameDialogOpen(false);
        } else {
          setGoogleDisplayNameDialogOpen(true);
        }
      })();
    }
  }

  const handleUploadCompetitors = () => {
    competitorListInputRef.current?.click();
  };

  const handleCompetitorFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const importedLists = parseCompetitorListPayload(parsed);
      let createdCount = 0;
      let updatedCount = 0;
      for (const list of importedLists) {
        const payload = {
          id: list.id,
          name: list.name,
          competitors: list.competitors.map((competitor) => ({
            id: competitor.id,
            name: competitor.name,
            subtitle: competitor.subtitle ?? null,
            number: competitor.number ?? null,
            color: competitor.color ?? null
          }))
        };
        try {
          await createCompetitorList(payload);
          createdCount += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (message.includes("(409)")) {
            await updateCompetitorList(list.id, {
              name: list.name,
              competitors: payload.competitors
            });
            updatedCount += 1;
            continue;
          }
          throw error;
        }
      }
      await refreshCompetitorLists();
      const segments = [];
      if (createdCount > 0) {
        segments.push(`created ${createdCount}`);
      }
      if (updatedCount > 0) {
        segments.push(`updated ${updatedCount}`);
      }
      const summary = segments.length > 0 ? segments.join(", ") : "no changes";
      setStatusMessage(`Competitor lists imported (${summary}).`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to import competitor list."
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleCreateGame = async (
    name: string,
    competitorListId: string,
    closesAt: string
  ) => {
    try {
      const created = await createGame({
        id: createGameId(name),
        name,
        competitorListId,
        closesAt,
        results: null
      });
      setGames((current) => [...current, toUiGame(created)]);
      setCreateGameDialogOpen(false);
      setStatusMessage(`Created game "${name}".`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to create game."
      );
    }
  };

  const handleMoveCompetitor = (predictionId: string, fromIndex: number, toIndex: number) => {
    setPredictions((current) =>
      current.map((prediction) =>
        prediction.id === predictionId
          ? {
              ...prediction,
              competitorIds: moveCompetitor(
                prediction.competitorIds,
                fromIndex,
                toIndex
              )
            }
          : prediction
      )
    );
  };

  const handleCreatePrediction = async (gameId: string, type: PredictionType) => {
    const game = gamesById.get(gameId);
    if (!game) {
      return;
    }
    const competitorList = competitorListsById.get(game.competitorListId);
    if (!competitorList) {
      return;
    }

    const predictionId = createPredictionId();
    const draft = createPredictionFromGame(predictionId, game, competitorList, type, "");

    try {
      const created = await createPrediction({
        id: draft.id,
        gameId: draft.gameId,
        type: draft.type,
        name: draft.name,
        competitorIds: draft.competitorIds
      });
      const uiPrediction = toUiPrediction(created);
      setPredictions((current) => mergePredictions(current, [uiPrediction]));
      mergePersistedPredictions([uiPrediction]);
      setPanes((current) => {
        if (
          current.some(
            (pane) =>
              pane.type === "prediction" && pane.predictionId === uiPrediction.id
          )
        ) {
          return current;
        }
        return [
          ...current,
          {
            id: createPaneId("prediction"),
            type: "prediction",
            predictionId: uiPrediction.id
          }
        ];
      });
      setNewPredictionDialogOpen(false);
      setNewPredictionGameId(null);
      setStatusMessage(`Created ${type} prediction for "${game.name}".`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to create prediction."
      );
    }
  };

  const handleSavePrediction = async (
    predictionId: string,
    desiredType: PredictionType,
    name: string
  ) => {
    try {
      const prediction = predictionsById.get(predictionId);
      if (!prediction || !backendSessionUser) {
        return;
      }
      const trimmedName = name.trim();
      const desiredName = desiredType === "competition" ? "" : trimmedName;
      const currentName =
        prediction.type === "competition" ? "" : prediction.name.trim();
      const ownsPrediction = isOwnPrediction(prediction);
      const createAsNew = !ownsPrediction || desiredType !== prediction.type || desiredName !== currentName;
      const game = gamesById.get(prediction.gameId);
      if (!game) {
        setStatusMessage("Prediction game not found.");
        return;
      }
      const closesAtMs = Date.parse(game.closesAt);
      if (
        ownsPrediction &&
        prediction.type === "competition" &&
        Number.isFinite(closesAtMs) &&
        closesAtMs <= Date.now()
      ) {
        setSaveDialogPredictionId(null);
        setStatusMessage("Competition predictions are closed for this game.");
        return;
      }

    if (desiredType === "competition") {
      if (
        hasCompetitionForGame(prediction.gameId) &&
        !(ownsPrediction && prediction.type === "competition" && !createAsNew)
      ) {
        setStatusMessage("You already have a competition prediction for this game.");
        return;
      }
      if (Number.isFinite(closesAtMs) && closesAtMs <= Date.now()) {
        setStatusMessage("Competition predictions are closed for this game.");
          return;
        }
      }
      if (desiredType === "fun") {
        if (!trimmedName) {
          setStatusMessage("Fun predictions need a name.");
          return;
        }
        const normalized = normalizePredictionName(trimmedName);
        const sameName = predictions.find(
          (entry) =>
            entry.gameId === prediction.gameId &&
            entry.type === "fun" &&
            normalizePredictionName(entry.name) === normalized
        );
        if (sameName && sameName.id !== prediction.id) {
          if (sameName.ownerUserId && sameName.ownerUserId !== backendSessionUser.userId) {
            setStatusMessage(
              `Another user already has a fun prediction named "${trimmedName}".`
            );
            return;
          }
          const confirmOverwrite = window.confirm(
            `You already have a fun prediction named "${trimmedName}". Overwrite it?`
          );
          if (!confirmOverwrite) {
            return;
          }
          try {
            const updated = await updatePrediction(sameName.id, {
              name: trimmedName,
              competitorIds: prediction.competitorIds
            });
            setPredictions((current) =>
              mergePredictions(current, [toUiPrediction(updated)])
            );
            mergePersistedPredictions([toUiPrediction(updated)]);
            setSaveDialogPredictionId(null);
            setStatusMessage(`Overwrote "${trimmedName}".`);
            return;
          } catch (error) {
            setStatusMessage(
              error instanceof Error ? error.message : "Failed to overwrite prediction."
            );
            return;
          }
        }
      }

      try {
      if (!createAsNew) {
        const updated = await updatePrediction(predictionId, {
          name: desiredName,
          competitorIds: prediction.competitorIds
        });
          setPredictions((current) =>
            mergePredictions(current, [toUiPrediction(updated)])
          );
          mergePersistedPredictions([toUiPrediction(updated)]);
          setSaveDialogPredictionId(null);
          setStatusMessage("Prediction saved.");
          return;
        }

        const created = await createPrediction({
          id: createPredictionId(),
          gameId: prediction.gameId,
          type: desiredType,
          name: desiredName,
          competitorIds: prediction.competitorIds
        });
        const uiPrediction = toUiPrediction(created);
        const persistedOriginal = persistedPredictionsById.get(prediction.id);
        setPredictions((current) => {
          let next = mergePredictions(current, [uiPrediction]);
          if (persistedOriginal) {
            next = mergePredictions(next, [persistedOriginal]);
          }
          return next;
        });
        mergePersistedPredictions([uiPrediction]);
        setPanes((current) =>
          current.map((pane) =>
            pane.type === "prediction" && pane.predictionId === prediction.id
              ? { ...pane, predictionId: uiPrediction.id }
              : pane
          )
        );
        setSaveDialogPredictionId(null);
        setStatusMessage(
          desiredType === "competition"
            ? "Saved as a new competition prediction."
            : `Saved as a new fun prediction: "${desiredName}".`
        );
      } catch (error) {
        setStatusMessage(
          error instanceof Error ? error.message : "Failed to save prediction."
        );
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to save prediction."
      );
    }
  };

  const handleOpenGamePredictions = (gameId: string) => {
    void ensurePredictionsForGame(gameId);
    setPanes((current) => {
      if (current.some((pane) => pane.type === "game-predictions" && pane.gameId === gameId)) {
        return current;
      }
      return [
        ...current,
        { id: createPaneId("game-predictions"), type: "game-predictions", gameId }
      ];
    });
  };

  const handleOpenPredictionPane = async (predictionId: string) => {
    if (!predictionsById.has(predictionId)) {
      try {
        const loaded = await getPrediction(predictionId);
        const uiPrediction = toUiPrediction(loaded);
        setPredictions((current) => mergePredictions(current, [uiPrediction]));
        mergePersistedPredictions([uiPrediction]);
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Failed to load the selected prediction."
        );
        return;
      }
    }
    setPanes((current) => {
      if (current.some((pane) => pane.type === "prediction" && pane.predictionId === predictionId)) {
        return current;
      }
      return [
        ...current,
        { id: createPaneId("prediction"), type: "prediction", predictionId }
      ];
    });
  };

  const handleRemovePane = (paneIndex: number) => {
    const pane = panes[paneIndex];
    if (!pane) {
      return;
    }
    if (pane.type !== "prediction") {
      setPanes((current) => current.filter((_, index) => index !== paneIndex));
      return;
    }
    const prediction = predictionsById.get(pane.predictionId);
    const hasUnsavedChanges =
      prediction && dirtyPredictionIds.has(prediction.id);
    if (!hasUnsavedChanges) {
      setPanes((current) => current.filter((_, index) => index !== paneIndex));
      return;
    }
    const discardConfirmed = window.confirm(
      "This prediction has unsaved changes. Discard changes and close the pane?"
    );
    if (!discardConfirmed) {
      return;
    }
    const persisted = prediction
      ? persistedPredictionsById.get(prediction.id)
      : null;
    if (prediction && persisted) {
      setPredictions((current) => mergePredictions(current, [persisted]));
    }
    setPanes((current) => current.filter((_, index) => index !== paneIndex));
  };

  const handleDeletePrediction = async (predictionId: string) => {
    const prediction = predictionsById.get(predictionId);
    if (!prediction || !backendSessionUser) {
      return;
    }
    if (!isOwnPrediction(prediction)) {
      return;
    }
    const game = gamesById.get(prediction.gameId);
    if (!game) {
      setStatusMessage("Prediction game not found.");
      return;
    }
    if (prediction.type === "competition") {
      const closesAtMs = Date.parse(game.closesAt);
      if (Number.isFinite(closesAtMs) && closesAtMs <= Date.now()) {
        setStatusMessage("Competition predictions are closed for this game.");
        return;
      }
    }
    const confirmed = window.confirm(
      `Delete ${prediction.type === "competition" ? "competition" : "fun"} prediction?`
    );
    if (!confirmed) {
      return;
    }
    try {
      await deletePrediction(predictionId);
      setPredictions((current) =>
        current.filter((entry) => entry.id !== predictionId)
      );
      removePersistedPredictions(new Set([predictionId]));
      setPanes((current) =>
        current.filter(
          (pane) =>
            !(pane.type === "prediction" && pane.predictionId === predictionId)
        )
      );
      setStatusMessage("Prediction deleted.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to delete prediction."
      );
    }
  };

  const handleRequestDeleteGame = (gameId: string) => {
    setDeleteGameTargetId(gameId);
  };

  const handleConfirmDeleteGame = async () => {
    const game = deleteGameTargetId ? gamesById.get(deleteGameTargetId) : null;
    if (!game) {
      setDeleteGameTargetId(null);
      return;
    }
    try {
      const result = await deleteGame(game.id);
      setGames((current) => current.filter((entry) => entry.id !== game.id));
      const removedIds = new Set(
        predictions.filter((entry) => entry.gameId === game.id).map((entry) => entry.id)
      );
      setPredictions((current) => current.filter((entry) => entry.gameId !== game.id));
      removePersistedPredictions(removedIds);
      setPanes((current) =>
        current.filter((pane) => {
          if (pane.type === "game-predictions" && pane.gameId === game.id) {
            return false;
          }
          if (pane.type === "prediction" && removedIds.has(pane.predictionId)) {
            return false;
          }
          return true;
        })
      );
      if (saveDialogPredictionId && removedIds.has(saveDialogPredictionId)) {
        setSaveDialogPredictionId(null);
      }
      setDeleteGameTargetId(null);
      setStatusMessage(
        `Deleted "${game.name}" and ${result.removedPredictions ?? 0} predictions.`
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to delete game."
      );
    }
  };

  const predictionCountsByGameId = useMemo(() => {
    const counts = new Map<string, number>();
    predictions.forEach((prediction) => {
      counts.set(prediction.gameId, (counts.get(prediction.gameId) ?? 0) + 1);
    });
    return counts;
  }, [predictions]);

  const competitionEntryByGameId = useMemo(() => {
    const entries = new Map<string, boolean>();
    predictions.forEach((prediction) => {
      if (prediction.type !== "competition") {
        return;
      }
      if (backendSessionUser && prediction.ownerUserId !== backendSessionUser.userId) {
        return;
      }
      entries.set(prediction.gameId, true);
    });
    return entries;
  }, [backendSessionUser, predictions]);

  const hasCompetitionForGame = (gameId: string) => {
    if (!backendSessionUser) {
      return false;
    }
    return competitionEntryByGameId.get(gameId) ?? false;
  };

  const isOwnPrediction = (prediction: Prediction) =>
    Boolean(backendSessionUser && prediction.ownerUserId === backendSessionUser.userId);

  const activeSavePrediction = saveDialogPredictionId
    ? predictionsById.get(saveDialogPredictionId) ?? null
    : null;
  const activeSaveGame = activeSavePrediction
    ? gamesById.get(activeSavePrediction.gameId) ?? null
    : null;
  const activeSaveCompetitionAllowed = Boolean(
    activeSavePrediction &&
      activeSaveGame &&
      Number.isFinite(Date.parse(activeSaveGame.closesAt)) &&
      Date.parse(activeSaveGame.closesAt) > Date.now() &&
      (
        (isOwnPrediction(activeSavePrediction) && activeSavePrediction.type === "competition") ||
        !hasCompetitionForGame(activeSavePrediction.gameId)
      )
  );

  return (
    <div className="workspace">
      <WorkspaceHeader
        projectName="F1 2026 Predictions"
        statusMessage={statusMessage}
        googleConnected={googleConnected}
        googleBusy={googleAuthLoading}
        googleAuthError={googleAuthError}
        googleStatus={googleStatus}
        backendStatus={backendStatus}
        canUploadCompetitors={isAdmin}
        onOpenRules={() => setRulesDialogOpen(true)}
        onToggleGoogleConnection={toggleGoogleConnection}
        onUploadCompetitors={handleUploadCompetitors}
      />
      <section className="pane-grid">
        {panes.map((pane, paneIndex) => {
          if (pane.type === "games") {
            return (
              <GamesPane
                key={pane.id}
                games={games}
                predictionsLoaded={predictionsLoaded}
                predictionCountsByGameId={predictionCountsByGameId}
                canCreateGame={isAdmin}
                onCreateGame={() => setCreateGameDialogOpen(true)}
                canDeleteGame={isAdmin}
                onDeleteGame={handleRequestDeleteGame}
                onOpenGame={handleOpenGamePredictions}
              />
            );
          }
          if (pane.type === "game-predictions") {
            const game = gamesById.get(pane.gameId);
            if (!game) {
              return null;
            }
            const gamePredictions = predictionsByGameId.get(pane.gameId) ?? [];
            const isLoading = predictionsLoading && gamePredictions.length === 0;
            return (
              <GamePredictionsPane
                key={pane.id}
                game={game}
                predictions={gamePredictions}
                canShowPredictions={googleConnected}
                isLoading={isLoading}
                canCreatePrediction={googleConnected}
                onCreatePrediction={() => {
                  setNewPredictionGameId(game.id);
                  setNewPredictionDialogOpen(true);
                }}
                onOpenPrediction={handleOpenPredictionPane}
                onClosePane={() => handleRemovePane(paneIndex)}
                paneCount={panes.length}
              />
            );
          }
          if (pane.type === "prediction") {
            const prediction = predictionsById.get(pane.predictionId);
            if (!prediction) {
              return null;
            }
            const game = gamesById.get(prediction.gameId);
            if (!game) {
              return null;
            }
            const closesAtMs = Date.parse(game.closesAt);
            const ownsPrediction = isOwnPrediction(prediction);
            const isCompetitionClosed =
              ownsPrediction &&
              prediction.type === "competition" &&
              Number.isFinite(closesAtMs) &&
              closesAtMs <= Date.now();
            const competitorList = competitorListsById.get(game.competitorListId);
            if (!competitorList) {
              return null;
            }
            const saveLabel = ownsPrediction ? "Save" : "Save As";
            const hasUnsavedChanges = dirtyPredictionIds.has(prediction.id);

            return (
              <PredictionPane
                key={pane.id}
                paneIndex={paneIndex}
                paneCount={panes.length}
                prediction={prediction}
                game={game}
                competitorList={competitorList}
                onMoveCompetitor={handleMoveCompetitor}
                onSavePrediction={(id) => setSaveDialogPredictionId(id)}
                onDeletePrediction={ownsPrediction ? handleDeletePrediction : undefined}
                onRemovePane={handleRemovePane}
                saveDisabled={
                  !googleConnected ||
                  isCompetitionClosed ||
                  (ownsPrediction && !hasUnsavedChanges)
                }
                saveLabel={isCompetitionClosed ? "Locked" : saveLabel}
                deleteDisabled={isCompetitionClosed}
                hasUnsavedChanges={hasUnsavedChanges}
              />
            );
          }
          return null;
        })}
      </section>

      <NewPredictionDialog
        open={newPredictionDialogOpen}
        games={games}
        initialGameId={newPredictionGameId}
        hasCompetitionForGame={hasCompetitionForGame}
        onCreate={handleCreatePrediction}
        onClose={() => {
          setNewPredictionDialogOpen(false);
          setNewPredictionGameId(null);
        }}
      />
      <CreateGameDialog
        open={createGameDialogOpen}
        competitorLists={competitorLists}
        onCreate={handleCreateGame}
        onClose={() => setCreateGameDialogOpen(false)}
      />
      <SavePredictionDialog
        open={saveDialogPredictionId !== null}
        prediction={activeSavePrediction}
        saveLabel="Save"
        allowCompetition={activeSaveCompetitionAllowed}
        onSave={(type, name) => {
          if (!saveDialogPredictionId) {
            return;
          }
          void handleSavePrediction(saveDialogPredictionId, type, name);
        }}
        onClose={() => setSaveDialogPredictionId(null)}
      />
      <RulesDialog open={rulesDialogOpen} onClose={() => setRulesDialogOpen(false)} />
      <DeleteGameDialog
        open={deleteGameTargetId !== null}
        game={deleteGameTargetId ? gamesById.get(deleteGameTargetId) ?? null : null}
        onConfirm={handleConfirmDeleteGame}
        onClose={() => setDeleteGameTargetId(null)}
      />
      <GoogleDisplayNameDialog
        isOpen={googleDisplayNameDialogOpen}
        email={googleUser?.email ?? ""}
        displayName={googleDisplayNameDraft}
        onDisplayNameChange={setGoogleDisplayNameDraft}
        onSave={saveGoogleDisplayName}
        saveDisabled={!googleDisplayNameDraft.trim()}
      />
      <input
        ref={competitorListInputRef}
        type="file"
        accept="application/json"
        onChange={handleCompetitorFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
