# Manual Testing Script

This script is for local manual regression testing, with a dedicated section for the new
`Save As` flow.

## Goal

Use this when you want to quickly confirm that:

- login works
- admin setup flows work
- predictions can be created, edited, and saved
- results can be set and viewed
- `Save As` works across games that share a competitor list
- competition-entry rules are enforced

## Recommended Setup

Use the local API so the test run is isolated and easy to reset.

1. Open a terminal in the repo root.
2. Start the backend:

```bash
nix develop -c npm run dev:api
```

3. In a second terminal, start the frontend:

```bash
nix develop -c npm run dev
```

4. Open `http://127.0.0.1:5173`.

## Test Data

Use these files:

- [manual-test-competitors.json](/home/rob/projects/sport_rank_prediction_game/manual-test-competitors.json)
- [manual-test-constructors.json](/home/rob/projects/sport_rank_prediction_game/manual-test-constructors.json)

Notes:

- The local API stores data in memory only.
- Restarting `npm run dev:api` resets users, games, predictions, and admin state.
- The first Google account to sign in after a local API restart becomes admin for that run.

## Suggested Browser Layout

- Window A: admin user
- Window B: regular user

Using a normal window plus an incognito window is usually enough.

## Script

### 1. Admin bootstrap

1. In Window A, click `Login with Google`.
Expected: login succeeds and you are treated as admin for this local run.

2. Click `Admin: Upload Competitors`.

3. Upload [manual-test-competitors.json](/home/rob/projects/sport_rank_prediction_game/manual-test-competitors.json).
Expected: the upload succeeds and the status message confirms import.

4. Click `Admin: Upload Competitors` again.

5. Upload [manual-test-constructors.json](/home/rob/projects/sport_rank_prediction_game/manual-test-constructors.json).
Expected: the upload succeeds and the status message confirms import.

6. In the Games pane, click `Admin: Create Game`.

7. Create these games using competitor list `Manual Test Drivers`:
- `Manual Test Grand Prix A` with a deadline 1 hour in the future
- `Manual Test Grand Prix B` with a deadline 2 hours in the future
- `Manual Test Championship Results` with a deadline 1 hour in the past

8. Create one more game using competitor list `Manual Test Constructors`:
- `Manual Test Constructors Cup` with a deadline 3 hours in the future

Expected: all four games appear in the Games pane. `Manual Test Grand Prix A`, `Manual Test Grand Prix B`, and `Manual Test Constructors Cup` appear under open games. `Manual Test Championship Results` appears under closed games.

### 2. Basic prediction flow

1. In Window A, open `Manual Test Grand Prix A`.

2. Click `New Prediction`.

3. Create a fun prediction named `Admin Fun A`.
Expected: a prediction pane opens.

4. Reorder two competitors.
Expected: the prediction pane shows unsaved changes.

5. Click `Save`.
Expected: the prediction saves without opening a dialog.

6. Create another prediction for `Manual Test Grand Prix A`, this time as `Competition`.
Expected: the competition prediction is created.

7. Open the competition prediction, reorder two competitors, and click `Save`.
Expected: the competition prediction saves directly.

### 3. Results flow

1. In Window A, open `Manual Test Championship Results`.

2. Click `Admin: Set Results`.

3. Reorder at least two competitors.

4. Click `Save Results`.
Expected: the results save successfully.

5. Leave Window A signed in.

6. In Window B, sign in with a different Google account.
Expected: login succeeds, but this user is not admin.

7. In Window B, open `Manual Test Championship Results`.

8. Click `View Results`.
Expected: the results pane opens for the non-admin user.

### 4. Save As from a prediction pane

1. In Window A, open the `Admin Fun A` prediction for `Manual Test Grand Prix A`.

2. Click `Save As`.
Expected: a dialog opens titled `Save as prediction`.

3. Confirm that the target game list contains:
- `Manual Test Grand Prix A`
- `Manual Test Grand Prix B`
- `Manual Test Championship Results`

Expected: only games with the same competitor list are shown.

4. Confirm that `Manual Test Constructors Cup` does not appear in the target game list.
Expected: games with different competitor lists are excluded from `Save As`.

5. In the dialog, change target game to `Manual Test Grand Prix B`.

6. Keep type as `Fun`.

7. Change the name to `Admin Fun B`.

8. Click `Save As`.
Expected: a new prediction is created for `Manual Test Grand Prix B` and opens in a new pane.

9. Reopen the original `Admin Fun A` prediction.
Expected: it is still attached to `Manual Test Grand Prix A` and unchanged except for any edits you already saved.

### 5. Save As with type change

1. In Window A, open `Admin Fun A` again.

2. Click `Save As`.

3. Set target game to `Manual Test Grand Prix B`.

4. Set type to `Competition`.

5. Click `Save As`.
Expected: a new competition prediction is created for `Manual Test Grand Prix B`.

6. Repeat the same action again: same target game, same type `Competition`.
Expected: the dialog should not allow this combination, or the save should be blocked with a message saying you already have a competition prediction for that game.

7. Reopen the dialog once more and confirm `Manual Test Constructors Cup` is still not available as a target.
Expected: changing type does not bypass the same-competitor-list restriction.

### 6. Save As from a results pane

1. In Window B, with the non-admin account, open the results pane for `Manual Test Championship Results`.

2. Reorder at least two competitors in the results pane.
Expected: reordering is allowed locally for save-as purposes, but there is no `Save Results` button for the non-admin user.

3. Click `Save As`.
Expected: the save-as dialog opens.

4. Confirm that `Manual Test Constructors Cup` does not appear as a target.
Expected: results-pane `Save As` uses the same compatible-games filter.

5. Set target game to `Manual Test Grand Prix A`.

6. Set type to `Fun`.

7. Enter the name `Results Remix`.

8. Click `Save As`.
Expected: a new fun prediction is created for the signed-in non-admin user in `Manual Test Grand Prix A`.

### 7. Save As validation checks

1. In Window B, open the results pane again and click `Save As`.

2. Target `Manual Test Grand Prix A` as `Fun`.

3. Enter the same name `Results Remix`.
Expected: save is blocked because that user already has a fun prediction with that name for that game.

4. In Window B, create a competition prediction for `Manual Test Grand Prix A` if one does not already exist.

5. From either a prediction pane or results pane, try `Save As` into `Manual Test Grand Prix A` as `Competition`.
Expected: save is blocked because that user already has a competition entry for that game.

### 8. Direct Save regression checks

1. In Window A, reopen an owned prediction and make a small reorder change.

2. Click `Save`.
Expected: the prediction updates in place with no dialog.

3. In Window A, open a prediction that has no unsaved changes.
Expected: `Save` is disabled.

4. In Window B, open a prediction owned by Window A.
Expected: `Save` is disabled, but `Save As` is available.

## Pass Criteria

The feature set passes manual testing if all of the following are true:

- direct `Save` updates owned predictions without a dialog
- `Save As` is available from prediction panes
- `Save As` is available from results panes
- `Save As` can target other games with the same competitor list
- `Save As` excludes games with different competitor lists
- `Save As` can change prediction type
- duplicate competition entries are blocked
- duplicate fun names for the same user and game are blocked
- non-admin users can use results panes as a source for `Save As`
