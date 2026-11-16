import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Player } from "../types";
import { getValidMoves } from "../lib/rules";

type Props = {
  board: (Player | null)[];
  onMove: (from: number, to: number) => void;
  currentTurn: Player | null; // null when it's not your turn or the game is over
  playerSide?: Player;
};

// ─── Board geometry ───────────────────────────────────────────────────────────

const BX = 50,
  BY = 30,
  BW = 240,
  BH = 180;
const cx = BX + BW / 2; // 170, horizontal center
const cy = BY + BH / 2; // 120, vertical center
const R = 62;

const VIEW_W = 340;
const VIEW_H = 240;

const circleTop = cy - R;
const circleBottom = cy + R;
const gateLeft = cx - 60; // node 8
const gateRight = cx + 60; // node 9

const positions: { x: number; y: number }[] = [
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

const DROP_RADIUS = 30; // how close a drop must be to a valid node
const TAP_THRESHOLD = 6; // movement below this counts as a tap, not a drag

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
  const boardRef = useRef<SVGGElement>(null);
  const movedRef = useRef(false);
  const wasSelectedRef = useRef(false);

  // Ignore a stale selection (turn changed, game ended, piece moved away)
  const activeSelected =
    selected !== null && board[selected] === currentTurn ? selected : null;
  const validTargets =
    activeSelected !== null ? getValidMoves(activeSelected, board) : [];

  // Player O sees the board rotated 180° so their pieces are on their side.
  const isFlipped = playerSide === "O";
  const flipTransform = isFlipped ? `rotate(180, ${cx}, ${cy})` : undefined;

  // Pointer position in the board group's own coordinate space. The group's
  // screen matrix already includes the rotation, so no manual flipping.
  function getBoardCoords(e: PointerEvent) {
    const ctm = boardRef.current?.getScreenCTM();
    if (!ctm) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  }

  // ── Click / keyboard selection ──────────────────────────────────────────

  function toggleSelect(i: number) {
    if (board[i] !== currentTurn) return;
    setSelected((prev) => (prev === i ? null : i));
  }

  function handleNodeClick(i: number) {
    if (activeSelected === null) return;
    if (!validTargets.includes(i)) return;
    onMove(activeSelected, i);
    setSelected(null);
  }

  // ── Drag and drop (pointer events: mouse, touch, pen) ───────────────────

  function startDrag(e: PointerEvent, i: number) {
    if (board[i] !== currentTurn) return;
    const coords = getBoardCoords(e);
    if (!coords) return;
    e.preventDefault();

    // Keep receiving move/up events even if the pointer leaves the SVG
    svgRef.current?.setPointerCapture(e.pointerId);

    movedRef.current = false;
    wasSelectedRef.current = activeSelected === i;
    setSelected(i);
    setDragging(i);
    setGhostPos({ x: coords.x, y: coords.y });
  }

  function onDragMove(e: PointerEvent) {
    if (dragging === null) return;
    const coords = getBoardCoords(e);
    if (!coords) return;
    e.preventDefault();

    const origin = positions[dragging];
    if (Math.hypot(coords.x - origin.x, coords.y - origin.y) > TAP_THRESHOLD) {
      movedRef.current = true;
    }
    setGhostPos({ x: coords.x, y: coords.y });
  }

  function endDrag(e: PointerEvent, cancelled = false) {
    if (dragging === null) return;

    const svg = svgRef.current;
    if (svg?.hasPointerCapture(e.pointerId)) {
      svg.releasePointerCapture(e.pointerId);
    }

    const from = dragging;
    const coords = cancelled ? null : getBoardCoords(e);

    setDragging(null);
    setGhostPos(null);

    if (!coords) {
      setSelected(null);
      return;
    }

    // A tap (no real movement) toggles selection, like a click
    if (!movedRef.current) {
      setSelected(wasSelectedRef.current ? null : from);
      return;
    }

    // A real drag: drop on the closest valid node within range
    let best: number | null = null;
    let bestDist = DROP_RADIUS;
    for (const t of getValidMoves(from, board)) {
      const d = Math.hypot(
        positions[t].x - coords.x,
        positions[t].y - coords.y,
      );
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }

    if (best !== null) onMove(from, best);
    setSelected(null);
  }

  const draggedPlayer = dragging !== null ? board[dragging] : null;
  const dragColor = draggedPlayer === "X" ? "#277d78" : "#e6664e";
  const dragStroke = draggedPlayer === "X" ? "#175b57" : "#b84837";

  // Side labels stay upright, outside the rotated group
  const leftSide: Player = isFlipped ? "O" : "X";
  const rightSide: Player = isFlipped ? "X" : "O";
  const sideColor = (side: Player) =>
    playerSide === side
      ? side === "X"
        ? "var(--teal)"
        : "var(--coral)"
      : "#6c736d";

  return (
    <svg
      ref={svgRef}
      width={VIEW_W}
      height={VIEW_H}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      onPointerMove={onDragMove}
      onPointerUp={(e) => endDrag(e)}
      onPointerCancel={(e) => endDrag(e, true)}
      role="group"
      aria-label="Three Men's Morris game board"
      style={{ touchAction: "none", overflow: "visible" }}
    >
      <g ref={boardRef} transform={flipTransform}>
        {/* ── Board lines ─────────────────────────────────────────── */}
        <line x1={BX} y1={BY} x2={BX} y2={BY + BH} className="board-line" />
        <line
          x1={BX + BW}
          y1={BY}
          x2={BX + BW}
          y2={BY + BH}
          className="board-line"
        />
        <line x1={BX} y1={cy} x2={BX + BW} y2={cy} className="board-line" />
        <line
          x1={cx}
          y1={BY + 25}
          x2={cx}
          y2={circleTop + 60}
          className="board-line"
        />
        <line
          x1={cx}
          y1={circleBottom - 60}
          x2={cx}
          y2={BY + BH - 30}
          className="board-line"
        />
        <circle cx={cx} cy={cy} r={R} fill="none" className="board-line" />

        {/* ── Gate tick marks ──────────────────────────────────────── */}
        <line
          x1={gateLeft}
          y1={cy - 6}
          x2={gateLeft}
          y2={cy + 6}
          stroke="#7a807b"
          strokeWidth="1.5"
        />
        <line
          x1={gateRight}
          y1={cy - 6}
          x2={gateRight}
          y2={cy + 6}
          stroke="#7a807b"
          strokeWidth="1.5"
        />

        {/* ── Valid target highlights ──────────────────────────────── */}
        {validTargets.map((i) => (
          <circle
            key={`hl-${i}`}
            cx={positions[i].x}
            cy={positions[i].y}
            r={11}
            fill="var(--teal)"
            opacity={0.25}
            style={{ pointerEvents: "none" }}
          />
        ))}

        {/* ── Node dots ────────────────────────────────────────────── */}
        {positions.map((p, i) => {
          const isGate = i === 8 || i === 9;
          const isCenter = i === 10;
          const isTarget = validTargets.includes(i);
          return (
            <circle
              key={`nd-${i}`}
              cx={p.x}
              cy={p.y}
              r={isTarget ? 7 : isCenter ? 6 : isGate ? 5 : 4}
              className="node"
              fill={
                isTarget
                  ? "var(--teal)"
                  : isGate || isCenter
                    ? "#7a807b"
                    : undefined
              }
              opacity={isTarget ? 1 : isGate || isCenter ? 0.9 : 0.75}
              style={{ cursor: isTarget ? "pointer" : "default" }}
              role={isTarget ? "button" : undefined}
              tabIndex={isTarget ? 0 : -1}
              aria-label={isTarget ? `Move to position ${i + 1}` : undefined}
              onClick={() => handleNodeClick(i)}
              onKeyDown={(event: KeyboardEvent<SVGCircleElement>) => {
                if (isTarget && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  handleNodeClick(i);
                }
              }}
            />
          );
        })}

        {/* ── Pieces ───────────────────────────────────────────────── */}
        {positions.map((p, i) => {
          const owner = board[i];
          if (!owner) return null;
          const isBlue = owner === "X";
          const isSel = activeSelected === i;
          const isDragging = dragging === i;
          const canMove = owner === currentTurn;
          return (
            <circle
              key={`pc-${i}`}
              cx={p.x}
              cy={p.y}
              r={16}
              className={`${isBlue ? "token token-x" : "token token-o"}${
                isSel ? " selected" : ""
              }`}
              fill={isBlue ? "var(--teal)" : "var(--coral)"}
              stroke={isSel ? "#f4c95d" : undefined}
              strokeWidth={isSel ? 3 : 2}
              opacity={isDragging ? 0.35 : 1}
              style={{ cursor: canMove ? "grab" : "default" }}
              role="button"
              tabIndex={canMove ? 0 : -1}
              aria-label={`${owner} piece at position ${i + 1}${isSel ? ", selected" : ""}`}
              aria-disabled={!canMove}
              onPointerDown={(e) => startDrag(e, i)}
              onKeyDown={(event: KeyboardEvent<SVGCircleElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleSelect(i);
                }
              }}
            />
          );
        })}

        {/* ── Drag ghost ───────────────────────────────────────────── */}
        {ghostPos && dragging !== null && (
          <circle
            cx={ghostPos.x}
            cy={ghostPos.y}
            r={16}
            fill={dragColor}
            stroke={dragStroke}
            strokeWidth={2}
            opacity={0.75}
            style={{ pointerEvents: "none" }}
          />
        )}
      </g>

      {/* ── Side labels (outside the rotation, always upright) ───────── */}
      <text
        x={BX - 8}
        y={cy + 4}
        textAnchor="end"
        fontSize="10"
        fill={sideColor(leftSide)}
        fontWeight={playerSide === leftSide ? "700" : "400"}
      >
        {`▶ ${leftSide}`}
      </text>
      <text
        x={BX + BW + 8}
        y={cy + 4}
        textAnchor="start"
        fontSize="10"
        fill={sideColor(rightSide)}
        fontWeight={playerSide === rightSide ? "700" : "400"}
      >
        {`${rightSide} ◀`}
      </text>
    </svg>
  );
}
