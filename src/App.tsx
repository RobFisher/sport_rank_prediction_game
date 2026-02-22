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
  getBackendMe,
  listCompetitorLists,
  listGames,
  logoutBackendSession,
  updateCompetitorList,
  type BackendCompetitorList,
  type BackendGame,
  type BackendSessionUser
} from "./backendApi.js";
import { WorkspaceHeader } from "./components/WorkspaceHeader.js";
import { PredictionPane } from "./components/PredictionPane.js";
import { NewPredictionDialog } from "./components/NewPredictionDialog.js";
import { SavePredictionDialog } from "./components/SavePredictionDialog.js";
import { GoogleDisplayNameDialog } from "./components/GoogleDisplayNameDialog.js";
import { CreateGameDialog } from "./components/CreateGameDialog.js";
import { useGoogleAuth } from "./hooks/useGoogleAuth.js";

const GOOGLE_DISPLAY_NAME_BY_USER_ID_KEY = "sport_rank_display_name_by_user_id";

function createPredictionId(counterRef: { current: number }): string {
  counterRef.current += 1;
  return `prediction-${counterRef.current}`;
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

function parseDisplayNameMap(raw: string | null): Record<string, string> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([userId, name]) => [userId, typeof name === "string" ? name : ""])
        .filter(([userId, name]) => userId.trim().length > 0 && name.trim().length > 0)
    );
  } catch {
    return {};
  }
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

