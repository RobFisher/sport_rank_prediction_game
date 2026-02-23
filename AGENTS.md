# AGENTS.md

Guidance for AI coding agents working in this repo.

## Project summary
- Sport Rank Prediction Game: users rank competitors for games (e.g., F1 2026).
- Backend: AWS Lambda + API Gateway + DynamoDB (CDK).
- Frontend: React + Vite.

## Key rules
- Store at most user email addresses (no other PII). Display name is user-chosen.
- Competition predictions: one per user per game, editable until game closes.
- Fun predictions: unlimited, editable; name must be unique per user/game (UI enforces).
- Scores are lowest-score-wins once results are known (future work).

## Auth + display names
- Google OAuth; backend sessions stored in DynamoDB.
- Display names are required and unique; do not auto-fill with Google real name.
- Backend resolves display names by email so the same account on new devices reuses it.
- Display name locks stored as `USER_DISPLAY_NAME#<lowercased-name>` items.

## Data model (DynamoDB)
- Users: `pk=USER#<userId>`, `sk=PROFILE`.
- Display name locks: `pk=USER_DISPLAY_NAME#<name>`, `sk=LOCK`.
- Games: `pk=GAME#<gameId>`, `sk=META`.
- Competitor lists: `pk=COMPETITOR_LIST#<listId>`, `sk=META`.
- Predictions: `pk=PREDICTION#<predictionId>`, `sk=META`, GSI1 for `GAME#<gameId>`.
- Competition lock: `pk=PREDICTION_COMPETITION#<gameId>#<userId>`, `sk=LOCK`.

## Backend endpoints (selected)
- `/api/competitor-lists` (GET/POST)
- `/api/games` (GET/POST)
- `/api/games/{gameId}` (GET/PUT/DELETE)
- `/api/games/{gameId}/predictions` (GET)
- `/api/predictions` (POST)
- `/api/predictions/{predictionId}` (GET/PUT/DELETE)
- `/api/admin/backfill-display-names` (POST, admin only)

## Dev commands
- `nix develop`
- `npm ci`
- `npm run dev`
- `npm run dev:api`
- `npm test -- <pattern>`

## Deploy
- Backend/Frontend CDK in `lib/` and `bin/`.
- Use npm scripts from `package.json` (see `INSTALL.md`).
- Always set `AWS_PROFILE` and `AWS_REGION`.

## UI conventions
- Prediction panes are the primary UI. Games list and prediction list panes exist.
- Admin actions live in the Games pane (create/delete) and header (upload competitors).
- Use modal dialogs for destructive actions or save flows.

## Tests
- Backend scan/query helpers: `src/backendApiHandler.test.ts`.
- Prefer adding tests when touching backend query helpers.

## Notes
- There is no AGENTS.md elsewhere; keep this file updated with new flows.
- Avoid heavy UI rework; match the existing styling.
