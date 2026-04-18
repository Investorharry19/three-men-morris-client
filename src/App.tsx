import { useEffect, useState } from "react";
import { socket } from "./lib/socket";
import Board from "./components/Board";
import type { Game } from "./types";
import "./App.css";

function App() {
  const [game, setGame] = useState<Game | null>(null);
  const [gameId, setGameId] = useState("");
  const [player, setPlayer] = useState<"X" | "O" | null>(null);
  const [copied, setCopied] = useState(false);

  const handleMove = (from: number, to: number) => {
    if (!game || player !== game.currentTurn) return;
    socket.emit("make_move", {
      gameId: game.id,
      move: { from, to },
    });
  };
  useEffect(() => {
    socket.on("game_created", (game: Game) => {
      setGame(game);
      setPlayer("X");
    });

    socket.on("game_start", (game: Game) => {
      setGame(game);

      if (game.players.X === socket.id) setPlayer("X");
      else if (game.players.O === socket.id) setPlayer("O");
    });

    socket.on("game_update", (game: Game) => {
      setGame(game);
    });

    socket.on("player_disconnected", () => {
      alert("Opponent disconnected");
      setGame(null);
      setPlayer(null);
    });

    return () => {
      socket.off("game_created");
      socket.off("game_start");
      socket.off("game_update");
      socket.off("player_disconnected");
    };
  }, []);

  const createGame = () => socket.emit("create_game");
  const joinGame = () => socket.emit("join_game", gameId);

  if (!game) {
    return (
      <div className="container">
        <div className="welcome-screen">
          <h1>🎮 Three Men's Morris</h1>
          <p className="subtitle">A strategic game of skill and planning</p>

          <div className="button-group">
            <button className="btn-primary" onClick={createGame}>
              ✨ Create New Game
            </button>
          </div>

          <div className="divider">or</div>

          <div className="join-section">
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Enter Game ID to join..."
            />
            <button className="btn-secondary" onClick={joinGame}>
              🎯 Join Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="game-unified">
        <div className="game-header">
          <h1>🎮 Three Men's Morris</h1>
        </div>

        <div className="game-main">
          <div className="board-container">
            <Board
              board={game.board}
              onMove={handleMove}
              currentTurn={player === game.currentTurn ? player : ("" as any)}
            />
          </div>
        </div>
        <div className="game-info-overlay">
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "space-evenly",
            }}
          >
            <div className="info-item">
              <span className="info-label">You:</span>
              <span className={`badge ${player?.toLowerCase()}`}>{player}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Turn:</span>
              <span className={`badge ${game.currentTurn?.toLowerCase()}`}>
                {game.currentTurn}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Phase:</span>
              <span className="badge phase">{game.phase}</span>
            </div>{" "}
          </div>
          <div className="info-item">
            <span className="info-label">ID:</span>
            <span
              className="game-id"
              style={{ cursor: "pointer" }}
              onClick={() => {
                navigator.clipboard.writeText(game.id);
                setCopied(true);
                setTimeout(() => setCopied(false), 1000);
              }}
            >
              {copied ? "Copied!" : game.id}
            </span>
          </div>
        </div>

        {game.winner && (
          <div className="winner-banner">
            <h2>🏆 {game.winner} wins! 🎉</h2>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
