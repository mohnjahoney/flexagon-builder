import { hexWedge, type Point } from "./geometry";
import type { TriangleRotation } from "./strip-config";

export const TRIANGLE_SIZE = 320;
export const TRIANGLE_HEIGHT = (TRIANGLE_SIZE * Math.sqrt(3)) / 2;

export type TriangleImages = [
  HTMLCanvasElement,
  HTMLCanvasElement,
  HTMLCanvasElement,
  HTMLCanvasElement,
  HTMLCanvasElement,
  HTMLCanvasElement,
];

const CANONICAL_VERTICES: [Point, Point, Point] = [
  { x: TRIANGLE_SIZE / 2, y: 0 },
  { x: TRIANGLE_SIZE, y: TRIANGLE_HEIGHT },
  { x: 0, y: TRIANGLE_HEIGHT },
];

function affineTransform(source: [Point, Point, Point], target: [Point, Point, Point]): DOMMatrix {
  const [s0, s1, s2] = source;
  const [t0, t1, t2] = target;
  const det = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);

  const solve = (v0: number, v1: number, v2: number) => ({
    a: (v0 * (s1.y - s2.y) + v1 * (s2.y - s0.y) + v2 * (s0.y - s1.y)) / det,
    b: (v0 * (s2.x - s1.x) + v1 * (s0.x - s2.x) + v2 * (s1.x - s0.x)) / det,
    c:
      (v0 * (s1.x * s2.y - s2.x * s1.y) +
        v1 * (s2.x * s0.y - s0.x * s2.y) +
        v2 * (s0.x * s1.y - s1.x * s0.y)) /
      det,
  });

  const x = solve(t0.x, t1.x, t2.x);
  const y = solve(t0.y, t1.y, t2.y);
  return new DOMMatrix([x.a, y.a, x.b, y.b, x.c, y.c]);
}

export function drawTriangleImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  target: [Point, Point, Point],
  rotation: TriangleRotation,
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(target[0].x, target[0].y);
  ctx.lineTo(target[1].x, target[1].y);
  ctx.lineTo(target[2].x, target[2].y);
  ctx.closePath();
  ctx.clip();
  const matrix = affineTransform(CANONICAL_VERTICES, target);
  ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
  const centroidX = TRIANGLE_SIZE / 2;
  const centroidY = (TRIANGLE_HEIGHT * 2) / 3;
  ctx.translate(centroidX, centroidY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-centroidX, -centroidY);
  ctx.drawImage(image, 0, 0, TRIANGLE_SIZE, TRIANGLE_HEIGHT);
  ctx.restore();
}

export function extractTriangleImages(img: HTMLImageElement): TriangleImages {
  const cx = img.width / 2;
  const cy = img.height / 2;
  const radius = Math.min(img.width, img.height) / 2;

  return Array.from({ length: 6 }, (_, index) => {
    const canvas = document.createElement("canvas");
    canvas.width = TRIANGLE_SIZE;
    canvas.height = Math.ceil(TRIANGLE_HEIGHT);
    const ctx = canvas.getContext("2d")!;
    const source = hexWedge(cx, cy, radius, index);
    const matrix = affineTransform(source, CANONICAL_VERTICES);

    ctx.beginPath();
    ctx.moveTo(CANONICAL_VERTICES[0].x, CANONICAL_VERTICES[0].y);
    ctx.lineTo(CANONICAL_VERTICES[1].x, CANONICAL_VERTICES[1].y);
    ctx.lineTo(CANONICAL_VERTICES[2].x, CANONICAL_VERTICES[2].y);
    ctx.closePath();
    ctx.clip();
    ctx.setTransform(matrix);
    ctx.drawImage(img, 0, 0);
    return canvas;
  }) as TriangleImages;
}
