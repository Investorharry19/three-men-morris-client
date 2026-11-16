import type { Player } from "../types";

// Corners connect only down their own column. 6 and 7 connect to both gates.
// The gates (8, 9) are NOT directly linked, so the center (10) sits between them.
export const ADJACENCY: Record<number, number[]> = {
  0: [1],
  1: [0, 2, 8],
  2: [1],
  3: [4],
  4: [3, 5, 9],
  5: [4],
  6: [7, 8, 9, 10],
  7: [6, 8, 9, 10],
  8: [1, 6, 7, 10],
  9: [4, 6, 7, 10],
  10: [6, 7, 8, 9],
};

export function getValidMoves(
  from: number,
  board: (Player | null)[],
): number[] {
  return (ADJACENCY[from] ?? []).filter((to) => board[to] === null);
}

export function hasLegalMove(
  board: (Player | null)[],
  player: Player,
): boolean {
  return board.some(
    (owner, i) => owner === player && getValidMoves(i, board).length > 0,
  );
}
