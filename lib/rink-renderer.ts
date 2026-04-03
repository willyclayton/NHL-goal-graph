import { RINK, RINK_PADDING } from "./rink-constants";

interface RinkTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Compute the transform to map NHL coordinates to canvas pixels.
 * Fits the half-rink (0..100 x -42.5..42.5) into the canvas with padding.
 */
export function computeRinkTransform(
  canvasWidth: number,
  canvasHeight: number
): RinkTransform {
  const pad = RINK_PADDING;
  const availW = canvasWidth - pad * 2;
  const availH = canvasHeight - pad * 2;
  const scaleX = availW / RINK.halfWidth;
  const scaleY = availH / RINK.height;
  const scale = Math.min(scaleX, scaleY);

  // Center the rink in the available space
  const rinkPixelW = RINK.halfWidth * scale;
  const rinkPixelH = RINK.height * scale;
  const offsetX = pad + (availW - rinkPixelW) / 2;
  const offsetY = pad + (availH - rinkPixelH) / 2;

  return { scale, offsetX, offsetY };
}

/** Convert NHL coordinate (normalized to attacking half) to canvas pixel. */
export function nhlToCanvas(
  nhlX: number,
  nhlY: number,
  transform: RinkTransform
): { px: number; py: number } {
  const { scale, offsetX, offsetY } = transform;
  const px = offsetX + nhlX * scale;
  const py = offsetY + (nhlY + RINK.halfHeight) * scale;
  return { px, py };
}

/**
 * Normalize a goal's coordinates to the attacking half-rink.
 * If x < 0, mirror both axes so all dots appear on the same side.
 */
export function normalizeToAttackingHalf(
  x: number,
  y: number
): { x: number; y: number } {
  if (x < 0) {
    return { x: -x, y: -y };
  }
  return { x, y };
}

