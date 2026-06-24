import { renderSheets, type FaceImages, type PrintLayout } from "../render";
import {
  applyOperation,
  BRING_ARM_FORWARD,
  createInitialFoldingState,
  FIRST_FOLD,
  SECOND_FOLD,
  withFoldAngle,
  type FoldingState,
} from "./folding-engine";
import { renderFoldingStateWithThree } from "./three-renderer";

const DPI = 144;
const PAGE_W = Math.round(8.5 * DPI);
const PAGE_H = Math.round(11 * DPI);
const PAPER = "#faf7ef";
const INK = "#2a2117";
const SOFT = "#6a5f50";
const ACCENT = "#7a3b2c";
const HAIRLINE = "#c9bea9";
const SQRT3 = Math.sqrt(3);

interface InstructionStep {
  title: string;
  body: string;
  diagram:
    | "strip"
    | "double-strip"
    | "left-fold"
    | "right-fold"
    | "hex-tail"
    | "move-arm"
    | "arm-front"
    | "flip"
    | "glue"
    | "flex";
}

export interface StripAssets {
  front: HTMLCanvasElement;
  back: HTMLCanvasElement;
  double: HTMLCanvasElement;
}

export async function renderCustomFoldingInstructions(
  faces: FaceImages,
  layout: PrintLayout,
): Promise<HTMLCanvasElement[]> {
  const assets = await renderStripAssets(faces);
  const steps: InstructionStep[] = [
    {
      title: "Cut out the shape",
      body: "Cut carefully around the solid outside edge. Keep all ten triangles joined.",
      diagram: "strip",
    },
    ...(layout === "single-sided"
      ? [
          {
            title: "Make one long strip",
            body: "Fold the double strip along its long centre line so the printed sides face out.",
            diagram: "double-strip" as const,
          },
        ]
      : []),
    {
      title: "Put the blanks on top",
      body: "Turn the strip so the two blank triangles are facing up, one at each end.",
      diagram: "strip",
    },
    {
      title: "Fold the first three",
      body: "Take the first three triangles from the left as one trapezoid. Fold them up, over, right, and onto the strip.",
      diagram: "left-fold",
    },
    {
      title: "Fold the last four behind",
      body: "Take the last four triangles from the right as one parallelogram and fold that group behind.",
      diagram: "right-fold",
    },
    {
      title: "Find the hexagon",
      body: "You should now have a hexagon with one equilateral triangle sticking up above it.",
      diagram: "hex-tail",
    },
    {
      title: "Bring the arm forward",
      body: "Lift the upper-right arm from behind the top of the hexagon and bring it to the front.",
      diagram: "move-arm",
    },
    {
      title: "Check the shape",
      body: "You should still see a hexagon with one triangle sticking up on top.",
      diagram: "arm-front",
    },
    {
      title: "Flip it over",
      body: "Turn the whole folded shape over without changing any folds.",
      diagram: "flip",
    },
    {
      title: "Glue the blanks",
      body: "The top triangle and the triangle directly below it should both be blank. Glue those two faces together.",
      diagram: "glue",
    },
    {
      title: "Flex it",
      body: "Let the glue dry. Pinch three alternating edges, open the centre, and reveal the next face.",
      diagram: "flex",
    },
  ];

  const perPage = 6;
  return Array.from({ length: Math.ceil(steps.length / perPage) }, (_, pageIndex) =>
    drawInstructionPage(
      steps.slice(pageIndex * perPage, (pageIndex + 1) * perPage),
      assets,
      pageIndex,
    ),
  );
}

export async function renderStripAssets(faces: FaceImages): Promise<StripAssets> {
  const [doubleSided, singleSided] = await Promise.all([
    renderSheets(faces, { layout: "double-sided", dpi: DPI }),
    renderSheets(faces, { layout: "single-sided", dpi: DPI }),
  ]);

  const pageW = 11 * DPI;
  const pageH = 8.5 * DPI;
  const margin = 0.5 * DPI;
  const s = (pageW - 2 * margin) / 5.5;
  const stripW = 5.5 * s;
  const stripH = (s * SQRT3) / 2;
  const x = (pageW - stripW) / 2;
  const y = (pageH - stripH) / 2;
  const doubleY = (pageH - 2 * stripH) / 2;

  return {
    front: cropCanvas(doubleSided.pages[0], x, y, stripW, stripH),
    back: cropCanvas(doubleSided.pages[1], x, y, stripW, stripH),
    double: cropCanvas(singleSided.pages[0], x, doubleY, stripW, stripH * 2),
  };
}

