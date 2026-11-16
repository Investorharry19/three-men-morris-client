import { useEffect, useState, type FormEvent } from "react";
import { socket } from "./lib/socket";
import Board from "./components/Board";
import type { Game, Player } from "./types";
import "./App.css";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

function App() {
  const [game, setGame] = useState<Game | null>(null);
  const [gameId, setGameId] = useState("");
  const [player, setPlayer] = useState<Player | null>(null);
  const [copied, setCopied] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>(socket.connected ? "connected" : "connecting");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const opponentJoined = Boolean(game?.players.X && game.players.O);
  const isMyTurn =
    Boolean(
      connectionStatus === "connected" &&
        opponentJoined &&
        player &&
        game &&
        player === game.currentTurn,
    );

  const handleMove = (from: number, to: number) => {
    if (!game || !isMyTurn) return;
    socket.emit("make_move", {
      gameId: game.id,
      move: { from, to },
    });
  };

  useEffect(() => {
    const handleConnect = () => {
      setConnectionStatus("connected");
      setMessage((currentMessage) =>
        currentMessage.startsWith("Couldn't reach the game server")
          ? ""
          : currentMessage,
      );
    };
    const handleDisconnect = () => {
      setConnectionStatus("disconnected");
      setGame(null);
      setPlayer(null);
      setIsSubmitting(false);
      setMessage(
        "Connection to the game server was lost. Any active match has ended; start a new game after reconnecting.",
      );
    };
    const handleConnectError = () => {
      setConnectionStatus("disconnected");
      setMessage("Couldn't reach the game server. Check your connection and retry.");
    };
    const handleGameCreated = (nextGame: Game) => {
      setGame(nextGame);
      setPlayer("X");
      setIsSubmitting(false);
      setMessage("");
    };
    const handleGameStart = (nextGame: Game) => {
      setGame(nextGame);
      if (nextGame.players.X === socket.id) setPlayer("X");
      else if (nextGame.players.O === socket.id) setPlayer("O");
      setIsSubmitting(false);
      setMessage("");
    };
    const handleGameUpdate = (nextGame: Game) => setGame(nextGame);
    const handleGameError = (errorMessage: string) => {
      setMessage(errorMessage);
      setIsSubmitting(false);
    };
    const handlePlayerDisconnected = () => {
      setGame(null);
      setPlayer(null);
      setIsSubmitting(false);
      setMessage("Your opponent left the table. Start a new game or join another.");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("game_created", handleGameCreated);
    socket.on("game_start", handleGameStart);
    socket.on("game_update", handleGameUpdate);
    socket.on("game_error", handleGameError);
    socket.on("player_disconnected", handlePlayerDisconnected);
    if (socket.connected) handleConnect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("game_created", handleGameCreated);
      socket.off("game_start", handleGameStart);
      socket.off("game_update", handleGameUpdate);
      socket.off("game_error", handleGameError);
      socket.off("player_disconnected", handlePlayerDisconnected);
    };
  }, []);

  const createGame = () => {
    if (connectionStatus !== "connected" || isSubmitting) return;
    setMessage("");
    setIsSubmitting(true);
    socket.emit("create_game");
  };

  const joinGame = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = gameId.trim();
    if (!code) {
      setMessage("Enter a game code to join a table.");
      return;
    }
    if (connectionStatus !== "connected" || isSubmitting) return;
    setMessage("");
    setIsSubmitting(true);
    socket.emit("join_game", code);
  };

  const copyGameId = async () => {
    try {
      await navigator.clipboard.writeText(game?.id ?? "");
      setCopied(true);
      setMessage("");
    } catch {
      setCopied(false);
      setMessage("Couldn't copy the code. Select it and copy it manually.");
    }
  };

  const piecesOnBoard = game?.board.filter(Boolean).length ?? 0;

  if (!game) {
    const canPlay = connectionStatus === "connected" && !isSubmitting;

    return (
      <div className="container">
        <main className="welcome-screen">
          <div className="brand-mark" aria-hidden="true">
            3M
          </div>
          <h1>
            Three Men's
            <br />
            Morris
          </h1>
          <p className="subtitle">Small board. Sharp decisions.</p>

          <div className="button-group">
            <button
              className="btn-primary"
              onClick={createGame}
              disabled={!canPlay}
            >
              <span>{isSubmitting ? "Opening a table…" : "Start a new game"}</span>
              <span aria-hidden="true">↗</span>
            </button>
          </div>

          <div className="divider">
            <span>or join an open table</span>
          </div>

          <form className="join-section" onSubmit={joinGame}>
            <label className="visually-hidden" htmlFor="game-code">
              Game code
            </label>
            <input
              id="game-code"
              type="text"
              value={gameId}
              onChange={(event) => setGameId(event.target.value)}
              placeholder="Paste game code"
              autoComplete="off"
              maxLength={32}
            />
            <button className="btn-secondary" type="submit" disabled={!canPlay}>
              Join game <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="welcome-note">
            No account. No setup. Just a board and a rival.
          </p>
          <div className={`connection-status ${connectionStatus}`} role="status">
            <span className="connection-dot" aria-hidden="true" />
            {connectionStatus === "connected"
              ? "Game server ready"
              : connectionStatus === "connecting"
                ? "Connecting to the game server…"
                : "Game server unavailable"}
          </div>
          {message && (
            <p className="feedback-message" role="alert">
              {message}
              {connectionStatus === "disconnected" && (
                <button
                  className="retry-button"
                  type="button"
                  onClick={() => {
                    setConnectionStatus("connecting");
                    setMessage("");
                    socket.connect();
                  }}
                >
                  Retry
                </button>
              )}
            </p>
          )}
        </main>
      </div>
    );
  }

  const turnMessage = game.winner
    ? `${game.winner} takes the table`
    : !opponentJoined
      ? "Waiting for a rival"
      : isMyTurn
        ? "Your move"
        : "Opponent's move";

  return (
    <div className="container">
      <main className="game-unified">
        <header className="game-header">
          <div>
            <h1>Three Men's Morris</h1>
          </div>
          <div className="match-code">
            <span>GAME CODE</span>
            <button
              className="game-id"
              onClick={copyGameId}
              title="Copy game code"
              aria-label={`Copy game code ${game.id}`}
            >
              {copied ? "Copied" : game.id}
            </button>
          </div>
        </header>

        <section className="game-main" aria-label="Game board">
          <div className="board-container">
            <div className="board-caption">
              <span>
                {!opponentJoined
                  ? "Share your code to invite a rival"
                  : game.phase === "placing"
                    ? "Place your men"
                    : "Move a man along the lines"}
              </span>
            </div>
            <Board
              board={game.board}
              onMove={handleMove}
              currentTurn={isMyTurn ? player : null}
              playerSide={player ?? undefined}
            />
            {!opponentJoined && (
              <p className="waiting-note">
                The match begins as soon as your opponent joins.
              </p>
            )}
          </div>
        </section>

        <aside className="game-info-overlay" aria-label="Match status">
          <div className="turn-callout" aria-live="polite">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <span className="info-label">
                {game.winner ? "Winner" : "Match status"}
              </span>
              <strong>{turnMessage}</strong>
            </div>
          </div>
          <div className="stats-row">
            <div className="info-item">
              <span className="info-label">Your side</span>
              <span className={`badge ${player?.toLowerCase() ?? ""}`}>
                {player ?? "—"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Phase</span>
              <span className="badge phase">{game.phase}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Pieces</span>
              <strong className="piece-count">
                {piecesOnBoard}
                <small> / 6</small>
              </strong>
            </div>
          </div>
          {message && (
            <p className="feedback-message" role="alert">
              {message}
            </p>
          )}
        </aside>

        {game.winner && (
          <section className="winner-banner" aria-live="polite">
            <span>Match complete</span>
            <h2>{game.winner} wins</h2>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
