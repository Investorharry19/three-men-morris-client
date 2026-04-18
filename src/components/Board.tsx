import { useRef, useState } from "react";
import type { Player } from "../types";

type Props = {
  board: (Player | null)[];
  onMove: (from: number, to: number) => void;
  currentTurn: Player;
  playerSide: Player;
};

// ─── Board geometry ───────────────────────────────────────────────────────────

const BX = 50,
  BY = 30,
  BW = 240,
  BH = 180;
const cx = BX + BW / 2; // 170 — horizontal center
const cy = BY + BH / 2; // 120 — vertical center
const R = 62;

const circleTop = cy - R;
const circleBottom = cy + R;
const gateLeft = cx - 60; // node 8
const gateRight = cx + 60; // node 9

export const positions: { x: number; y: number }[] = [
  { x: BX, y: BY }, // 0  top-left   (Blue home)
  { x: BX, y: cy }, // 1  mid-left   (Blue home)
  { x: BX, y: BY + BH }, // 2  bot-left   (Blue home)
  { x: BX + BW, y: BY }, // 3  top-right  (Red home)
  { x: BX + BW, y: cy }, // 4  mid-right  (Red home)
  { x: BX + BW, y: BY + BH }, // 5  bot-right  (Red home)
  { x: cx, y: circleTop }, // 6  circle-top
  { x: cx, y: circleBottom }, // 7  circle-bot
  { x: gateLeft, y: cy }, // 8  left gate
  { x: gateRight, y: cy }, // 9  right gate
  { x: cx, y: cy }, // 10 center of circle
];

// Corners only connect along outer edges.
// Circle nodes (6, 7) and center (10) are only reachable via gates (8, 9).
const ADJACENCY: Record<number, number[]> = {
  0: [1, 3],
  1: [0, 2, 8],
  2: [1, 5],
  3: [0, 4],
  4: [3, 5, 9],
  5: [4, 2],
  6: [7, 8, 9, 10],
  7: [6, 8, 9, 10],
  8: [1, 6, 7, 9, 10],
  9: [4, 6, 7, 8, 10],
  10: [6, 7, 8, 9],
};

