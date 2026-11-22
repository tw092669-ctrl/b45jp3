import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Compass,
  Eraser,
  Paintbrush,
  Pencil,
  SquareDashed,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { FloorPlanColorZone, FloorPlanData, FloorPlanRect } from '../types/hvac';
import ConfirmDialog from './ConfirmDialog';

export const DEFAULT_FLOORPLAN_PALETTE: FloorPlanColorZone[] = [
  { id: 0, name: '客廳', color: '#0EA5E9' },
  { id: 1, name: '主臥', color: '#10B981' },
  { id: 2, name: '次臥', color: '#F59E0B' },
  { id: 3, name: '書房', color: '#F43F5E' },
  { id: 4, name: '餐廳', color: '#6366F1' },
  { id: 5, name: '廚房', color: '#14B8A6' },
  { id: 6, name: '陽台', color: '#F97316' },
  { id: 7, name: '走廊', color: '#A855F7' },
];

export function createDefaultFloorPlan(): FloorPlanData {
  return {
    gridSize: 80,
    cellSizeCm: 20,
    compassAngle: 0,
    palette: DEFAULT_FLOORPLAN_PALETTE.map((p) => ({ ...p })),
    cells: {},
    rects: [],
  };
}

function adjustHexColor(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

interface ConnectedBlock {
  colorIdx: number;
  cells: { r: number; c: number }[];
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
}

function getRectShapeCells(rect: FloorPlanRect): { r: number; c: number }[] {
  if (rect.shapeCells?.length) {
    return rect.shapeCells.map((cell) => ({ ...cell }));
  }
  const cells: { r: number; c: number }[] = [];
  for (let r = rect.minRow; r <= rect.maxRow; r++) {
    for (let c = rect.minCol; c <= rect.maxCol; c++) {
      cells.push({ r, c });
    }
  }
  return cells;
}

function rectContainsCell(rect: FloorPlanRect, row: number, col: number): boolean {
  return getRectShapeCells(rect).some((cell) => cell.r === row && cell.c === col);
}

function extractConnectedBlocks(cells: Record<string, number>, gridSize: number): ConnectedBlock[] {
  const visited = new Set<string>();
  const blocks: ConnectedBlock[] = [];
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (const key in cells) {
    if (visited.has(key)) continue;
    const colorIdx = cells[key];
    if (colorIdx === undefined) continue;
    const [r0Str, c0Str] = key.split(',');
    const r0 = Number(r0Str);
    const c0 = Number(c0Str);
    if (Number.isNaN(r0) || Number.isNaN(c0)) continue;

    const queue: { r: number; c: number }[] = [{ r: r0, c: c0 }];
    visited.add(key);
    const compCells: { r: number; c: number }[] = [];
    let minR = r0;
    let maxR = r0;
    let minC = c0;
    let maxC = c0;

    while (queue.length > 0) {
      const curr = queue.pop()!;
      compCells.push(curr);
      if (curr.r < minR) minR = curr.r;
      if (curr.r > maxR) maxR = curr.r;
      if (curr.c < minC) minC = curr.c;
      if (curr.c > maxC) maxC = curr.c;

      for (const [dr, dc] of dirs) {
        const nr = curr.r + dr;
        const nc = curr.c + dc;
        if (nr < 0 || nc < 0 || nr >= gridSize || nc >= gridSize) continue;
        const nKey = `${nr},${nc}`;
        if (!visited.has(nKey) && cells[nKey] === colorIdx) {
          visited.add(nKey);
          queue.push({ r: nr, c: nc });
        }
      }
    }

    blocks.push({ colorIdx, cells: compCells, minR, maxR, minC, maxC });
  }

  return blocks;
}

export function renderFloorPlanCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  floorPlan: FloorPlanData,
  selectionPreview?: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
    color: string;
    isEraser: boolean;
  } | null
) {
  const N = floorPlan.gridSize || 80;
  const cellW = width / N;
  const cellH = height / N;
  const lift = Math.max(3, Math.min(6, cellW * 0.45));

  // 1. Gray checkerboard background (灰底棋盤式表格)
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#E5E7EB' : '#D4D8DF';
      ctx.fillRect(c * cellW, r * cellH, cellW + 0.35, cellH + 0.35);
    }
  }

  // 2. Crisp grid lines + 5-cell architectural meter guides
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    if (i % 5 === 0) continue;
    const pos = Math.round(i * cellW) + 0.5;
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, height);
    ctx.moveTo(0, pos);
    ctx.lineTo(width, pos);
  }
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.55)';
  ctx.beginPath();
  for (let i = 0; i <= N; i += 5) {
    const pos = Math.round(i * cellW) + 0.5;
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, height);
    ctx.moveTo(0, pos);
    ctx.lineTo(width, pos);
  }
  ctx.stroke();

  const { cells, palette } = floorPlan;
  const getCellColorIdx = (r: number, c: number): number | undefined => {
    if (r < 0 || c < 0 || r >= N || c >= N) return undefined;
    return cells[`${r},${c}`];
  };

  // Explicit rectangles are rendered independently. Legacy data without rects still uses
  // the old contiguous-block rendering for backward compatibility.
  const blocks: ConnectedBlock[] = [];
  const coveredKeys = new Set<string>();
  for (const rect of floorPlan.rects ?? []) {
    const rectCells: { r: number; c: number }[] = [];
    if (rect.shapeCells?.length) {
      for (const cell of rect.shapeCells) {
        const key = `${cell.r},${cell.c}`;
        if (cell.r >= 0 && cell.c >= 0 && cell.r < N && cell.c < N) {
          rectCells.push({ r: cell.r, c: cell.c });
          coveredKeys.add(key);
        }
      }
    } else {
      for (let r = rect.minRow; r <= rect.maxRow; r++) {
        for (let c = rect.minCol; c <= rect.maxCol; c++) {
          const key = `${r},${c}`;
          if (r >= 0 && c >= 0 && r < N && c < N) {
            rectCells.push({ r, c });
            coveredKeys.add(key);
          }
        }
      }
    }
    if (rectCells.length > 0) {
      blocks.push({
        colorIdx: rect.colorIdx,
        cells: rectCells,
        minR: rect.minRow,
        maxR: rect.maxRow,
        minC: rect.minCol,
        maxC: rect.maxCol,
      });
    }
  }
  const legacyCells: Record<string, number> = {};
  for (const key in cells) {
    if (!coveredKeys.has(key)) legacyCells[key] = cells[key];
  }
  blocks.push(...extractConnectedBlocks(legacyCells, N));
  // Sort blocks top-to-bottom, left-to-right for natural 2.5D painter's order
  blocks.sort((a, b) => a.minR - b.minR || a.minC - b.minC);

  for (const block of blocks) {
    const zone = palette[block.colorIdx];
    if (!zone) continue;
    const colorIdx = block.colorIdx;
    const offX = -lift * 0.45;
    const offY = -lift * 0.45;

    // A. Unified floor drop shadow along exposed bottom/right perimeter
    ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
    for (const { r, c } of block.cells) {
      const x = c * cellW;
      const y = r * cellH;
      const hasBottom = getCellColorIdx(r + 1, c) === colorIdx;
      const hasRight = getCellColorIdx(r, c + 1) === colorIdx;
      if (!hasBottom) {
        ctx.fillRect(x + lift * 0.35, y + cellH, cellW + lift * 0.65, lift * 0.95);
      }
      if (!hasRight) {
        ctx.fillRect(x + cellW, y + lift * 0.35, lift * 0.95, cellH + lift * 0.65);
      }
    }

    // B. Unified 3D extruded south (bottom) and east (right) side walls
    const southColor = adjustHexColor(zone.color, -58);
    const eastColor = adjustHexColor(zone.color, -34);

    for (const { r, c } of block.cells) {
      const x = c * cellW;
      const y = r * cellH;
      const hasBottom = getCellColorIdx(r + 1, c) === colorIdx;
      const hasRight = getCellColorIdx(r, c + 1) === colorIdx;

      if (!hasBottom) {
        ctx.fillStyle = southColor;
        ctx.beginPath();
        ctx.moveTo(x + offX - 0.3, y + cellH + offY);
        ctx.lineTo(x + cellW + offX + 0.3, y + cellH + offY);
        ctx.lineTo(x + cellW + lift * 0.45 + 0.3, y + cellH + lift * 0.45);
        ctx.lineTo(x + lift * 0.45 - 0.3, y + cellH + lift * 0.45);
        ctx.closePath();
        ctx.fill();
      }

      if (!hasRight) {
        ctx.fillStyle = eastColor;
        ctx.beginPath();
        ctx.moveTo(x + cellW + offX, y + offY - 0.3);
        ctx.lineTo(x + cellW + lift * 0.45, y + lift * 0.45 - 0.3);
        ctx.lineTo(x + cellW + lift * 0.45, y + cellH + lift * 0.45 + 0.3);
        ctx.lineTo(x + cellW + offX, y + cellH + offY + 0.3);
        ctx.closePath();
        ctx.fill();
      }
    }

    // C. Unified top surface with single continuous gradient across the whole merged block (ZERO internal tile seams!)
    const gx1 = block.minC * cellW + offX;
    const gy1 = block.minR * cellH + offY;
    const gx2 = (block.maxC + 1) * cellW + offX;
    const gy2 = (block.maxR + 1) * cellH + offY;
    const topGrad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
    topGrad.addColorStop(0, adjustHexColor(zone.color, 28));
    topGrad.addColorStop(1, adjustHexColor(zone.color, -8));

    ctx.fillStyle = topGrad;
    for (const { r, c } of block.cells) {
      const tx = c * cellW + offX;
      const ty = r * cellH + offY;
      // +0.75px overlap prevents any subpixel gaps so merged cells look like one solid piece
      ctx.fillRect(tx - 0.2, ty - 0.2, cellW + 0.75, cellH + 0.75);
    }

    // D. Specular top/left inner highlight + crisp unified outer perimeter contour
    const rimSize = Math.max(1.5, lift * 0.4);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();

    for (const { r, c } of block.cells) {
      const tx = c * cellW + offX;
      const ty = r * cellH + offY;

      const topDiff = getCellColorIdx(r - 1, c) !== colorIdx;
      const bottomDiff = getCellColorIdx(r + 1, c) !== colorIdx;
      const leftDiff = getCellColorIdx(r, c - 1) !== colorIdx;
      const rightDiff = getCellColorIdx(r, c + 1) !== colorIdx;

      if (topDiff) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
        ctx.fillRect(tx, ty, cellW + 0.3, rimSize);
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + cellW, ty);
      }
      if (leftDiff) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
        ctx.fillRect(tx, ty, rimSize, cellH + 0.3);
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx, ty + cellH);
      }
      if (bottomDiff) {
        ctx.moveTo(tx, ty + cellH);
        ctx.lineTo(tx + cellW, ty + cellH);
      }
      if (rightDiff) {
        ctx.moveTo(tx + cellW, ty);
        ctx.lineTo(tx + cellW, ty + cellH);
      }
    }
    ctx.stroke();

    // E. Unified label (Zone name + Ping) centered inside large enough merged blocks
    const spanCols = block.maxC - block.minC + 1;
    const spanRows = block.maxR - block.minR + 1;
    if (block.cells.length >= 9 && spanCols >= 3 && spanRows >= 2) {
      // Find visual anchor cell closest to block centroid
      let sumR = 0;
      let sumC = 0;
      for (const cell of block.cells) {
        sumR += cell.r;
        sumC += cell.c;
      }
      const avgR = sumR / block.cells.length;
      const avgC = sumC / block.cells.length;
      let anchor = block.cells[0];
      let bestDist = Infinity;
      for (const cell of block.cells) {
        const d = (cell.r - avgR) ** 2 + (cell.c - avgC) ** 2;
        if (d < bestDist) {
          bestDist = d;
          anchor = cell;
        }
      }

      const cx = (anchor.c + 0.5) * cellW + offX;
      const cy = (anchor.r + 0.5) * cellH + offY;
      const ping = ((block.cells.length * floorPlan.cellSizeCm * floorPlan.cellSizeCm) / 32400).toFixed(1);
      const labelText = `${zone.name || `分區${zone.id + 1}`} ${ping}坪`;

      ctx.save();
      ctx.font = 'bold 12px "Noto Sans TC", "Plus Jakarta Sans", sans-serif';
      const textW = ctx.measureText(labelText).width;
      const boxW = textW + 14;
      const boxH = 22;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.beginPath();
      ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 5);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, cx, cy + 0.5);
      ctx.restore();
    }
  }

  // 3. Rectangle drag-selection preview overlay
  if (selectionPreview) {
    const minR = Math.min(selectionPreview.startRow, selectionPreview.endRow);
    const maxR = Math.max(selectionPreview.startRow, selectionPreview.endRow);
    const minC = Math.min(selectionPreview.startCol, selectionPreview.endCol);
    const maxC = Math.max(selectionPreview.startCol, selectionPreview.endCol);

    const rx = minC * cellW;
    const ry = minR * cellH;
    const rw = (maxC - minC + 1) * cellW;
    const rh = (maxR - minR + 1) * cellH;

    ctx.fillStyle = selectionPreview.isEraser
      ? 'rgba(244, 63, 94, 0.25)'
      : `${selectionPreview.color}55`;
    ctx.fillRect(rx, ry, rw, rh);

    ctx.strokeStyle = selectionPreview.isEraser ? '#E11D48' : selectionPreview.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
    ctx.setLineDash([]);
  }
}

