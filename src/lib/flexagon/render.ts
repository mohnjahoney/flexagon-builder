// Compose the printable front and back of the trihexaflexagon strip.

import { STRIP, stripBounds, triangleVertices, hexWedge, type Point } from "./geometry";

export interface FaceImages {
  /** dataURL or ObjectURL for each face. May be null if user hasn't picked yet. */
  face1: string | null;
  face2: string | null;
  face3: string | null;
}

const DPI = 300;
const PAGE_W_IN = 11; // landscape letter
const PAGE_H_IN = 8.5;
const MARGIN_IN = 0.5;

export interface RenderedSheets {
  front: HTMLCanvasElement;
  back: HTMLCanvasElement;
  widthPx: number;
  heightPx: number;
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

function drawSheetChrome(ctx: CanvasRenderingContext2D, w: number, h: number, label: string) {
  // Paper tone
  ctx.fillStyle = "#faf7ef";
  ctx.fillRect(0, 0, w, h);

  // Faint margin rule
  ctx.strokeStyle = "rgba(120,110,95,0.35)";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  const m = MARGIN_IN * DPI;
  ctx.strokeRect(m, m, w - 2 * m, h - 2 * m);
  ctx.setLineDash([]);

  // Header
  ctx.fillStyle = "#332b22";
  ctx.font = `500 ${0.18 * DPI}px "Fraunces", Georgia, serif`;
  ctx.textBaseline = "top";
  ctx.fillText("Hexaflexagon Atelier", m, m - 0.32 * DPI);

  ctx.font = `400 ${0.11 * DPI}px "Inter Tight", system-ui, sans-serif`;
  ctx.fillStyle = "#6a5f50";
  ctx.fillText(label.toUpperCase(), m + 3.4 * DPI, m - 0.28 * DPI);
}

function clipPolygon(ctx: CanvasRenderingContext2D, pts: Point[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.clip();
}

function strokePolygon(ctx: CanvasRenderingContext2D, pts: Point[], dashed = false) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  if (dashed) ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Draw one strip triangle filled with a wedge of the corresponding face image.
 * Strategy: clip to triangle, then draw the source image inside the triangle's
 * bounding box, transformed so that the wedge of the source hexagon roughly
 * aligns with this triangle's orientation.
 */
function drawTriangleWedge(
  ctx: CanvasRenderingContext2D,
  pts: [Point, Point, Point],
  img: HTMLImageElement | null,
  wedgeIndex: number,
  faceLabel: string,
  fallbackFill: string,
) {
  ctx.save();
  clipPolygon(ctx, pts);

  // Triangle bounding box
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const tw = maxX - minX;
  const th = maxY - minY;

  if (img) {
    // Place image so its center sits over the triangle centroid,
    // scaled to slightly more than cover the triangle bbox, and
    // rotated by 60° * wedgeIndex so consecutive wedges of the same
    // face show consecutive sectors of the source image.
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
    ctx.fillRect(minX, minY, tw, th);
  }
  ctx.restore();

  // Subtle face label in the triangle centroid
  const cx = (pts[0].x + pts[1].x + pts[2].x) / 3;
  const cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
  ctx.save();
  ctx.fillStyle = "rgba(250,247,239,0.78)";
  ctx.beginPath();
  ctx.arc(cx, cy, 0.12 * DPI, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#46362a";
  ctx.font = `500 ${0.14 * DPI}px "Fraunces", Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(faceLabel, cx, cy + 0.005 * DPI);
  ctx.restore();
}

export async function renderSheets(faces: FaceImages): Promise<RenderedSheets> {
  const W = Math.round(PAGE_W_IN * DPI);
  const H = Math.round(PAGE_H_IN * DPI);

  const front = document.createElement("canvas");
  front.width = W;
  front.height = H;
  const back = document.createElement("canvas");
  back.width = W;
  back.height = H;

  const fctx = front.getContext("2d")!;
  const bctx = back.getContext("2d")!;

  drawSheetChrome(fctx, W, H, "Front · cut along solid lines");
  drawSheetChrome(bctx, W, H, "Back · glue tab 10 to tab 1");

  const [img1, img2, img3] = await Promise.all([
    faces.face1 ? loadImage(faces.face1) : Promise.resolve(null),
    faces.face2 ? loadImage(faces.face2) : Promise.resolve(null),
    faces.face3 ? loadImage(faces.face3) : Promise.resolve(null),
  ]);
  const imgs = { 1: img1, 2: img2, 3: img3 } as const;
  const fills = { 1: "#efe6d4", 2: "#e8dfca", 3: "#e1d6bc" } as const;

  // Edge length sized to fit page comfortably
  const s = 1.7 * DPI;
  const { width: stripW, height: stripH } = stripBounds(s);
  const ox = (W - stripW) / 2;
  const oy = (H - stripH) / 2;

  // FRONT
  for (const t of STRIP) {
    const v = triangleVertices(t.index, s, ox, oy);
    drawTriangleWedge(fctx, v, imgs[t.frontFace], t.frontWedge, romanFor(t.frontFace), fills[t.frontFace]);
  }
  // Strong cut outline + dashed fold lines (front)
  drawStripOutline(fctx, s, ox, oy);
  drawFoldLines(fctx, s, ox, oy);
  drawIndexNumbers(fctx, s, ox, oy);

  // BACK — strip is mirrored left-right because we flip the paper over
  for (const t of STRIP) {
    const v = triangleVertices(t.index, s, ox, oy, true);
    drawTriangleWedge(bctx, v, imgs[t.backFace], t.backWedge, romanFor(t.backFace), fills[t.backFace]);
  }
  drawStripOutline(bctx, s, ox, oy);
  drawFoldLines(bctx, s, ox, oy);
  drawGlueTabMark(bctx, s, ox, oy);

  return { front, back, widthPx: W, heightPx: H };
}

function romanFor(face: number) {
  return face === 1 ? "I" : face === 2 ? "II" : "III";
}

function drawStripOutline(ctx: CanvasRenderingContext2D, s: number, ox: number, oy: number) {
  ctx.strokeStyle = "#2a2117";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "miter";
  // outline = perimeter of all triangles unioned (a parallelogram-ish band)
  const h = (s * Math.sqrt(3)) / 2;
  ctx.beginPath();
  ctx.moveTo(ox, oy + h);
  ctx.lineTo(ox + s / 2, oy);
  // zig-zag top
  for (let i = 1; i < 10; i += 2) {
    const x = ox + ((i + 1) * s) / 2 + s / 2;
    ctx.lineTo(x - s / 2, oy);
  }
  // actually a simpler outline: top is a flat line, bottom is flat line —
  // since adjacent triangles share, the silhouette is a parallelogram.
  ctx.closePath();
  // Replace with the true parallelogram outline:
  ctx.beginPath();
  ctx.moveTo(ox, oy + h);
  ctx.lineTo(ox + s / 2, oy);
  ctx.lineTo(ox + s / 2 + 5 * s, oy);
  ctx.lineTo(ox + 5.5 * s, oy + h);
  ctx.lineTo(ox + s, oy + h);
  ctx.closePath();
  ctx.stroke();
}

function drawFoldLines(ctx: CanvasRenderingContext2D, s: number, ox: number, oy: number) {
  ctx.strokeStyle = "#7a3b2c";
  ctx.lineWidth = 1.1;
  ctx.setLineDash([7, 5]);
  const h = (s * Math.sqrt(3)) / 2;
  // Internal shared edges between adjacent triangles — 9 of them
  for (let i = 1; i < 10; i++) {
    const apexUp = i % 2 === 0;
    // shared edge between triangle i-1 and i
    // triangle i-1 right vertex == triangle i left vertex; the shared edge
    // alternates between rising and falling diagonals.
    const xMid = ox + (i * s) / 2;
    ctx.beginPath();
    if (apexUp) {
      // shared edge goes from (xMid - s/2, oy) down-right to (xMid, oy + h)
      ctx.moveTo(xMid + s / 2, oy);
      ctx.lineTo(xMid, oy + h);
    } else {
      ctx.moveTo(xMid, oy);
      ctx.lineTo(xMid + s / 2, oy + h);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawIndexNumbers(ctx: CanvasRenderingContext2D, s: number, ox: number, oy: number) {
  ctx.fillStyle = "rgba(46,36,26,0.55)";
  ctx.font = `500 ${0.1 * 300}px "Inter Tight", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const h = (s * Math.sqrt(3)) / 2;
  for (let i = 0; i < 10; i++) {
    const cx = ox + (i * s) / 2 + s / 2;
    const cy = i % 2 === 0 ? oy + h * 0.7 : oy + h * 0.3;
    ctx.fillText(String(i + 1), cx, cy + h * 0.18);
  }
}

function drawGlueTabMark(ctx: CanvasRenderingContext2D, s: number, ox: number, oy: number) {
  const h = (s * Math.sqrt(3)) / 2;
  ctx.fillStyle = "rgba(122,59,44,0.18)";
  // triangle 10 region (last triangle on the back, which is mirrored — leftmost)
  ctx.beginPath();
  ctx.moveTo(ox, oy + h);
  ctx.lineTo(ox + s, oy + h);
  ctx.lineTo(ox + s / 2, oy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#7a3b2c";
  ctx.font = `500 ${0.13 * 300}px "Fraunces", Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("glue tab", ox + s / 2, oy + h * 0.55);
}
