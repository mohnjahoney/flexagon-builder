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

import { STRIP, triangleVertices, type Point } from "./geometry";

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

function clipPolygon(ctx: CanvasRenderingContext2D, pts: Point[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.clip();
}

function drawTriangleWedge(
  ctx: CanvasRenderingContext2D,
  pts: [Point, Point, Point],
  img: HTMLImageElement | null,
  wedgeIndex: number,
  faceLabel: string,
  fallbackFill: string,
  dpi: number,
) {
  ctx.save();
  clipPolygon(ctx, pts);

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const tw = Math.max(...xs) - Math.min(...xs);
  const th = Math.max(...ys) - Math.min(...ys);

  if (img) {
    const cx = (pts[0].x + pts[1].x + pts[2].x) / 3;
    const cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
    const cover = Math.max(tw, th) * 2.4;
    const aspect = img.width / img.height;
    const dw = aspect >= 1 ? cover * aspect : cover;
    const dh = aspect >= 1 ? cover : cover / aspect;
    ctx.translate(cx, cy);
    ctx.rotate((wedgeIndex * Math.PI) / 3);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  } else {
    ctx.fillStyle = fallbackFill;
    ctx.fillRect(Math.min(...xs), Math.min(...ys), tw, th);
  }
  ctx.restore();

  const cx = (pts[0].x + pts[1].x + pts[2].x) / 3;
  const cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
  ctx.save();
  ctx.fillStyle = "rgba(250,247,239,0.78)";
  ctx.beginPath();
  ctx.arc(cx, cy, 0.1 * dpi, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#46362a";
  ctx.font = `500 ${0.12 * dpi}px "Fraunces", Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(faceLabel, cx, cy + 0.005 * dpi);
  ctx.restore();
}

function romanFor(face: number) {
  return face === 1 ? "I" : face === 2 ? "II" : "III";
}

/** Outline of a strip: parallelogram of 10 triangles + half-triangle glue tab on the right. */
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
  // Parallelogram (10 triangles) + half-triangle tab on the right.
  // Parallelogram: top from (ox + s/2, oy) length 5s; bottom from (ox, oy+h) length 5s.
  // Half-triangle tab: extends from (ox + 5s + s/2, oy) down to (ox + 5.5s, oy+h).
  ctx.beginPath();
  ctx.moveTo(ox, oy + h);
  ctx.lineTo(ox + s / 2, oy);
  ctx.lineTo(ox + s / 2 + 5 * s, oy); // top: parallelogram + nothing extra above
  // diagonal down-right of half-tab
  ctx.lineTo(ox + 5.5 * s + s / 2, oy + h);
  ctx.lineTo(ox + 5 * s, oy + h);
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
  const h = (s * SQRT3) / 2;
  for (let i = 1; i < 10; i++) {
    const apexUp = i % 2 === 0;
    const xMid = ox + (i * s) / 2;
    ctx.beginPath();
    if (apexUp) {
      ctx.moveTo(xMid + s / 2, oy);
      ctx.lineTo(xMid, oy + h);
    } else {
      ctx.moveTo(xMid, oy);
      ctx.lineTo(xMid + s / 2, oy + h);
    }
    ctx.stroke();
  }
  // fold line separating the half-tab from triangle 10
  ctx.beginPath();
  ctx.moveTo(ox + 5 * s + s / 2, oy);
  ctx.lineTo(ox + 5 * s, oy + h);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawHalfTab(
  ctx: CanvasRenderingContext2D,
  s: number,
  ox: number,
  oy: number,
  dpi: number,
) {
  const h = (s * SQRT3) / 2;
  ctx.save();
  ctx.fillStyle = "rgba(122,59,44,0.10)";
  ctx.beginPath();
  ctx.moveTo(ox + 5 * s + s / 2, oy);
  ctx.lineTo(ox + 5.5 * s + s / 2, oy + h);
  ctx.lineTo(ox + 5 * s, oy + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#7a3b2c";
  ctx.font = `500 ${0.11 * dpi}px "Fraunces", Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("glue", ox + 5.25 * s + s / 4, oy + h * 0.55);
  ctx.restore();
}

/** Render a single strip (front or back) at origin (ox, oy) on `ctx`. */
function drawStrip(
  ctx: CanvasRenderingContext2D,
  side: "front" | "back",
  s: number,
  ox: number,
  oy: number,
  imgs: Record<1 | 2 | 3, HTMLImageElement | null>,
  fills: Record<1 | 2 | 3, string>,
  dpi: number,
) {
  for (const t of STRIP) {
    const mirror = side === "back";
    const v = triangleVertices(t.index, s, ox, oy, mirror);
    const face = side === "front" ? t.frontFace : t.backFace;
    const wedge = side === "front" ? t.frontWedge : t.backWedge;
    drawTriangleWedge(ctx, v, imgs[face], wedge, romanFor(face), fills[face], dpi);
  }
  drawStripOutline(ctx, s, ox, oy, dpi);
  drawFoldLines(ctx, s, ox, oy, dpi);
  drawHalfTab(ctx, s, ox, oy, dpi);
}

/** Compute strip edge length `s` that maximises a single-strip-tall layout
 *  on the page after margins. Returns also strip dimensions. */
function fitSingleStrip(pageW: number, pageH: number, margin: number) {
  const usableW = pageW - 2 * margin;
  const usableH = pageH - 2 * margin;
  // strip is 5.5s + s/2 = 6s wide (including tab), 0.866s tall
  const sByW = usableW / 6;
  const sByH = usableH / (SQRT3 / 2);
  return Math.min(sByW, sByH);
}

function fitDoubleStrip(pageW: number, pageH: number, margin: number) {
  const usableW = pageW - 2 * margin;
  const usableH = pageH - 2 * margin;
  // Rotating the bottom strip makes its glue tab protrude at the opposite end;
  // reserve 7s total width so the full cut outline still keeps the 0.5" margin.
  const sByW = usableW / 7;
  const sByH = usableH / SQRT3;
  return Math.min(sByW, sByH);
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
  const imgs = { 1: img1, 2: img2, 3: img3 } as const;
  const fills = { 1: "#efe6d4", 2: "#e8dfca", 3: "#e1d6bc" } as const;

  const pages: HTMLCanvasElement[] = [];

  if (layout === "double-sided") {
    const s = fitSingleStrip(W, H, margin);
    const stripW = 6 * s;
    const stripH = (s * SQRT3) / 2;
    const ox = (W - stripW) / 2;
    const oy = (H - stripH) / 2;

    for (const side of ["front", "back"] as const) {
      const cv = document.createElement("canvas");
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext("2d")!;
      drawSheetChrome(ctx, W, H, side === "front" ? "Front · cut along solid lines" : "Back · prints on the reverse", dpi);
      drawStrip(ctx, side, s, ox, oy, imgs, fills, dpi);
      pages.push(cv);
    }
  } else {
    // single-sided: front + 180°-rotated back stacked vertically, long edges aligned
    const s = fitDoubleStrip(W, H, margin);
    const stripW = 6 * s;
    const stripH = (s * SQRT3) / 2;
    const totalH = 2 * stripH;
    const combinedW = 7 * s;
    const ox = (W - combinedW) / 2 + s;
    const oy = (H - totalH) / 2;

    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d")!;
    drawSheetChrome(ctx, W, H, "Single sheet · cut around outline, fold along the centre seam", dpi);

    // FRONT (top half)
    drawStrip(ctx, "front", s, ox, oy, imgs, fills, dpi);
    // BACK (bottom half) — rotated around the shared long edge so the cut lines align.
    ctx.save();
    ctx.translate(ox + 2.5 * s, oy + stripH * 1.5);
    ctx.rotate(Math.PI);
    ctx.translate(-(ox + 2.5 * s), -(oy + stripH * 1.5));
    drawStrip(ctx, "back", s, ox, oy + stripH, imgs, fills, dpi);
    ctx.restore();

    // centre seam — fold line where the user folds the sheet in half
    ctx.save();
    ctx.strokeStyle = "#2a2117";
    ctx.setLineDash([dpi / 25, dpi / 40]);
    ctx.lineWidth = Math.max(1, dpi / 400);
    ctx.beginPath();
    ctx.moveTo(ox, oy + stripH);
    ctx.lineTo(ox + 5 * s, oy + stripH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#6a5f50";
    ctx.font = `400 ${0.1 * dpi}px "Inter Tight", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("fold here", ox + stripW / 2, oy + stripH - 0.08 * dpi);
    ctx.restore();

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
