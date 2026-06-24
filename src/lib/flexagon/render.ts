// Compose the printable trihexaflexagon strip(s).
//
// Two layouts:
//   - "double-sided"  : two pages (front, back). Standard double-sided printing.
//   - "single-sided"  : one page. Front strip + 180°-rotated back strip stacked
//                       so the true long edges meet for folding in half.
//
// Always landscape US-letter with a 0.5" margin all round. Front and back have
// the identical silhouette: a parallelogram of 10 equilateral triangles plus
// one half-triangle glue tab on the trailing edge.

import { triangleVertices, type Point } from "./geometry";
import { TRIANGLE_DEBUG } from "./debug";
import {
  STRIP_CONFIG,
  type BlankStripSlot,
  type ImageStripSlot,
  type StripSlot,
  type TenStripSlots,
} from "./strip-config";
import { drawTriangleImage, extractTriangleImages, type TriangleImages } from "./triangles";
import { drawQR, STUDIO_PIQUE_QR_COLORS } from "../qr";

export interface FaceImages {
  face1: string | null;
  face2: string | null;
  face3: string | null;
}

export type PrintLayout = "single-sided" | "double-sided";

export interface RenderOptions {
  dpi?: number; // default 600
  layout?: PrintLayout; // default "double-sided"
}

const PAGE_W_IN = 11; // landscape letter
const PAGE_H_IN = 8.5;
const MARGIN_IN = 0.5;
const SQRT3 = Math.sqrt(3);