function getValidMoves(from: number, board: (Player | null)[]): number[] {
  return (ADJACENCY[from] ?? []).filter((to) => board[to] === null);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Board({
  board,
  onMove,
  currentTurn,
  playerSide,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const svgRef = useRef<SVGSVGElement>(null);

  const validTargets = selected !== null ? getValidMoves(selected, board) : [];

  // Player O sees the board rotated 180° so their pieces always face them
  const isFlipped = playerSide === "O";
  const flipTransform = isFlipped ? `rotate(180, 170, 130)` : undefined;

  function getSVGCoords(e: React.MouseEvent | React.TouchEvent) {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    const src =
      "touches" in e
        ? (e as React.TouchEvent).changedTouches[0]
        : (e as React.MouseEvent);
    pt.x = src.clientX;
    pt.y = src.clientY;
    const coords = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    if (isFlipped) {
      coords.x = 340 - coords.x;
      coords.y = 260 - coords.y;
    }
    return coords;
  }

  function handlePieceClick(i: number) {
    if (board[i] !== currentTurn) return;
    setSelected(selected === i ? null : i);
  }

  function handleNodeClick(i: number) {
    if (selected === null) return;
    if (!validTargets.includes(i)) return;
    onMove(selected, i);
    setSelected(null);
  }

  function startDrag(e: React.MouseEvent | React.TouchEvent, i: number) {
    if (board[i] !== currentTurn) return;
    e.preventDefault();
    setSelected(i);
    setDragging(i);
    setGhostPos(getSVGCoords(e));
  }

  function onDragMove(e: React.MouseEvent | React.TouchEvent) {
    if (dragging === null) return;
    e.preventDefault();
    setGhostPos(getSVGCoords(e));
  }

  function onDragEnd(e: React.MouseEvent | React.TouchEvent) {
    if (dragging === null) return;
    const coords = getSVGCoords(e);
    const moves = getValidMoves(dragging, board);

    let best: number | null = null;
    let bestDist = 30;
    moves.forEach((t) => {
      const dx = positions[t].x - coords.x;
      const dy = positions[t].y - coords.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    });

    if (best !== null) onMove(dragging, best);
    setDragging(null);
    setSelected(null);
    setGhostPos(null);
  }

  const dragColor =
    dragging !== null
      ? board[dragging] === "X"
        ? "#3b82f6"
        : "#ef4444"
      : "none";
  const dragStroke =
    dragging !== null
      ? board[dragging] === "X"
        ? "#1d4ed8"
        : "#b91c1c"
      : "none";

  return (
    <svg
      ref={svgRef}
      width="340"
      height="260"
      viewBox="0 0 340 260"
      onMouseMove={onDragMove}
      onMouseUp={onDragEnd}
      onTouchMove={onDragMove}
      onTouchEnd={onDragEnd}
      style={{ touchAction: "none", overflow: "visible" }}
    >
      <g transform={flipTransform}>
        {/* ── Board lines ─────────────────────────────────────────── */}

        {/* Left vertical edge */}
        <line
          x1={BX}
          y1={BY}
          x2={BX}
          y2={BY + BH}
          stroke="#000"
          strokeWidth="2"
        />
        {/* Right vertical edge */}
        <line
          x1={BX + BW}
          y1={BY}
          x2={BX + BW}
          y2={BY + BH}
          stroke="#000"
          strokeWidth="2"
        />
        {/* Center horizontal — full width */}
        <line
          x1={BX}
          y1={cy}
          x2={BX + BW}
          y2={cy}
          stroke="#000"
          strokeWidth="2"
        />
        {/* Center vertical — upper segment: top of board → circle top */}
        <line
          x1={cx}
          y1={BY + 25}
          x2={cx}
          y2={circleTop + 60}
          stroke="#000"
          strokeWidth="2"
        />
        {/* Center vertical — lower segment: circle bottom → bottom of board */}
        <line
          x1={cx}
          y1={circleBottom - 60}
          x2={cx}
          y2={BY + BH - 30}
          stroke="#000"
          strokeWidth="2"
        />
        {/* Circle */}
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke="#000"
          strokeWidth="2"
        />

        {/* ── Gate tick marks ──────────────────────────────────────── */}
        <line
          x1={gateLeft}
          y1={cy - 6}
          x2={gateLeft}
          y2={cy + 6}
          stroke="#888"
          strokeWidth="1.5"
        />
        <line
          x1={gateRight}
          y1={cy - 6}
          x2={gateRight}
          y2={cy + 6}
          stroke="#888"
          strokeWidth="1.5"
        />

        {/* ── Valid target highlights ──────────────────────────────── */}
        {validTargets.map((i) => (
          <circle
            key={`hl-${i}`}
            cx={positions[i].x}
            cy={positions[i].y}
            r={11}
            fill="#22c55e"
            opacity={0.25}
            style={{ pointerEvents: "none" }}
          />
        ))}

        {/* ── Node dots ────────────────────────────────────────────── */}
        {positions.map((p, i) => {
          const isGate = i === 8 || i === 9;
          const isCenter = i === 10;
          const isTarget = validTargets.includes(i);
          const isOccupied = board[i] !== null;

          return (
            <circle
              key={`nd-${i}`}
              cx={p.x}
              cy={p.y}
              r={isTarget ? 7 : isCenter ? 6 : isGate ? 5 : 4}
              fill={
                isTarget
                  ? "#22c55e"
                  : (isGate || isCenter) && isOccupied
                    ? "#f59e0b"
                    : isGate || isCenter
                      ? "#888"
                      : "#555"
              }
              style={{ cursor: isTarget ? "pointer" : "default" }}
              onClick={() => handleNodeClick(i)}
            />
          );
        })}

        {/* ── Pieces ───────────────────────────────────────────────── */}
        {positions.map((p, i) => {
          if (!board[i]) return null;
          const isBlue = board[i] === "X";
          const isSel = selected === i;
          const isDragging = dragging === i;
          const isMyTurn = board[i] === currentTurn;
          return (
            <circle
              key={`pc-${i}`}
              cx={p.x}
              cy={p.y}
              r={16}
              fill={isBlue ? "#3b82f6" : "#ef4444"}
              stroke={isSel ? "#facc15" : isBlue ? "#1d4ed8" : "#b91c1c"}
              strokeWidth={isSel ? 3 : 2}
              opacity={isDragging ? 0.35 : 1}
              style={{ cursor: isMyTurn ? "grab" : "default" }}
              onClick={() => handlePieceClick(i)}
              onMouseDown={(e) => startDrag(e, i)}
              onTouchStart={(e) => startDrag(e, i)}
            />
          );
        })}

        {/* ── Player side labels ───────────────────────────────────── */}
        <text
          x={BX - 8}
          y={cy + 4}
          textAnchor="end"
          fontSize="10"
          fill={playerSide === "X" ? "#3b82f6" : "#9ca3af"}
          fontWeight={playerSide === "X" ? "700" : "400"}
        >
          {isFlipped ? "▶ O" : "▶ X"}
        </text>
        <text
          x={BX + BW + 8}
          y={cy + 4}
          textAnchor="start"
          fontSize="10"
          fill={playerSide === "O" ? "#ef4444" : "#9ca3af"}
          fontWeight={playerSide === "O" ? "700" : "400"}
        >
          {isFlipped ? "O ◀" : "X ◀"}
        </text>

        {/* ── Drag ghost ───────────────────────────────────────────── */}
        {ghostPos && dragging !== null && (
          <circle
            cx={isFlipped ? 340 - ghostPos.x : ghostPos.x}
            cy={isFlipped ? 260 - ghostPos.y : ghostPos.y}
            r={16}
            fill={dragColor}
            stroke={dragStroke}
            strokeWidth={2}
            opacity={0.75}
            style={{ pointerEvents: "none" }}
          />
        )}
      </g>
    </svg>
  );
}
