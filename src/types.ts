export type Player = "X" | "O";

export type Phase = "placing" | "moving" | "finished";

export type Game = {
  id: string;
  players: Record<Player, string | null>;
  board: (Player | null)[];
  currentTurn: Player;
  phase: Phase;
  placed: Record<Player, number>;
  winner: Player | null;
  result?: "win" | "draw" | null;
  drawReason?: string;
  endReason?: string;
  movingTurns?: number;
  maxMovingTurns?: number;
  repeatCount?: number;
  turnMsLeft?: number | null;
  drawOffer?: Player | null;
};