export interface RenderedSheets {
  pages: HTMLCanvasElement[];
  /** small preview canvases (one per page) for the on-screen proof */
  previews: HTMLCanvasElement[];
  widthPx: number;
  heightPx: number;
  layout: PrintLayout;
  dpi: number;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadOptionalImage(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return null;
  try {
    return await loadImage(src);
  } catch (err) {
    console.warn("[flexagon] image could not be loaded; using a printed placeholder", src, err);
    return null;
  }
}

function drawSheetChrome(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  label: string,
  dpi: number,
) {
  ctx.fillStyle = "#faf7ef";
  ctx.fillRect(0, 0, w, h);

  // very faint margin guide
  ctx.strokeStyle = "rgba(120,110,95,0.22)";
  ctx.lineWidth = Math.max(1, dpi / 300);
  ctx.setLineDash([dpi / 50, dpi / 25]);
  const m = MARGIN_IN * dpi;
  ctx.strokeRect(m, m, w - 2 * m, h - 2 * m);
  ctx.setLineDash([]);

  ctx.fillStyle = "#6a5f50";
  ctx.font = `400 ${0.1 * dpi}px "Inter Tight", system-ui, sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(label.toUpperCase(), m, m - 0.12 * dpi);
}

function drawSheetBackground(ctx: CanvasRenderingContext2D, w: number, h: number, dpi: number) {
  ctx.fillStyle = "#faf7ef";
  ctx.fillRect(0, 0, w, h);

  // very faint margin guide
  ctx.strokeStyle = "rgba(120,110,95,0.22)";
  ctx.lineWidth = Math.max(1, dpi / 300);
  ctx.setLineDash([dpi / 50, dpi / 25]);
  const m = MARGIN_IN * dpi;
  ctx.strokeRect(m, m, w - 2 * m, h - 2 * m);
  ctx.setLineDash([]);
}

function clipPolygon(ctx: CanvasRenderingContext2D, pts: Point[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.clip();
}

function triangleApexAndBase(pts: [Point, Point, Point]) {
  const sorted = [...pts].sort((a, b) => a.x - b.x);
  const apex = pts.find((point) => point !== sorted[0] && point !== sorted[2]) ?? pts[2];
  const apexUp = apex.y < (sorted[0].y + sorted[2].y) / 2;
  const target: [Point, Point, Point] = apexUp
    ? [apex, sorted[2], sorted[0]]
    : [apex, sorted[0], sorted[2]];
  return { apexUp, target };
}

function fillTriangle(ctx: CanvasRenderingContext2D, pts: [Point, Point, Point], fill: string) {
  ctx.save();
  clipPolygon(ctx, pts);
  ctx.fillStyle = fill;
  const xs = pts.map((point) => point.x);
  const ys = pts.map((point) => point.y);
  ctx.fillRect(
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
  );
  ctx.restore();
}

function drawImageSlot(
  ctx: CanvasRenderingContext2D,
  pts: [Point, Point, Point],
  slot: ImageStripSlot,
  img: CanvasImageSource | null,
  fallbackFill: string,
  dpi: number,
) {
  const { target } = triangleApexAndBase(pts);
  if (img) {
    drawTriangleImage(ctx, img, target, slot.rotation);
  } else {
    fillTriangle(ctx, pts, fallbackFill);
  }
}

function drawBlankSlot(
  ctx: CanvasRenderingContext2D,
  pts: [Point, Point, Point],
  slot: BlankStripSlot,
  dpi: number,
) {
  fillTriangle(ctx, pts, "#efe8dc");
  if (!slot.text) return;

  const cx = (pts[0].x + pts[1].x + pts[2].x) / 3;
  const cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
  const { apexUp } = triangleApexAndBase(pts);
  ctx.save();
  ctx.translate(cx, cy);
  if (!apexUp) ctx.rotate(Math.PI);
  ctx.fillStyle = "#7a3b2c";
  ctx.font = `500 ${0.1 * dpi}px "Inter Tight", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(slot.text, 0, 0, 0.7 * dpi);
  ctx.restore();
}

function drawConfiguredSlot(
  ctx: CanvasRenderingContext2D,
  pts: [Point, Point, Point],
  slot: StripSlot,
  imgs: Record<1 | 2 | 3, TriangleImages | null>,
  fills: Record<1 | 2 | 3, string>,
  dpi: number,
  side: "front" | "back",
  stripIndex: number,
) {
  if (slot.kind === "blank") {
    drawBlankSlot(ctx, pts, slot, dpi);
  } else {
    drawImageSlot(
      ctx,
      pts,
      slot,
      imgs[slot.face]?.[slot.triangle - 1] ?? null,
      fills[slot.face],
      dpi,
    );
  }
  drawStripDebugLabel(ctx, pts, slot, side, stripIndex, dpi);
}

function drawStripDebugLabel(
  ctx: CanvasRenderingContext2D,
  pts: [Point, Point, Point],
  slot: StripSlot,
  side: "front" | "back",
  stripIndex: number,
  dpi: number,
) {
  if (!TRIANGLE_DEBUG.stripLabels) return;
  const cx = (pts[0].x + pts[1].x + pts[2].x) / 3;
  const cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
  const sideLabel = side === "front" ? "A" : "B";
  const sourceLabel =
    slot.kind === "blank" ? "BLANK" : `${romanFor(slot.face)}-${slot.triangle} · ${slot.rotation}°`;
  const boxWidth = 1.3 * dpi;
  const boxHeight = 0.48 * dpi;

  ctx.save();
  ctx.fillStyle = "rgba(250,247,239,0.86)";
  ctx.strokeStyle = "rgba(70,54,42,0.45)";
  ctx.lineWidth = Math.max(1, dpi / 400);
  ctx.fillRect(cx - boxWidth / 2, cy - boxHeight / 2, boxWidth, boxHeight);
  ctx.strokeRect(cx - boxWidth / 2, cy - boxHeight / 2, boxWidth, boxHeight);
  ctx.fillStyle = "#46362a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${0.16 * dpi}px "Inter Tight", system-ui, sans-serif`;
  ctx.fillText(`${sideLabel}${stripIndex}`, cx, cy - 0.1 * dpi);
  ctx.font = `500 ${0.115 * dpi}px "Inter Tight", system-ui, sans-serif`;
  ctx.fillText(sourceLabel, cx, cy + 0.105 * dpi);
  ctx.restore();
}

function romanFor(face: number) {
  return face === 1 ? "I" : face === 2 ? "II" : "III";
}

/** Outline of the ten configured triangles. */
function drawStripOutline(
  ctx: CanvasRenderingContext2D,
  s: number,
  ox: number,
  oy: number,
  dpi: number,
) {
  const h = (s * SQRT3) / 2;
  ctx.strokeStyle = "#2a2117";
  ctx.lineWidth = Math.max(1.5, dpi / 250);
  ctx.lineJoin = "miter";
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(ox + 5 * s, oy);
  ctx.lineTo(ox + 5.5 * s, oy + h);
  ctx.lineTo(ox + s / 2, oy + h);
  ctx.closePath();
  ctx.stroke();
}

function drawFoldLines(
  ctx: CanvasRenderingContext2D,
  s: number,
  ox: number,
  oy: number,
  dpi: number,
) {
  ctx.strokeStyle = "#7a3b2c";
  ctx.lineWidth = Math.max(0.8, dpi / 500);
  ctx.setLineDash([dpi / 40, dpi / 60]);
  for (let i = 1; i < 10; i++) {
    const previous = triangleVertices(i - 1, s, ox, oy);
    const current = triangleVertices(i, s, ox, oy);
    const shared = previous.filter((point) =>
      current.some((candidate) => candidate.x === point.x && candidate.y === point.y),
    );
    if (shared.length !== 2) continue;
    ctx.beginPath();
    ctx.moveTo(shared[0].x, shared[0].y);
    ctx.lineTo(shared[1].x, shared[1].y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

/** Render a single strip (front or back) at origin (ox, oy) on `ctx`. */
function drawStrip(
  ctx: CanvasRenderingContext2D,
  side: "front" | "back",
  s: number,
  ox: number,
  oy: number,
  slots: TenStripSlots,
  imgs: Record<1 | 2 | 3, TriangleImages | null>,
  fills: Record<1 | 2 | 3, string>,
  dpi: number,
) {
  for (let index = 0; index < slots.length; index += 1) {
    const mirror = side === "back";
    const vertices = triangleVertices(index, s, ox, oy, mirror);
    drawConfiguredSlot(ctx, vertices, slots[index], imgs, fills, dpi, side, index);
  }
  ctx.save();
  if (side === "back") {
    const axis = ox + 2.75 * s;
    ctx.translate(2 * axis, 0);
    ctx.scale(-1, 1);
  }
  drawStripOutline(ctx, s, ox, oy, dpi);
  drawFoldLines(ctx, s, ox, oy, dpi);
  ctx.restore();
}

/** Compute strip edge length `s` that maximises a single-strip-tall layout
 *  on the page after margins. Returns also strip dimensions. */
function fitSingleStrip(pageW: number, pageH: number, margin: number) {
  const usableW = pageW - 2 * margin;
  const usableH = pageH - 2 * margin;
  // Ten alternating triangles form a 5.5s-wide parallelogram.
  const sByW = usableW / 5.5;
  const sByH = usableH / (SQRT3 / 2);
  return Math.min(sByW, sByH);
}

function fitDoubleStrip(pageW: number, pageH: number, margin: number, copies = 1) {
  const usableW = pageW - 2 * margin;
  const usableH = pageH - 2 * margin;
  const sByW = usableW / 5.5;
  const sByH = usableH / (copies * SQRT3);
  return Math.min(sByW, sByH);
}

function drawSingleSidedDoubleStrip(
  ctx: CanvasRenderingContext2D,
  s: number,
  ox: number,
  oy: number,
  imgs: Record<1 | 2 | 3, TriangleImages | null>,
  fills: Record<1 | 2 | 3, string>,
  dpi: number,
) {
  const stripH = (s * SQRT3) / 2;

  // FRONT (top half)
  drawStrip(ctx, "front", s, ox, oy, STRIP_CONFIG.front, imgs, fills, dpi);

  // BACK (bottom half) — rotated around the shared long edge so the cut lines align.
  ctx.save();
  ctx.translate(ox + 2.75 * s, oy + stripH * 1.5);
  ctx.rotate(Math.PI);
  ctx.translate(-(ox + 2.75 * s), -(oy + stripH * 1.5));
  drawStrip(ctx, "back", s, ox, oy + stripH, STRIP_CONFIG.back, imgs, fills, dpi);
  ctx.restore();

  // Centre seam — fold line where the user folds the sheet in half.
  ctx.save();
  ctx.strokeStyle = "#2a2117";
  ctx.setLineDash([dpi / 25, dpi / 40]);
  ctx.lineWidth = Math.max(1, dpi / 400);
  ctx.beginPath();
  ctx.moveTo(ox + s / 2, oy + stripH);
  ctx.lineTo(ox + 5.5 * s, oy + stripH);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

async function drawSupportCard(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  topY: number,
  maxW: number,
  maxH: number,
  dpi: number,
) {
  const cardW = Math.min(maxW, maxH * 5.8);
  const cardH = maxH;
  const x = centerX - cardW / 2;
  const y = topY;
  const pad = Math.max(0.08 * dpi, cardH * 0.08);
  const qrSize = Math.max(0, cardH - 2 * pad);
  const textX = x + pad + qrSize + pad * 0.9;
  const textW = Math.max(0, cardW - (textX - x) - pad);

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(16,34,61,0.18)";
  ctx.lineWidth = Math.max(1, dpi / 450);
  ctx.beginPath();
  ctx.roundRect(x, y, cardW, cardH, Math.min(0.12 * dpi, cardH * 0.18));
  ctx.fill();
  ctx.stroke();

  await drawQR(ctx, "studiopique", "venmo", {
    x: x + pad,
    y: y + pad,
    size: qrSize,
    sizePx: Math.ceil(qrSize),
    note: "Studio Pique flexagon",
    darkColor: STUDIO_PIQUE_QR_COLORS.ink,
    lightColor: STUDIO_PIQUE_QR_COLORS.paper,
  });

  ctx.fillStyle = "#10223d";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.min(0.24 * dpi, cardH * 0.24)}px "Fraunces", Georgia, serif`;
  ctx.fillText("Studio Pique", textX, y + cardH * 0.42, textW);
  ctx.font = `400 ${Math.min(0.115 * dpi, cardH * 0.13)}px "Inter Tight", system-ui, sans-serif`;
  ctx.fillStyle = "rgba(16,34,61,0.78)";
  ctx.fillText("scan to tip / support the maker", textX, y + cardH * 0.64, textW);
  ctx.restore();
}

export async function renderSheets(
  faces: FaceImages,
  opts: RenderOptions = {},
): Promise<RenderedSheets> {
  const dpi = opts.dpi ?? 600;
  const layout: PrintLayout = opts.layout ?? "double-sided";

  const W = Math.round(PAGE_W_IN * dpi);
  const H = Math.round(PAGE_H_IN * dpi);
  const margin = MARGIN_IN * dpi;

  const [img1, img2, img3] = await Promise.all([
    loadOptionalImage(faces.face1),
    loadOptionalImage(faces.face2),
    loadOptionalImage(faces.face3),
  ]);
  const imgs = {
    1: img1 ? extractTriangleImages(img1) : null,
    2: img2 ? extractTriangleImages(img2) : null,
    3: img3 ? extractTriangleImages(img3) : null,
  } as const;
  const fills = { 1: "#efe6d4", 2: "#e8dfca", 3: "#e1d6bc" } as const;

  const pages: HTMLCanvasElement[] = [];

  if (layout === "double-sided") {
    const s = fitSingleStrip(W, H, margin);
    const stripW = 5.5 * s;
    const stripH = (s * SQRT3) / 2;
    const ox = (W - stripW) / 2;
    const oy = (H - stripH) / 2;

    for (const side of ["front", "back"] as const) {
      const cv = document.createElement("canvas");
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext("2d")!;
      drawSheetChrome(
        ctx,
        W,
        H,
        side === "front" ? "Front · cut along solid lines" : "Back · prints on the reverse",
        dpi,
      );
      drawStrip(ctx, side, s, ox, oy, STRIP_CONFIG[side], imgs, fills, dpi);
      pages.push(cv);
    }
  } else {
    // single-sided: two copies of front + 180°-rotated back stacked vertically.
    const copies = 2;
    const d = margin / 2;
    const outerPad = d / 2;
    const innerPad = d;
    const s = fitDoubleStrip(W, H, margin, copies);
    const stripW = 5.5 * s;
    const stripH = (s * SQRT3) / 2;
    const copyH = 2 * stripH;
    const combinedW = stripW;
    const ox = (W - combinedW) / 2;
    const lowerOy = H - outerPad - copyH;
    const upperOy = lowerOy - innerPad - copyH;
    const supportTop = outerPad;
    const supportMaxH = Math.max(0, upperOy - innerPad - supportTop);

    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d")!;
    drawSheetBackground(ctx, W, H, dpi);

    if (supportMaxH > 0) {
      await drawSupportCard(ctx, W / 2, supportTop, W - 2 * margin, supportMaxH, dpi);
    }

    drawSingleSidedDoubleStrip(ctx, s, ox, upperOy, imgs, fills, dpi);
    drawSingleSidedDoubleStrip(ctx, s, ox, lowerOy, imgs, fills, dpi);

    pages.push(cv);
  }

  // Downscaled previews for on-screen proof (keeps the DOM lightweight)
  const previews = pages.map((page) => {
    const pv = document.createElement("canvas");
    const maxW = 1600;
    const scale = Math.min(1, maxW / page.width);
    pv.width = Math.round(page.width * scale);
    pv.height = Math.round(page.height * scale);
    const pctx = pv.getContext("2d")!;
    pctx.imageSmoothingQuality = "high";
    pctx.drawImage(page, 0, 0, pv.width, pv.height);
    return pv;
  });

  return { pages, previews, widthPx: W, heightPx: H, layout, dpi };
}