export function App() {
  const [competitorLists, setCompetitorLists] = useState<CompetitorList[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [panePredictionIds, setPanePredictionIds] = useState<string[]>([]);
  const [newPredictionDialogOpen, setNewPredictionDialogOpen] = useState(false);
  const [createGameDialogOpen, setCreateGameDialogOpen] = useState(false);
  const [saveDialogPredictionId, setSaveDialogPredictionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Loading data from backend...");
  const [googleDisplayNameByUserId, setGoogleDisplayNameByUserId] = useState<
    Record<string, string>
  >(() => parseDisplayNameMap(localStorage.getItem(GOOGLE_DISPLAY_NAME_BY_USER_ID_KEY)));
  const [googleDisplayNameDraft, setGoogleDisplayNameDraft] = useState("");
  const [googleDisplayNameDialogOpen, setGoogleDisplayNameDialogOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [backendSessionUser, setBackendSessionUser] = useState<BackendSessionUser | null>(
    null
  );
  const competitorListInputRef = useRef<HTMLInputElement | null>(null);
  const {
    googleToken,
    googleUser,
    googleAuthError,
    googleAuthLoading,
    connectGoogle,
    disconnectGoogle
  } = useGoogleAuth();
  const predictionIdCounter = useRef(predictions.length);

  const gamesById = useMemo(() => {
    return new Map(games.map((game) => [game.id, game]));
  }, [games]);

  const competitorListsById = useMemo(() => {
    return new Map(competitorLists.map((list) => [list.id, list]));
  }, [competitorLists]);

  const predictionsById = useMemo(() => {
    return new Map(predictions.map((prediction) => [prediction.id, prediction]));
  }, [predictions]);

  const panePredictions = panePredictionIds
    .map((predictionId) => predictionsById.get(predictionId))
    .filter((prediction): prediction is Prediction => Boolean(prediction));

  const googleConnected = Boolean(backendSessionUser);
  const isAdmin = Boolean(backendSessionUser?.isAdmin);
  const googleStatus = googleConnected
    ? `Google: ${backendSessionUser?.displayName ?? backendSessionUser?.email ?? "Connected"}`
    : null;

  useEffect(() => {
    localStorage.setItem(
      GOOGLE_DISPLAY_NAME_BY_USER_ID_KEY,
      JSON.stringify(googleDisplayNameByUserId)
    );
  }, [googleDisplayNameByUserId]);

  useEffect(() => {
    if (!googleUser) {
      setGoogleDisplayNameDialogOpen(false);
      setGoogleDisplayNameDraft("");
      return;
    }

    const existingDisplayName = googleDisplayNameByUserId[googleUser.sub];
    if (existingDisplayName) {
      setGoogleDisplayNameDialogOpen(false);
      return;
    }

    setGoogleDisplayNameDraft(normalizeDisplayName(googleUser.name) || googleUser.email);
    setGoogleDisplayNameDialogOpen(true);
  }, [googleDisplayNameByUserId, googleUser]);

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

  async function establishBackendSession(
    accessToken: string,
    fallbackUserId: string,
    fallbackEmail: string,
    fallbackName: string
  ): Promise<void> {
    const preferredDisplayName =
      googleDisplayNameByUserId[fallbackUserId] ??
      (normalizeDisplayName(fallbackName) || fallbackEmail);
    try {
      const me = await createBackendGoogleSession(accessToken, preferredDisplayName);
      if (me.authenticated && me.user) {
        setBackendSessionUser(me.user);
        setBackendStatus(`Backend session active for ${me.user.displayName}.`);
      } else {
        await refreshBackendSessionStatus();
      }
    } catch (error) {
      setBackendStatus(
        error instanceof Error
          ? error.message
          : "Failed to establish backend session after Google login."
      );
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
      const existingDisplayName = googleDisplayNameByUserId[result.user.sub];
      if (!existingDisplayName) {
        setGoogleDisplayNameDraft(normalizeDisplayName(result.user.name) || result.user.email);
        setGoogleDisplayNameDialogOpen(true);
      }
      await establishBackendSession(
        result.accessToken,
        result.user.sub,
        result.user.email,
        result.user.name
      );
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
    setGoogleDisplayNameByUserId((prev) => ({
      ...prev,
      [googleUser.sub]: normalizedDisplayName
    }));
    setGoogleDisplayNameDialogOpen(false);
    if (googleToken) {
      void establishBackendSession(
        googleToken,
        googleUser.sub,
        googleUser.email,
        normalizedDisplayName
      );
    }
  }

  function cancelGoogleDisplayNameSetup(): void {
    setGoogleDisplayNameDialogOpen(false);
    void (async () => {
      await logoutBackendSession();
      await disconnectGoogle();
      setBackendSessionUser(null);
    })();
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

  const handleCreatePrediction = (gameId: string, type: PredictionType) => {
    const game = gamesById.get(gameId);
    if (!game) {
      return;
    }
    const competitorList = competitorListsById.get(game.competitorListId);
    if (!competitorList) {
      return;
    }

    const newPrediction = createPredictionFromGame(
      createPredictionId(predictionIdCounter),
      game,
      competitorList,
      type,
      ""
    );

    setPredictions((current) => [...current, newPrediction]);
    setPanePredictionIds((current) => [...current, newPrediction.id]);
    setNewPredictionDialogOpen(false);
    setStatusMessage("Created a new prediction pane using placeholder data.");
  };

  const handleSavePrediction = (predictionId: string, type: PredictionType, name: string) => {
    setPredictions((current) =>
      current.map((prediction) =>
        prediction.id === predictionId
          ? { ...prediction, type, name: type === "fun" ? name : "" }
          : prediction
      )
    );
    setSaveDialogPredictionId(null);
    setStatusMessage("Prediction saved locally. Backend persistence is coming next.");
  };

  const handleRemovePane = (paneIndex: number) => {
    setPanePredictionIds((current) => current.filter((_, index) => index !== paneIndex));
  };

  const activeSavePrediction = saveDialogPredictionId
    ? predictionsById.get(saveDialogPredictionId) ?? null
    : null;

  return (
    <div className="workspace">
      <WorkspaceHeader
        projectName="F1 2026 Predictions"
        statusMessage={statusMessage}
        canAddPane={games.length > 0}
        googleConnected={googleConnected}
        googleBusy={googleAuthLoading}
        googleAuthError={googleAuthError}
        googleStatus={googleStatus}
        backendStatus={backendStatus}
        canUploadCompetitors={isAdmin}
        canCreateGame={isAdmin}
        onNewPrediction={() => setNewPredictionDialogOpen(true)}
        onToggleGoogleConnection={toggleGoogleConnection}
        onUploadCompetitors={handleUploadCompetitors}
        onCreateGame={() => setCreateGameDialogOpen(true)}
      />
      <section className="pane-grid">
        {panePredictions.map((prediction, paneIndex) => {
          const game = gamesById.get(prediction.gameId);
          if (!game) {
            return null;
          }
          const competitorList = competitorListsById.get(game.competitorListId);
          if (!competitorList) {
            return null;
          }

          return (
            <PredictionPane
              key={prediction.id}
              paneIndex={paneIndex}
              paneCount={panePredictions.length}
              prediction={prediction}
              game={game}
              competitorList={competitorList}
              onMoveCompetitor={handleMoveCompetitor}
              onSavePrediction={(id) => setSaveDialogPredictionId(id)}
              onRemovePane={handleRemovePane}
            />
          );
        })}
      </section>

      <NewPredictionDialog
        open={newPredictionDialogOpen}
        games={games}
        onCreate={handleCreatePrediction}
        onClose={() => setNewPredictionDialogOpen(false)}
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
        onSave={(type, name) => {
          if (!saveDialogPredictionId) {
            return;
          }
          handleSavePrediction(saveDialogPredictionId, type, name);
        }}
        onClose={() => setSaveDialogPredictionId(null)}
      />
      <GoogleDisplayNameDialog
        isOpen={googleDisplayNameDialogOpen}
        email={googleUser?.email ?? ""}
        displayName={googleDisplayNameDraft}
        onDisplayNameChange={setGoogleDisplayNameDraft}
        onSave={saveGoogleDisplayName}
        onCancel={cancelGoogleDisplayNameSetup}
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
