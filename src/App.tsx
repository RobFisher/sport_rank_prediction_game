import { useMemo, useRef, useState } from "react";
import "./app.css";
import {
  createPredictionFromGame,
  moveCompetitor,
  seedData,
  type Prediction,
  type PredictionType
} from "./predictionModel.js";
import { WorkspaceHeader } from "./components/WorkspaceHeader.js";
import { PredictionPane } from "./components/PredictionPane.js";
import { NewPredictionDialog } from "./components/NewPredictionDialog.js";
import { SavePredictionDialog } from "./components/SavePredictionDialog.js";

const initialPanePredictionIds = seedData.predictions.map((prediction) => prediction.id);

function createPredictionId(counterRef: { current: number }): string {
  counterRef.current += 1;
  return `prediction-${counterRef.current}`;
}

export function App() {
  const [competitorLists] = useState(seedData.competitorLists);
  const [games] = useState(seedData.games);
  const [predictions, setPredictions] = useState<Prediction[]>(seedData.predictions);
  const [panePredictionIds, setPanePredictionIds] = useState<string[]>(
    initialPanePredictionIds.length > 0 ? initialPanePredictionIds : []
  );
  const [newPredictionDialogOpen, setNewPredictionDialogOpen] = useState(false);
  const [saveDialogPredictionId, setSaveDialogPredictionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "Using local placeholder data. Backend and login flows are stubbed."
  );
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

  const handleReloadSample = () => {
    setPredictions(seedData.predictions);
    setPanePredictionIds(initialPanePredictionIds);
    predictionIdCounter.current = seedData.predictions.length;
    setStatusMessage("Sample predictions reloaded.");
  };

  const activeSavePrediction = saveDialogPredictionId
    ? predictionsById.get(saveDialogPredictionId) ?? null
    : null;

  return (
    <div className="workspace">
      <WorkspaceHeader
        projectName="F1 2026 Predictions"
        statusMessage={statusMessage}
        canAddPane={true}
        onNewPrediction={() => setNewPredictionDialogOpen(true)}
        onLoadSample={handleReloadSample}
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
    </div>
  );
}