function cropCanvas(
  source: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  canvas
    .getContext("2d")!
    .drawImage(
      source,
      Math.round(x),
      Math.round(y),
      Math.round(width),
      Math.round(height),
      0,
      0,
      canvas.width,
      canvas.height,
    );
  return canvas;
}

function drawInstructionPage(steps: InstructionStep[], assets: StripAssets, pageIndex: number) {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  ctx.fillStyle = INK;
  ctx.font = `400 ${36 * (DPI / 144)}px Georgia, serif`;
  ctx.fillText("How to fold your flexagon", 72, 78);
  ctx.fillStyle = SOFT;
  ctx.font = `500 13px system-ui, sans-serif`;
  ctx.fillText(`CUSTOM INSTRUCTIONS · PAGE ${pageIndex + 1}`, 74, 108);
  ctx.strokeStyle = HAIRLINE;
  ctx.beginPath();
  ctx.moveTo(72, 128);
  ctx.lineTo(PAGE_W - 72, 128);
  ctx.stroke();

  const gap = 24;
  const cardW = (PAGE_W - 144 - gap) / 2;
  const cardH = 430;
  steps.forEach((step, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    drawStepCard(
      ctx,
      step,
      assets,
      72 + col * (cardW + gap),
      154 + row * (cardH + 24),
      cardW,
      cardH,
      index + 1 + pageIndex * 6,
    );
  });
  return canvas;
}

