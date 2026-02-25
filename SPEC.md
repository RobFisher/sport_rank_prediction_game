Sport Rank Prediction Game

# Overview
This is a web-based game in which users make predictions about the order of ranking
of participants in sports.

The implementation will focus first on predictions for the 2026 Formula One season.

# Most important rule
For sharing information between users we may store at most email addresses: no other PII.
Store everything using data handling best practices.

# Development
Make a flake-based Nix devenv for the CLI parts of the development environment.

The app will be coded in Typescript.

Nix will just install Nodejs: after that just use npm to manage
the dependencies. Avoid installing Node stuff globally; keep it in the devenv.

The UI framework will be React. I am not very familiar with React so make it clear
which parts of the code are interesting and which are React-specific boilerplate and
scaffolding.

Deployment to AWS will be with CDK. The Nix devenv will make relevant AWS and CDK
CLI tools available.

Prefer to use existing libraries where appropriate: keep new code minimal.

We will re-use concepts and code from the "Rob's Roadtrip Playlist Editor"
 - please ask where this code is located so you can refer to it.

# Data model
Users will log in with Google OATH and choose a user name on first login. Users can optionally have
administrator permissions. The first user to log in will get administrator permissions by default.

The administrator will create games. A game consists of:
 - name (e.g. "F1 2026 Constructors Championship" or "2026 Belgian GP driver placements")
 - competitors: a referenece to a list of competitors
 - closing datetime: the time after which users can not add more "competition" predictions for this game
   but can still add "fun" predictions (e.g. for the purpose of experimenting with the scoring system).

The administrator will create lists of competitors. A competitor has these properties:
 - name
 - subtitle (optional, e.g. for team or engine manufacturer information)
 - number (optional)

Users can create predictions. A prediction can be "fun" or "competition". A prediction
will be for a specific game. A user can create only one "competition" prediction for a game and
can edit it until the game closes. Many "fun" predictions can be created and edited for the same
game.

A prediction is linked to a specific game. It includes all the competitors in the game in a specific order.

The administrator can create game results. A game results is the real order that competitors finished in.

Once game results are created, predictions gain a score property. The scoring is "lowest score wins". A
correctly placed competitor scores 0 points, off by one (e.g. predicted third place, actual fourth place)
scores 1 point, and so on.

# UI
We can use the playlist panes from "Rob's Roadtrip Playlist Editor" for editing predictions.

Instead of songs, competitors will be displayed in the panes, and can be reordered only.

Administrators will upload games and competitor lists as JSON files to begin with.

Users will click a button to make a new prediction, pick a game from a drop-down list,
and then a pane will appear with the competitors ready to be re-ordered.

A button will allow for saving a prediction, with a dialog with options for "competition",
"fun" (with the ability to give it a prediction name).

It will be possible to select a game, and then load in one's own predictions and others'
into panes (much like we can load playlists into separate panes in "Rob's Roadtrip Playlist Editor).

# What to use from Rob's Roadtrip Playlist Editor
- UI elements and overall UI design approach
- The ability to run locally (mainly for testing this time) and deploy to AWS using CDK; use the
  same approach including the INSTALL.md documentation and the script for generating AWS deployer
  policy.

# What not to use from Rob's Roadtrip Playlist Editor
- No Spotify integration!
- The data model is different
- No drag and drop between lists - just re-ordering

# To be decided
Q: does DynamoDb make sense as a back end data storage for this?