/** Draw the half-rink background and markings. */
export function drawRink(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const t = computeRinkTransform(width, height);

  // Helper to convert NHL coords to canvas
  const toC = (nx: number, ny: number) => nhlToCanvas(nx, ny, t);

  // --- Rink surface ---
  ctx.fillStyle = "#0f2234";
  drawRinkOutline(ctx, t, true);

  // --- Rink border ---
  ctx.strokeStyle = "rgba(100, 160, 200, 0.3)";
  ctx.lineWidth = 2;
  drawRinkOutline(ctx, t, false);

  // --- Center red line (left edge of half-rink) ---
  ctx.strokeStyle = "rgba(200, 60, 60, 0.25)";
  ctx.lineWidth = 2;
  const cl = toC(0, -RINK.halfHeight);
  const cr = toC(0, RINK.halfHeight);
  ctx.beginPath();
  ctx.moveTo(cl.px, cl.py);
  ctx.lineTo(cr.px, cr.py);
  ctx.stroke();

  // --- Blue line ---
  ctx.strokeStyle = "rgba(60, 120, 200, 0.35)";
  ctx.lineWidth = 3;
  const bl = toC(RINK.blueLineX, -RINK.halfHeight);
  const br = toC(RINK.blueLineX, RINK.halfHeight);
  ctx.beginPath();
  ctx.moveTo(bl.px, bl.py);
  ctx.lineTo(br.px, br.py);
  ctx.stroke();

  // --- Goal line ---
  ctx.strokeStyle = "rgba(200, 60, 60, 0.35)";
  ctx.lineWidth = 2;
  const gl = toC(RINK.goalLineX, -RINK.halfHeight + 6);
  const gr = toC(RINK.goalLineX, RINK.halfHeight - 6);
  ctx.beginPath();
  ctx.moveTo(gl.px, gl.py);
  ctx.lineTo(gr.px, gr.py);
  ctx.stroke();

  // --- Faceoff circles ---
  ctx.strokeStyle = "rgba(200, 60, 60, 0.2)";
  ctx.lineWidth = 1.5;
  for (const fc of RINK.faceoffCircles) {
    const center = toC(fc.x, fc.y);
    const radiusPx = RINK.faceoffCircleRadius * t.scale;
    ctx.beginPath();
    ctx.arc(center.px, center.py, radiusPx, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- Faceoff dots ---
  ctx.fillStyle = "rgba(200, 60, 60, 0.4)";
  for (const fd of RINK.faceoffDots) {
    const center = toC(fd.x, fd.y);
    ctx.beginPath();
    ctx.arc(center.px, center.py, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Center dot (at x=0) ---
  const cd = toC(0, 0);
  ctx.fillStyle = "rgba(60, 120, 200, 0.4)";
  ctx.beginPath();
  ctx.arc(cd.px, cd.py, 3, 0, Math.PI * 2);
  ctx.fill();

  // --- Crease ---
  ctx.strokeStyle = "rgba(60, 140, 200, 0.3)";
  ctx.fillStyle = "rgba(60, 140, 200, 0.08)";
  ctx.lineWidth = 1.5;
  const creaseCenter = toC(RINK.creaseX, 0);
  const creaseR = RINK.creaseRadius * t.scale;
  ctx.beginPath();
  ctx.arc(creaseCenter.px, creaseCenter.py, creaseR, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fill();
  ctx.stroke();

  // --- Goal net ---
  ctx.strokeStyle = "rgba(160, 160, 180, 0.3)";
  ctx.lineWidth = 1;
  const netTop = toC(
    RINK.goalNetX + RINK.goalNetWidth,
    -RINK.goalNetHeight / 2
  );
  const netBottom = toC(
    RINK.goalNetX + RINK.goalNetWidth,
    RINK.goalNetHeight / 2
  );
  const netBackTop = toC(RINK.goalNetX, -RINK.goalNetHeight / 2);
  const netBackBottom = toC(RINK.goalNetX, RINK.goalNetHeight / 2);
  ctx.beginPath();
  ctx.moveTo(netBackTop.px, netBackTop.py);
  ctx.lineTo(netTop.px, netTop.py);
  ctx.lineTo(netBottom.px, netBottom.py);
  ctx.lineTo(netBackBottom.px, netBackBottom.py);
  ctx.stroke();
}

/** Draw the rounded rink outline (fill or stroke). */
function drawRinkOutline(
  ctx: CanvasRenderingContext2D,
  t: RinkTransform,
  fill: boolean
) {
  const toC = (nx: number, ny: number) => nhlToCanvas(nx, ny, t);
  const cr = RINK.cornerRadius * t.scale;

  // The half-rink: left side is flat (center ice), right side has rounded corners
  const topLeft = toC(0, -RINK.halfHeight);
  const topRight = toC(RINK.halfWidth, -RINK.halfHeight);
  const bottomRight = toC(RINK.halfWidth, RINK.halfHeight);
  const bottomLeft = toC(0, RINK.halfHeight);

  ctx.beginPath();
  ctx.moveTo(topLeft.px, topLeft.py);

  // Top edge to top-right corner
  ctx.lineTo(topRight.px - cr, topRight.py);
  ctx.arcTo(topRight.px, topRight.py, topRight.px, topRight.py + cr, cr);

  // Right edge to bottom-right corner
  ctx.lineTo(bottomRight.px, bottomRight.py - cr);
  ctx.arcTo(
    bottomRight.px,
    bottomRight.py,
    bottomRight.px - cr,
    bottomRight.py,
    cr
  );

  // Bottom edge back to left
  ctx.lineTo(bottomLeft.px, bottomLeft.py);

  // Left edge (flat - center ice)
  ctx.closePath();

  if (fill) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
}

export interface DotStyle {
  color: string;
  radius: number;
  alpha: number;
}

/** Draw goal/shot dots on the rink. */
export function drawDots(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  style: DotStyle
) {
  const t = computeRinkTransform(width, height);
  ctx.globalAlpha = style.alpha;
  ctx.fillStyle = style.color;

  for (const pt of points) {
    const norm = normalizeToAttackingHalf(pt.x, pt.y);
    const { px, py } = nhlToCanvas(norm.x, norm.y, t);
    ctx.beginPath();
    ctx.arc(px, py, style.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

/** Draw X marks for saves. */
export function drawSaveMarks(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  style: DotStyle
) {
  const t = computeRinkTransform(width, height);
  ctx.globalAlpha = style.alpha;
  ctx.strokeStyle = style.color;
  ctx.lineWidth = 1.5;

  const r = style.radius;

  for (const pt of points) {
    const norm = normalizeToAttackingHalf(pt.x, pt.y);
    const { px, py } = nhlToCanvas(norm.x, norm.y, t);
    ctx.beginPath();
    ctx.moveTo(px - r, py - r);
    ctx.lineTo(px + r, py + r);
    ctx.moveTo(px + r, py - r);
    ctx.lineTo(px - r, py + r);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}
