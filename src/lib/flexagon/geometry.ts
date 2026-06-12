// Trihexaflexagon strip geometry.
//
// A trihexaflexagon is folded from a strip of 10 equilateral triangles
// (plus a glue tab). Triangles alternate apex-up / apex-down across the row.
// When folded, the strip forms a hexagon with three discoverable faces.
//
// Canonical labeling (Martin Gardner):
//   front: [1, 2, 1, 2, 1, 2, 1, 2, 1, 2]
//   back:  [3, 3, 1, 1, 2, 2, 3, 3, 1, 1]
// Glue the 10th triangle's back onto the 1st triangle's back.
//
// For image reassembly we treat each face's hexagonal crop as six wedges
// (60° sectors numbered 0..5 starting at the rightmost edge, going CCW).
// Each strip triangle is assigned a wedge index for the face it carries,
// in the order those triangles appear on that face when folded.

export const SQRT3 = Math.sqrt(3);

export type FaceId = 1 | 2 | 3;

export interface StripTriangle {
  /** 0..9 — index along the strip */
  index: number;
  /** true if the triangle's apex points up on the front layout */
  apexUp: boolean;
  /** face id this triangle shows on the front */
  frontFace: FaceId;
  /** face id this triangle shows on the back */
  backFace: FaceId;
  /** which wedge (0..5) of the front face this triangle is */
  frontWedge: number;
  /** which wedge (0..5) of the back face this triangle is */
  backWedge: number;
}

// Order in which strip triangles map to wedges on each face when folded.
// (Approximation good enough for visual reassembly — exact flexagon
//  wedge permutations differ at flex states but the printed strip stays put.)
const FRONT_LABELS: FaceId[] = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
const BACK_LABELS: FaceId[] = [3, 3, 1, 1, 2, 2, 3, 3, 1, 1];

function assignWedges(labels: FaceId[]): number[] {
  const counters: Record<FaceId, number> = { 1: 0, 2: 0, 3: 0 };
  return labels.map((f) => {
    const w = counters[f] % 6;
    counters[f] += 1;
    return w;
  });
}

export const STRIP: StripTriangle[] = (() => {
  const frontWedges = assignWedges(FRONT_LABELS);
  const backWedges = assignWedges(BACK_LABELS);
  return Array.from({ length: 10 }, (_, i) => ({
    index: i,
    apexUp: i % 2 === 0,
    frontFace: FRONT_LABELS[i],
    backFace: BACK_LABELS[i],
    frontWedge: frontWedges[i],
    backWedge: backWedges[i],
  }));
})();

/**
 * Compute the 3 vertex coordinates of triangle `i` in the strip,
 * given an edge length `s` and a top-left origin.
 * Front layout: triangles arranged left-to-right, sharing edges.
 */
export function triangleVertices(
  i: number,
  s: number,
  originX: number,
  originY: number,
  mirror = false,
): [Point, Point, Point] {
  const h = (s * SQRT3) / 2;
  const xLeft = originX + (i * s) / 2;
  const apexUp = i % 2 === 0;
  const verts: [Point, Point, Point] = apexUp
    ? [
        { x: xLeft, y: originY + h },
        { x: xLeft + s, y: originY + h },
        { x: xLeft + s / 2, y: originY },
      ]
    : [
        { x: xLeft, y: originY },
        { x: xLeft + s, y: originY },
        { x: xLeft + s / 2, y: originY + h },
      ];
  if (!mirror) return verts;
  // Reflect horizontally about the centre of the strip outline (width = 6s,
  // including the half-triangle glue tab). Reflected x = 2*(originX + 3s) - x.
  const axis = originX + 3 * s;
  return verts.map((p) => ({ x: 2 * axis - p.x, y: p.y })) as [Point, Point, Point];
}

export interface Point {
  x: number;
  y: number;
}

/** Hex face wedge polygon: center + two outer vertices for sector `k` (0..5). */
export function hexWedge(cx: number, cy: number, r: number, k: number): [Point, Point, Point] {
  const a0 = (-Math.PI / 2) + (k * Math.PI) / 3; // start at top, go CW
  const a1 = a0 + Math.PI / 3;
  return [
    { x: cx, y: cy },
    { x: cx + r * Math.cos(a0), y: cy + r * Math.sin(a0) },
    { x: cx + r * Math.cos(a1), y: cy + r * Math.sin(a1) },
  ];
}

/** Hexagon outline (flat top). */
export function hexagonPoints(cx: number, cy: number, r: number): Point[] {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (-Math.PI / 2) + (k * Math.PI) / 3;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

/** Total strip dimensions for a given edge length. */
export function stripBounds(s: number) {
  const h = (s * SQRT3) / 2;
  // 10 triangles share edges; total width = (10+1) * s/2 = 5.5s
  return { width: 5.5 * s, height: h };
}