function drawStepCard(
  ctx: CanvasRenderingContext2D,
  step: InstructionStep,
  assets: StripAssets,
  x: number,
  y: number,
  width: number,
  height: number,
  number: number,
) {
  ctx.save();
  ctx.strokeStyle = HAIRLINE;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = ACCENT;
  ctx.beginPath();
  ctx.arc(x + 30, y + 30, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAPER;
  ctx.font = "600 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), x + 30, y + 30);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.font = "400 25px Georgia, serif";
  ctx.fillText(step.title, x + 58, y + 38);
  drawDiagram(ctx, step.diagram, assets, x + 24, y + 68, width - 48, 235);
  ctx.fillStyle = SOFT;
  ctx.font = "400 15px system-ui, sans-serif";
  drawWrappedText(ctx, step.body, x + 24, y + 334, width - 48, 21);
  ctx.restore();
}

function drawDiagram(
  ctx: CanvasRenderingContext2D,
  kind: InstructionStep["diagram"],
  assets: StripAssets,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  ctx.save();
  ctx.fillStyle = "#f1eadc";
  ctx.fillRect(x, y, width, height);

  if (kind === "strip") {
    drawFitted(ctx, assets.back, x + 18, y + 88, width - 36, 74);
  } else if (kind === "double-strip") {
    drawFitted(ctx, assets.double, x + 18, y + 42, width - 36, 145);
    ctx.strokeStyle = ACCENT;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(x + 28, y + height / 2);
    ctx.lineTo(x + width - 28, y + height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    curvedArrow(ctx, x + width * 0.82, y + 36, x + width * 0.82, y + 200, "down");
  } else {
    drawProgrammaticFold(ctx, kind, assets, x, y, width, height);
  }
  ctx.restore();
}

function drawProgrammaticFold(
  ctx: CanvasRenderingContext2D,
  kind: InstructionStep["diagram"],
  assets: StripAssets,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const initial = createInitialFoldingState();
  const firstDone = applyOperation(initial, FIRST_FOLD);
  const secondDone = applyOperation(firstDone, SECOND_FOLD);
  const armForward = applyOperation(secondDone, BRING_ARM_FORWARD);
  const flipped = applyOperation(armForward, { kind: "flip" });
  const state =
    kind === "left-fold"
      ? applyOperation(initial, withFoldAngle(FIRST_FOLD, Math.PI * 0.62))
      : kind === "right-fold"
        ? applyOperation(firstDone, withFoldAngle(SECOND_FOLD, -Math.PI * 0.62))
        : kind === "hex-tail" || kind === "move-arm"
          ? secondDone
          : kind === "arm-front"
            ? armForward
            : flipped;

  renderFoldingState(ctx, state, assets, x + 18, y + 14, width - 36, height - 28, {
    perspective: kind === "left-fold" || kind === "right-fold",
    emphasize: kind === "left-fold" ? [1, 2, 3] : kind === "right-fold" ? [7, 8, 9, 10] : [],
  });

  if (kind === "move-arm") {
    curvedArrow(
      ctx,
      x + width * 0.78,
      y + height * 0.34,
      x + width * 0.58,
      y + height * 0.18,
      "left",
    );
    ctx.fillStyle = ACCENT;
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.fillText("2 ABOVE 12", x + width * 0.56, y + height * 0.12);
  }
  if (kind === "arm-front") {
    ctx.fillStyle = ACCENT;
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.fillText("2 BELOW 12", x + width * 0.58, y + height * 0.12);
  }
  if (kind === "flip")
    curvedArrow(
      ctx,
      x + width * 0.18,
      y + height * 0.5,
      x + width * 0.82,
      y + height * 0.5,
      "right",
    );
  if (kind === "glue") {
    ctx.fillStyle = ACCENT;
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText("GLUE THE TWO BLANK SURFACES", x + width * 0.2, y + height * 0.12);
  }
  if (kind === "flex") {
    ctx.strokeStyle = ACCENT;
    const cx = x + width / 2;
    const cy = y + height / 2;
    for (let index = 0; index < 3; index += 1) {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / 3;
      arrow(
        ctx,
        cx + Math.cos(angle) * 24,
        cy + Math.sin(angle) * 24,
        cx + Math.cos(angle) * 82,
        cy + Math.sin(angle) * 82,
      );
    }
  }
}

function renderFoldingState(
  ctx: CanvasRenderingContext2D,
  state: FoldingState,
  assets: StripAssets,
  x: number,
  y: number,
  width: number,
  height: number,
  options: { perspective: boolean; emphasize: number[] },
) {
  try {
    const snapshot = renderFoldingStateWithThree(state, assets, {
      width,
      height,
      background: "#f1eadc",
      emphasize: options.emphasize,
      camera: options.perspective ? "folding" : "top",
    });
    ctx.drawImage(snapshot, x, y, width, height);
  } catch (error) {
    console.warn("[flexagon] Three.js instruction render failed", error);
    ctx.fillStyle = "#efe8dc";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "#7a3b2c";
    ctx.font = "500 13px system-ui, sans-serif";
    ctx.fillText("3D fold preview unavailable", x + 18, y + height / 2);
  }
}

function drawFitted(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / source.width, height / source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  ctx.drawImage(source, x + (width - w) / 2, y + (height - h) / 2, w, h);
}

function shade(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.fillStyle = "rgba(122,59,44,0.24)";
  ctx.fillRect(x, y, width, height);
}

function polygonPath(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
}

function curvedArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  bend: "left" | "right" | "down",
) {
  const controlX =
    bend === "left"
      ? Math.min(fromX, toX) - 40
      : bend === "right"
        ? Math.max(fromX, toX) + 40
        : fromX + 55;
  const controlY = bend === "down" ? Math.max(fromY, toY) + 25 : Math.min(fromY, toY) - 35;
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.quadraticCurveTo(controlX, controlY, toX, toY);
  ctx.stroke();
  arrowHead(ctx, toX, toY, Math.atan2(toY - controlY, toX - controlX));
}

function arrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  arrowHead(ctx, toX, toY, Math.atan2(toY - fromY, toX - fromX));
}

function arrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.fillStyle = ACCENT;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 13 * Math.cos(angle - 0.45), y - 13 * Math.sin(angle - 0.45));
  ctx.lineTo(x - 13 * Math.cos(angle + 0.45), y - 13 * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = candidate;
    }
  }
  if (line) ctx.fillText(line, x, lineY);
}