interface FloorPlanGridSectionProps {
  floorPlan?: FloorPlanData;
  onChange: (updated: FloorPlanData) => void;
}

type ToolMode = 'rect' | 'brush' | 'eraser' | 'select';

export default function FloorPlanGridSection({
  floorPlan,
  onChange,
}: FloorPlanGridSectionProps) {
  const data = useMemo(() => floorPlan ?? createDefaultFloorPlan(), [floorPlan]);
  const [activeColorIdx, setActiveColorIdx] = useState<number>(0);
  // Default drag selection mode is rectangular ('rect')
  const [toolMode, setToolMode] = useState<ToolMode>('rect');
  const [is3DTilt, setIs3DTilt] = useState<boolean>(false);
  const [editingColorId, setEditingColorId] = useState<number | null>(null);
  const [showCompassEditor, setShowCompassEditor] = useState<boolean>(false);
  const [history, setHistory] = useState<FloorPlanData[]>([]);
  const [selectedRectId, setSelectedRectId] = useState<string | null>(null);
  const dragRectRef = useRef<{
    id: string;
    startRow: number;
    startCol: number;
    original: FloorPlanRect;
    baseCells: Record<string, number>;
    baseRects: FloorPlanRect[];
  } | null>(null);

  // Pointer dragging state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const dragModeRef = useRef<'paint' | 'erase'>('paint');
  const startCellRef = useRef<{ row: number; col: number } | null>(null);
  const workingCellsRef = useRef<Record<string, number>>({});
  const [rectPreview, setRectPreview] = useState<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
    isEraser: boolean;
  } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    row: number;
    col: number;
    colorIdx?: number;
  } | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const canvasLogicalSize = 800;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetPx = canvasLogicalSize * dpr;
    if (canvas.width !== targetPx || canvas.height !== targetPx) {
      canvas.width = targetPx;
      canvas.height = targetPx;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    const activeZone = data.palette[activeColorIdx] || data.palette[0];
    renderFloorPlanCanvas(
      ctx,
      canvasLogicalSize,
      canvasLogicalSize,
      data,
      rectPreview
        ? {
            startRow: rectPreview.startRow,
            startCol: rectPreview.startCol,
            endRow: rectPreview.endRow,
            endCol: rectPreview.endCol,
            color: activeZone.color,
            isEraser: rectPreview.isEraser,
          }
        : null
    );
    ctx.restore();
  }, [data, rectPreview, activeColorIdx]);

  const getCellFromPointer = useCallback(
    (clientX: number, clientY: number): { row: number; col: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const x = ((clientX - rect.left) / rect.width) * data.gridSize;
      const y = ((clientY - rect.top) / rect.height) * data.gridSize;
      const col = Math.floor(x);
      const row = Math.floor(y);
      if (row < 0 || col < 0 || row >= data.gridSize || col >= data.gridSize) return null;
      return { row, col };
    },
    [data.gridSize]
  );

  const pushHistory = (snapshot: FloorPlanData) => {
    setHistory((prev) => [...prev.slice(-19), {
      ...snapshot,
      palette: snapshot.palette.map((zone) => ({ ...zone })),
      cells: { ...snapshot.cells },
      rects: (snapshot.rects ?? []).map((rect) => ({
        ...rect,
        mergedFrom: rect.mergedFrom?.map((source) => ({ ...source })),
      })),
    }]);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (is3DTilt) return;
    const cell = getCellFromPointer(e.clientX, e.clientY);
    if (!cell) return;

    e.currentTarget.setPointerCapture(e.pointerId);

    if (toolMode === 'select') {
      setRectPreview(null);
      dragRectRef.current = null;
      isDrawingRef.current = false;
      startCellRef.current = null;
      const rect = [...(data.rects ?? [])].reverse().find((item) =>
        rectContainsCell(item, cell.row, cell.col)
      );
      setSelectedRectId(rect?.id ?? null);
      if (rect) {
        pushHistory(data);
        dragRectRef.current = {
          id: rect.id,
          startRow: cell.row,
          startCol: cell.col,
          original: { ...rect, mergedFrom: rect.mergedFrom?.map((source) => ({ ...source })) },
          baseCells: { ...data.cells },
          baseRects: (data.rects ?? []).map((item) => ({
            ...item,
            mergedFrom: item.mergedFrom?.map((source) => ({ ...source })),
          })),
        };
        isDrawingRef.current = true;
      }
      return;
    }

    isDrawingRef.current = true;
    startCellRef.current = cell;

    const forceErase = e.button === 2 || toolMode === 'eraser';
    pushHistory(data);

    // Rectangular selection mode for both painting ('rect') and erasing ('eraser' / right-click)
    if (toolMode === 'rect' || forceErase) {
      setRectPreview({
        startRow: cell.row,
        startCol: cell.col,
        endRow: cell.row,
        endCol: cell.col,
        isEraser: forceErase,
      });
      return;
    }

    // Freehand brush mode (optional)
    const key = `${cell.row},${cell.col}`;
    const existing = data.cells[key];
    const shouldErase = existing === activeColorIdx;
    dragModeRef.current = shouldErase ? 'erase' : 'paint';

    const nextCells = { ...data.cells };
    if (shouldErase) {
      delete nextCells[key];
    } else {
      nextCells[key] = activeColorIdx;
    }
    workingCellsRef.current = nextCells;
    onChange({ ...data, cells: nextCells });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = getCellFromPointer(e.clientX, e.clientY);
    if (cell) {
      setHoverInfo({
        row: cell.row,
        col: cell.col,
        colorIdx: data.cells[`${cell.row},${cell.col}`],
      });
    } else {
      setHoverInfo(null);
    }

    if (!isDrawingRef.current || !cell) return;

    if (dragRectRef.current) {
      const drag = dragRectRef.current;
      const rowDelta = cell.row - drag.startRow;
      const colDelta = cell.col - drag.startCol;
      const rows = drag.original.maxRow - drag.original.minRow;
      const cols = drag.original.maxCol - drag.original.minCol;
      const minRow = Math.max(0, Math.min(data.gridSize - rows - 1, drag.original.minRow + rowDelta));
      const minCol = Math.max(0, Math.min(data.gridSize - cols - 1, drag.original.minCol + colDelta));
      const rowMove = minRow - drag.original.minRow;
      const colMove = minCol - drag.original.minCol;
      const movedShape = getRectShapeCells(drag.original).map((shapeCell) => ({
        r: shapeCell.r + rowMove,
        c: shapeCell.c + colMove,
      }));
      const movedShapeKeys = new Set(movedShape.map((shapeCell) => `${shapeCell.r},${shapeCell.c}`));
      const overlapsAnotherRect = drag.baseRects.some((rect) => {
        if (rect.id === drag.id) return false;
        return getRectShapeCells(rect).some(
          (shapeCell) => movedShapeKeys.has(`${shapeCell.r},${shapeCell.c}`)
        );
      });
      if (overlapsAnotherRect) return;
      const nextRects = drag.baseRects.map((rect) =>
        rect.id === drag.id
          ? {
              ...rect,
              minRow,
              maxRow: minRow + rows,
              minCol,
              maxCol: minCol + cols,
              shapeCells: drag.original.shapeCells?.length ? movedShape : undefined,
            }
          : rect
      );

      const nextCells = { ...drag.baseCells };
      for (const shapeCell of getRectShapeCells(drag.original)) {
        delete nextCells[`${shapeCell.r},${shapeCell.c}`];
      }
      for (const shapeCell of movedShape) {
        nextCells[`${shapeCell.r},${shapeCell.c}`] = drag.original.colorIdx;
      }
      onChange({ ...data, rects: nextRects, cells: nextCells });
      return;
    }

    if (rectPreview && startCellRef.current) {
      setRectPreview({
        ...rectPreview,
        endRow: cell.row,
        endCol: cell.col,
      });
      return;
    }

    // Freehand brush interpolation
    const prev = startCellRef.current || cell;
    const dr = Math.abs(cell.row - prev.row);
    const dc = Math.abs(cell.col - prev.col);
    const steps = Math.max(dr, dc, 1);

    const nextCells = { ...workingCellsRef.current };
    let changed = false;

    for (let s = 0; s <= steps; s++) {
      const r = Math.round(prev.row + ((cell.row - prev.row) * s) / steps);
      const c = Math.round(prev.col + ((cell.col - prev.col) * s) / steps);
      const k = `${r},${c}`;
      if (dragModeRef.current === 'erase') {
        if (nextCells[k] !== undefined) {
          delete nextCells[k];
          changed = true;
        }
      } else {
        if (nextCells[k] !== activeColorIdx) {
          nextCells[k] = activeColorIdx;
          changed = true;
        }
      }
    }

    startCellRef.current = cell;
    if (changed) {
      workingCellsRef.current = nextCells;
      onChange({ ...data, cells: nextCells });
    }
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (dragRectRef.current) {
      dragRectRef.current = null;
      startCellRef.current = null;
      return;
    }

    if (rectPreview) {
      const minR = Math.min(rectPreview.startRow, rectPreview.endRow);
      const maxR = Math.max(rectPreview.startRow, rectPreview.endRow);
      const minC = Math.min(rectPreview.startCol, rectPreview.endCol);
      const maxC = Math.max(rectPreview.startCol, rectPreview.endCol);
      const isSingleCell = minR === maxR && minC === maxC;

      const nextCells = { ...data.cells };
      if (rectPreview.isEraser) {
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            delete nextCells[`${r},${c}`];
          }
        }
        const nextRects: FloorPlanRect[] = [];
        for (const rect of data.rects ?? []) {
          const overlaps =
            rect.maxRow >= minR &&
            rect.minRow <= maxR &&
            rect.maxCol >= minC &&
            rect.minCol <= maxC;
          if (!overlaps) {
            nextRects.push(rect);
            continue;
          }
          const remaining = getRectShapeCells(rect).filter(
            (cell) =>
              cell.r < minR ||
              cell.r > maxR ||
              cell.c < minC ||
              cell.c > maxC
          );
          if (remaining.length === 0) continue;
          nextRects.push({
            ...rect,
            minRow: Math.min(...remaining.map((cell) => cell.r)),
            maxRow: Math.max(...remaining.map((cell) => cell.r)),
            minCol: Math.min(...remaining.map((cell) => cell.c)),
            maxCol: Math.max(...remaining.map((cell) => cell.c)),
            shapeCells: remaining,
            mergedFrom: undefined,
          });
        }
        onChange({ ...data, cells: nextCells, rects: nextRects });
        setRectPreview(null);
        startCellRef.current = null;
        if (selectedRectId) setSelectedRectId(null);
        return;
      } else if (isSingleCell && nextCells[`${minR},${minC}`] === activeColorIdx) {
        // Single click on already-active single cell toggles it off
        delete nextCells[`${minR},${minC}`];
        const nextRects = (data.rects ?? []).filter((rect) =>
          !(
            rect.minRow === minR &&
            rect.maxRow === minR &&
            rect.minCol === minC &&
            rect.maxCol === minC &&
            rect.colorIdx === activeColorIdx
          )
        );
        setSelectedRectId(null);
        setRectPreview(null);
        onChange({ ...data, cells: nextCells, rects: nextRects });
        startCellRef.current = null;
        return;
      } else {
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            nextCells[`${r},${c}`] = activeColorIdx;
          }
        }
        const rectId = `rect-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const nextRects = [
          ...(data.rects ?? []),
          {
            id: rectId,
            colorIdx: activeColorIdx,
            minRow: minR,
            maxRow: maxR,
            minCol: minC,
            maxCol: maxC,
          },
        ];
        setSelectedRectId(rectId);
        onChange({ ...data, cells: nextCells, rects: nextRects });
        setRectPreview(null);
        startCellRef.current = null;
        return;
      }

      setRectPreview(null);
      onChange({ ...data, cells: nextCells });
    }
    startCellRef.current = null;
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setSelectedRectId(null);
    onChange(prev);
  };

  const handleClearAll = () => {
    if (Object.keys(data.cells).length === 0) return;
    pushHistory(data);
    setSelectedRectId(null);
    onChange({ ...data, cells: {}, rects: [] });
  };

  const selectedRect = (data.rects ?? []).find((rect) => rect.id === selectedRectId) ?? null;

  const resizeSelectedRect = (widthCells: number, heightCells: number) => {
    if (!selectedRect) return;
    const nextWidth = Math.max(1, Math.min(data.gridSize - selectedRect.minCol, widthCells));
    const nextHeight = Math.max(1, Math.min(data.gridSize - selectedRect.minRow, heightCells));
    pushHistory(data);

    if (selectedRect.shapeCells?.length) {
      const sourceWidth = selectedRect.maxCol - selectedRect.minCol + 1;
      const sourceHeight = selectedRect.maxRow - selectedRect.minRow + 1;
      const scaleX = nextWidth / sourceWidth;
      const scaleY = nextHeight / sourceHeight;
      const scaledShape = new Map<string, { r: number; c: number }>();
      for (const cell of selectedRect.shapeCells) {
        const cOffset = cell.c - selectedRect.minCol;
        const rOffset = cell.r - selectedRect.minRow;
        const scaledC = selectedRect.minCol + Math.min(nextWidth - 1, Math.floor(cOffset * scaleX));
        const scaledR = selectedRect.minRow + Math.min(nextHeight - 1, Math.floor(rOffset * scaleY));
        scaledShape.set(`${scaledR},${scaledC}`, { r: scaledR, c: scaledC });
      }
      const shapeCells = [...scaledShape.values()];
      const nextRect: FloorPlanRect = {
        ...selectedRect,
        maxCol: selectedRect.minCol + nextWidth - 1,
        maxRow: selectedRect.minRow + nextHeight - 1,
        shapeCells,
      };
      const nextRects = (data.rects ?? []).map((rect) =>
        rect.id === selectedRect.id ? nextRect : rect
      );
      const nextCells = { ...data.cells };
      for (const cell of getRectShapeCells(selectedRect)) {
        delete nextCells[`${cell.r},${cell.c}`];
      }
      for (const cell of shapeCells) {
        nextCells[`${cell.r},${cell.c}`] = nextRect.colorIdx;
      }
      onChange({ ...data, rects: nextRects, cells: nextCells });
      return;
    }

    const nextRect: FloorPlanRect = {
      ...selectedRect,
      maxCol: selectedRect.minCol + nextWidth - 1,
      maxRow: selectedRect.minRow + nextHeight - 1,
    };
    const nextRects = (data.rects ?? []).map((rect) =>
      rect.id === selectedRect.id ? nextRect : rect
    );
    const nextCells = { ...data.cells };
    for (let r = selectedRect.minRow; r <= selectedRect.maxRow; r++) {
      for (let c = selectedRect.minCol; c <= selectedRect.maxCol; c++) {
        delete nextCells[`${r},${c}`];
      }
    }
    for (let r = nextRect.minRow; r <= nextRect.maxRow; r++) {
      for (let c = nextRect.minCol; c <= nextRect.maxCol; c++) {
        nextCells[`${r},${c}`] = nextRect.colorIdx;
      }
    }
    onChange({ ...data, rects: nextRects, cells: nextCells });
  };

  const handleMergeSelected = () => {
    const rects = data.rects ?? [];
    if (rects.length === 0) return;

    const selected = rects.find((rect) => rect.id === selectedRectId);
    if (selected?.mergedFrom?.length) {
      pushHistory(data);
      const nextRects = rects
        .filter((rect) => rect.id !== selected.id)
        .concat(selected.mergedFrom.map((source) => ({ ...source, mergedFrom: undefined })));
      const nextCells = { ...data.cells };
      for (const cell of getRectShapeCells(selected)) {
        delete nextCells[`${cell.r},${cell.c}`];
      }
      selected.mergedFrom.forEach((source) => {
        for (const cell of getRectShapeCells(source)) {
          nextCells[`${cell.r},${cell.c}`] = source.colorIdx;
        }
      });
      setSelectedRectId(null);
      onChange({ ...data, rects: nextRects, cells: nextCells });
      return;
    }

    const colorIdx = selected?.colorIdx ?? activeColorIdx;
    const sources = rects.filter((rect) => rect.colorIdx === colorIdx && !rect.mergedFrom?.length);
    if (sources.length < 2) return;
    pushHistory(data);
    const shapeMap = new Map<string, { r: number; c: number }>();
    sources.forEach((source) => {
      getRectShapeCells(source).forEach((cell) => {
        shapeMap.set(`${cell.r},${cell.c}`, { r: cell.r, c: cell.c });
      });
    });
    const shapeCells = [...shapeMap.values()];
    const merged: FloorPlanRect = {
      id: `merged-${Date.now()}`,
      colorIdx,
      minRow: Math.min(...sources.map((rect) => rect.minRow)),
      maxRow: Math.max(...sources.map((rect) => rect.maxRow)),
      minCol: Math.min(...sources.map((rect) => rect.minCol)),
      maxCol: Math.max(...sources.map((rect) => rect.maxCol)),
      shapeCells,
      mergedFrom: sources.map((source) => ({ ...source })),
    };
    const sourceIds = new Set(sources.map((source) => source.id));
    const nextRects = rects.filter((rect) => !sourceIds.has(rect.id));
    nextRects.push(merged);
    const nextCells = { ...data.cells };
    for (const cell of shapeCells) {
      nextCells[`${cell.r},${cell.c}`] = colorIdx;
    }
    setSelectedRectId(merged.id);
    onChange({ ...data, rects: nextRects, cells: nextCells });
  };

  // Ping calculation: 公分 * 公分 / 32400, rounded to 1 decimal place
  const cellAreaCm2 = (data.cellSizeCm || 20) * (data.cellSizeCm || 20);
  const calcPing = useCallback(
    (cellCount: number): string => {
      const ping = (cellCount * cellAreaCm2) / 32400;
      return ping.toFixed(1);
    },
    [cellAreaCm2]
  );

  const colorStats = useMemo(() => {
    const counts = new Array(8).fill(0);
    let totalCount = 0;
    for (const key in data.cells) {
      const idx = data.cells[key];
      if (idx >= 0 && idx < 8) {
        counts[idx]++;
        totalCount++;
      }
    }
    return { counts, totalCount };
  }, [data.cells]);

  const rectPreviewMetrics = useMemo(() => {
    if (!rectPreview) return null;
    const cols = Math.abs(rectPreview.endCol - rectPreview.startCol) + 1;
    const rows = Math.abs(rectPreview.endRow - rectPreview.startRow) + 1;
    const count = cols * rows;
    const wCm = cols * data.cellSizeCm;
    const hCm = rows * data.cellSizeCm;
    return {
      cols,
      rows,
      count,
      wCm,
      hCm,
      ping: calcPing(count),
      isEraser: rectPreview.isEraser,
    };
  }, [rectPreview, data.cellSizeCm, calcPing]);

  const updateZoneName = (id: number, name: string) => {
    const nextPalette = data.palette.map((z) => (z.id === id ? { ...z, name } : z));
    onChange({ ...data, palette: nextPalette });
  };

  const setCompassAngle = (angle: number) => {
    const normalized = ((Math.round(angle) % 360) + 360) % 360;
    onChange({ ...data, compassAngle: normalized });
  };

  const getCardinalLabel = (deg: number) => {
    const dirs = ['正北 N', '東北 NE', '正東 E', '東南 SE', '正南 S', '西南 SW', '正西 W', '西北 NW'];
    return dirs[Math.round(deg / 45) % 8];
  };

  const getWestSunDirectionText = (northAngle: number) => {
    const westScreenAngle = (northAngle + 270) % 360;
    const screenDirs = ['圖面上方', '圖面右上方', '圖面右側', '圖面右下方', '圖面下方', '圖面左下方', '圖面左側', '圖面左上方'];
    return screenDirs[Math.round(westScreenAngle / 45) % 8];
  };

  const totalSideM = ((data.gridSize * data.cellSizeCm) / 100).toFixed(1);

  return (
    <section
      aria-label="場地立體平面方格繪圖與坪數估算"
      className="bento-card mt-8 p-5"
    >
      {/* 標題與格距、工具控制列 */}
      <div className="flex flex-col gap-4 border-b border-[#E8D8C8] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-[#3B312C]">
            平面空間立體方格圖（{data.gridSize} × {data.gridSize} 格）
          </h2>
          <p className="mt-0.5 text-xs text-[#7A675B]">
            框選矩形後可拖移、調整長寬；相同顏色矩形會獨立保留，按「合併」會依實際格位聯集形成不規則多邊形，再按一次即拆解。坪數依實際著色格數計算：面積(cm²) ÷ 32,400（取至小數點後 1 位）。
          </p>
        </div>

        {selectedRect && (
          <div className="rounded-xl border border-[#C68934] bg-[#FDF0D5] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#3B312C]">選取矩形設定</span>
              <button
                type="button"
                onClick={() => setSelectedRectId(null)}
                className="rounded-lg p-1 text-[#7A675B] hover:bg-[#F5E6D5]"
                title="取消選取"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] font-bold text-[#7A675B]">
                長度（格）
                <input
                  type="number"
                  min={1}
                  max={data.gridSize - selectedRect.minCol}
                  value={selectedRect.maxCol - selectedRect.minCol + 1}
                  onChange={(e) =>
                    resizeSelectedRect(
                      Number(e.target.value) || 1,
                      selectedRect.maxRow - selectedRect.minRow + 1
                    )
                  }
                  className="mt-1 block w-full rounded-lg border border-[#CBB5A5] bg-[#FFFDF9] px-2 py-1.5 text-sm font-bold text-[#3B312C]"
                />
              </label>
              <label className="text-[11px] font-bold text-[#7A675B]">
                寬度（格）
                <input
                  type="number"
                  min={1}
                  max={data.gridSize - selectedRect.minRow}
                  value={selectedRect.maxRow - selectedRect.minRow + 1}
                  onChange={(e) =>
                    resizeSelectedRect(
                      selectedRect.maxCol - selectedRect.minCol + 1,
                      Number(e.target.value) || 1
                    )
                  }
                  className="mt-1 block w-full rounded-lg border border-[#CBB5A5] bg-[#FFFDF9] px-2 py-1.5 text-sm font-bold text-[#3B312C]"
                />
              </label>
            </div>
            <div className="mt-2 font-mono-tabular text-[11px] font-semibold text-[#7A675B]">
              實長 {((selectedRect.maxCol - selectedRect.minCol + 1) * data.cellSizeCm).toFixed(0)} cm
              {'  /  '}
              實寬 {((selectedRect.maxRow - selectedRect.minRow + 1) * data.cellSizeCm).toFixed(0)} cm
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          {/* 自訂每格公分數 */}
          <div className="inline-flex items-center gap-2 rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-3 py-1.5">
            <label htmlFor="cell-size-cm" className="text-xs font-bold text-[#3B312C] whitespace-nowrap">
              單格邊長
            </label>
            <input
              id="cell-size-cm"
              type="number"
              min={5}
              max={200}
              step={5}
              value={data.cellSizeCm}
              onChange={(e) => {
                const val = Math.max(1, Math.min(500, Number(e.target.value) || 20));
                onChange({ ...data, cellSizeCm: val });
              }}
              className="font-mono-tabular w-16 rounded-lg border border-[#CBB5A5] bg-[#FFFDF9] px-2 py-0.5 text-right text-xs font-bold text-[#3B312C] focus:border-[#D9822B] focus:outline-none"
            />
            <span className="text-xs font-medium text-[#7A675B]">公分</span>
            <span className="font-mono-tabular border-l border-[#DFCBB9] pl-2 text-[11px] font-semibold text-[#7A675B]">
              全圖 {totalSideM}×{totalSideM}m
            </span>
          </div>

          {/* 3D 立體斜視預覽切換 */}
          <button
            type="button"
            onClick={() => setIs3DTilt((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
              is3DTilt
                ? 'border-[#3B312C] bg-[#4A3F3A] text-[#F6BE6B]'
                : 'border-[#CBB5A5] bg-[#FFF8EE] text-[#3B312C] hover:bg-[#F5E6D5]'
            }`}
          >
            <Box className="h-3.5 w-3.5" />
            <span>{is3DTilt ? '返回平面編輯視角' : '3D 立體斜視預覽'}</span>
          </button>
        </div>
      </div>

      {/* 主工作區：桌面版畫布在左、8 色與繪圖工具在右側；窄螢幕則依序堆疊 */}
      <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* 桌面版右側控制欄：繪圖模式 + 8 色選擇與編輯名稱 + 坪數統計 */}
        <div className="order-2 space-y-4 xl:order-2 xl:col-span-4">
          {/* 操作模式工具 */}
          <div className="rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-[#3B312C]">選取與繪圖工具</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#CBB5A5] bg-[#FFF8EE] px-2 py-1 text-[11px] font-bold text-[#3B312C] hover:bg-[#F5E6D5] disabled:opacity-40"
                >
                  <Undo2 className="h-3 w-3" />
                  復原
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (colorStats.totalCount > 0) setConfirmClearOpen(true);
                  }}
                  disabled={colorStats.totalCount === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E6B0A3] bg-[#FDECE7] px-2 py-1 text-[11px] font-bold text-[#A43B24] hover:bg-[#FAD7CD] disabled:opacity-40"
                >
                  <Trash2 className="h-3 w-3" />
                  清空
                </button>
                <button
                  type="button"
                  onClick={handleMergeSelected}
                  disabled={(data.rects ?? []).length < 2 && !selectedRect?.mergedFrom?.length}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#CBB5A5] bg-[#FFF8EE] px-2 py-1 text-[11px] font-bold text-[#3B312C] hover:bg-[#F5E6D5] disabled:opacity-40"
                >
                  <SquareDashed className="h-3 w-3" />
                  {selectedRect?.mergedFrom?.length ? '拆解' : '合併'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => {
                  setToolMode('select');
                  setIs3DTilt(false);
                  setRectPreview(null);
                  dragRectRef.current = null;
                  isDrawingRef.current = false;
                }}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition-colors ${
                  toolMode === 'select'
                    ? 'border-[#3B312C] bg-[#4A3F3A] text-[#F6BE6B]'
                    : 'border-[#CBB5A5] bg-[#FFF8EE] text-[#3B312C] hover:bg-[#F5E6D5]'
                }`}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>選取拖移</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setToolMode('rect');
                  setIs3DTilt(false);
                }}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition-colors ${
                  toolMode === 'rect'
                    ? 'border-[#C68934] bg-[#F6BE6B] text-[#3B312C]'
                    : 'border-[#CBB5A5] bg-[#FFF8EE] text-[#3B312C] hover:bg-[#F5E6D5]'
                }`}
              >
                <SquareDashed className="h-3.5 w-3.5" />
                <span>矩形選取</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setToolMode('brush');
                  setIs3DTilt(false);
                }}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition-colors ${
                  toolMode === 'brush'
                    ? 'border-[#3B312C] bg-[#4A3F3A] text-[#F6BE6B]'
                    : 'border-[#CBB5A5] bg-[#FFF8EE] text-[#3B312C] hover:bg-[#F5E6D5]'
                }`}
              >
                <Paintbrush className="h-3.5 w-3.5" />
                <span>自由筆刷</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setToolMode('eraser');
                  setIs3DTilt(false);
                }}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition-colors ${
                  toolMode === 'eraser'
                    ? 'border-[#A43B24] bg-[#D16047] text-[#FFF8EE]'
                    : 'border-[#CBB5A5] bg-[#FFF8EE] text-[#3B312C] hover:bg-[#F5E6D5]'
                }`}
              >
                <Eraser className="h-3.5 w-3.5" />
                <span>矩形擦除</span>
              </button>
            </div>
          </div>

          {/* 8 種顏色選擇 + 可編輯名稱 + 坪數顯示 */}
          <div className="rounded-xl border border-[#DFCBB9] bg-[#FFFDF9] p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-[#3B312C]">8 色空間分區（點擊選色，可編輯名稱）</span>
              <span className="font-mono-tabular text-xs font-extrabold text-[#B36B16]">
                總計 {calcPing(colorStats.totalCount)} 坪
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {data.palette.map((zone) => {
                const isActive = activeColorIdx === zone.id && toolMode !== 'eraser';
                const count = colorStats.counts[zone.id] || 0;
                const pingStr = calcPing(count);
                const isEditing = editingColorId === zone.id;

                return (
                  <div
                    key={zone.id}
                    onClick={() => {
                      setActiveColorIdx(zone.id);
                      if (toolMode === 'eraser') setToolMode('rect');
                      setIs3DTilt(false);
                    }}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border-2 p-2 transition-all ${
                      isActive
                        ? 'border-[#4A3F3A] bg-[#F5E6D5] ring-2 ring-[#F6BE6B]/50'
                        : 'border-[#E8D8C8] bg-[#FFF8EE] hover:border-[#CBB5A5]'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span
                        className="h-7 w-7 shrink-0 rounded-md border border-black/15 shadow-[2px_3px_0px_rgba(59,49,44,0.28)]"
                        style={{
                          background: `linear-gradient(135deg, ${adjustHexColor(
                            zone.color,
                            24
                          )}, ${zone.color})`,
                        }}
                      />

                      {isEditing ? (
                        <input
                          type="text"
                          autoFocus
                          value={zone.name}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateZoneName(zone.id, e.target.value)}
                          onBlur={() => setEditingColorId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingColorId(null);
                          }}
                          className="w-24 rounded-md border border-[#D9822B] bg-[#FFFDF9] px-2 py-0.5 text-xs font-bold text-[#3B312C] focus:outline-none"
                        />
                      ) : (
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-xs font-bold text-[#3B312C]">
                            {zone.name || `分區 ${zone.id + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingColorId(zone.id);
                            }}
                            title="編輯顏色名稱"
                            className="rounded p-1 text-[#8A7567] hover:bg-[#EAD6C2] hover:text-[#3B312C]"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="font-mono-tabular shrink-0 text-right">
                      <span className="text-sm font-extrabold text-[#3B312C]">{pingStr} 坪</span>
                      <span className="block text-[10px] font-medium text-[#8A7567]">
                        {count} 格
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 左側：灰底棋盤式立體表格 + 簡易可旋轉指南針 */}
        <div className="order-1 xl:order-1 xl:col-span-8">
          <div className="relative rounded-2xl border-2 border-[#CBB5A5] bg-[#F5E6D5]/70 p-3 sm:p-4">
            {/* 頂部即時狀態列 */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="font-mono-tabular flex flex-wrap items-center gap-3 text-[#3B312C]">
                <span className="font-semibold">
                  1 格 = {data.cellSizeCm}×{data.cellSizeCm} cm ({(cellAreaCm2 / 32400).toFixed(4)} 坪)
                </span>
                {rectPreviewMetrics ? (
                  <span
                    className={`rounded-lg px-2 py-0.5 font-bold ${
                      rectPreviewMetrics.isEraser
                        ? 'bg-[#D16047] text-[#FFF8EE]'
                        : 'bg-[#4A3F3A] text-[#F6BE6B]'
                    }`}
                  >
                    {rectPreviewMetrics.isEraser ? '框選擦除' : '矩形選取'}：
                    {rectPreviewMetrics.wCm} × {rectPreviewMetrics.hCm} cm（{rectPreviewMetrics.count} 格 · 約 {rectPreviewMetrics.ping} 坪）
                  </span>
                ) : hoverInfo ? (
                  <span className="font-medium text-[#7A675B]">
                    座標 ({hoverInfo.col + 1}, {hoverInfo.row + 1})
                    {hoverInfo.colorIdx !== undefined
                      ? ` · ${data.palette[hoverInfo.colorIdx]?.name || ''} (${calcPing(
                          colorStats.counts[hoverInfo.colorIdx] || 0
                        )} 坪)`
                      : ''}
                  </span>
                ) : (
                  <span className="text-[#7A675B]">粗格線每 5 格 = {data.cellSizeCm * 5} cm</span>
                )}
              </div>

              <span className="text-[11px] font-bold text-[#7A675B]">
                方向：{getCardinalLabel(data.compassAngle)} ({data.compassAngle}°) · 西曬於{getWestSunDirectionText(data.compassAngle)}
              </span>
            </div>

            {/* 棋盤畫布外框（支援 3D 斜角透視檢視） */}
            <div className="relative flex justify-center overflow-hidden rounded-xl border border-[#DFCBB9] bg-slate-300/60 p-2 sm:p-4">
              {/* 簡易指南針（點擊可旋轉編輯） */}
              <div className="absolute right-4 top-4 z-20 flex flex-col items-end">
                <button
                  type="button"
                  onClick={() => setShowCompassEditor((prev) => !prev)}
                  title="點擊指南針進行旋轉編輯"
                  className="group relative flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 border-[#4A3F3A] bg-[#FFF8EE]/95 shadow-md transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-[#D9822B]"
                >
                  <div
                    className="relative flex h-12 w-12 items-center justify-center transition-transform duration-150"
                    style={{ transform: `rotate(${data.compassAngle}deg)` }}
                  >
                    <span className="absolute -top-0.5 text-[9px] font-extrabold text-[#D16047]">
                      北
                    </span>
                    <span className="absolute -bottom-0.5 text-[8px] font-bold text-[#8A7567]">
                      南
                    </span>
                    <span className="absolute left-0 text-[8px] font-bold text-[#D9822B]">西</span>
                    <span className="absolute right-0 text-[8px] font-bold text-[#8A7567]">東</span>
                    <svg viewBox="0 0 24 24" className="h-7 w-7">
                      <polygon points="12,3 15,12 12,11 9,12" fill="#D16047" />
                      <polygon points="12,21 15,12 12,13 9,12" fill="#4A3F3A" />
                      <circle cx="12" cy="12" r="1.8" fill="#3B312C" />
                    </svg>
                  </div>
                </button>
                <span className="font-mono-tabular mt-1 rounded-md bg-[#4A3F3A]/90 px-1.5 py-0.5 text-[10px] font-bold text-[#F6BE6B]">
                  點此旋轉 {data.compassAngle}°
                </span>

                {/* 指南針旋轉編輯彈窗：僅保留拖曳角度調整 */}
                {showCompassEditor && (
                  <div className="mt-2 w-60 rounded-2xl border-2 border-[#4A3F3A] bg-[#FFF8EE] p-3.5 shadow-xl">
                    <div className="flex items-center justify-between border-b border-[#E8D8C8] pb-2">
                      <div className="flex items-center gap-1.5">
                        <Compass className="h-4 w-4 text-[#D9822B]" />
                        <span className="text-xs font-extrabold text-[#3B312C]">角度調整</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCompassEditor(false)}
                        className="rounded-lg p-0.5 text-[#8A7567] hover:bg-[#F5E6D5] hover:text-[#3B312C]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#7A675B]">
                        <span>拖曳旋轉</span>
                        <span className="font-mono-tabular text-[#3B312C]">
                          {data.compassAngle}° ({getCardinalLabel(data.compassAngle)})
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={359}
                        value={data.compassAngle}
                        onChange={(e) => setCompassAngle(Number(e.target.value))}
                        className="mt-1.5 w-full cursor-pointer accent-[#D9822B]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 立體視角容器 */}
              <div
                className="w-full max-w-[740px] transition-transform duration-300"
                style={
                  is3DTilt
                    ? {
                        transform: 'perspective(1100px) rotateX(34deg) rotateZ(-8deg) scale(0.92)',
                        transformStyle: 'preserve-3d',
                        boxShadow: '12px 24px 0px #64748B, 18px 34px 28px rgba(15, 23, 42, 0.35)',
                      }
                    : {
                        boxShadow: '4px 6px 0px #94A3B8',
                      }
                }
              >
                <canvas
                  ref={canvasRef}
                  onContextMenu={(e) => e.preventDefault()}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onPointerLeave={() => setHoverInfo(null)}
                  className={`block aspect-square w-full touch-none rounded border-2 border-slate-500 bg-slate-200 ${
                    is3DTilt
                      ? 'cursor-default'
                      : toolMode === 'select'
                      ? 'cursor-move'
                      : 'cursor-crosshair'
                  }`}
                />
              </div>
            </div>

            {is3DTilt && (
              <p className="mt-3 text-center text-xs font-bold text-[#7A4A0B]">
                目前為「3D 立體斜視預覽」模式；點擊上方「返回平面編輯視角」即可繼續精準繪製方格。
              </p>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmClearOpen}
        title="確認清空平面方格圖"
        message="確定要清空平面方格圖上的所有著色區域嗎？"
        confirmLabel="確定清空"
        onConfirm={() => {
          setConfirmClearOpen(false);
          handleClearAll();
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </section>
  );
}
