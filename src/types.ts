export type Player = "X" | "O";

type Game = {
  id: string;
  players: Record<Player, string | null>;
  board: (Player | null)[];
  currentTurn: Player;
  phase: "placing" | "moving" | "finished";
  winner: Player | null;
};

export type { Game };
