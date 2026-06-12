import { useEffect, useRef, useState } from "react";
import { renderSheets, type FaceImages } from "@/lib/flexagon/render";
import { STRIP, triangleVertices } from "@/lib/flexagon/geometry";

interface FlexagonPreviewProps {
  faces: FaceImages;
}

type Side = "front" | "back";

/**
 * Honest preview: renders the actual printed strip the user is about to
 * download, so they can see how each face is sliced into 6 wedges scattered
 * across the 10 triangles. Toggle between the front and back of the sheet.
 */
export function FlexagonPreview({ faces }: FlexagonPreviewProps) {
  const [side, setSide] = useState<Side>("front");
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setBusy(true);
    let cancelled = false;
    (async () => {
      try {
        const { front, back } = await renderSheets(faces);
        if (cancelled || id !== reqId.current) return;
        setFrontUrl(front.toDataURL("image/jpeg", 0.7));
        setBackUrl(back.toDataURL("image/jpeg", 0.7));
      } finally {
        if (!cancelled && id === reqId.current) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [faces.face1, faces.face2, faces.face3]);

  const src = side === "front" ? frontUrl : backUrl;
  const triangles = previewTriangles(side);

  return (
    <div className="sheet flex flex-col gap-5 p-8">
      <div className="flex w-full items-baseline justify-between">
        <span className="label-eyebrow">Preview · printed strip</span>
        <div className="flex items-center gap-1 rounded-sm border border-[var(--color-hairline)] p-0.5">
          {(["front", "back"] as Side[]).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={`px-3 py-1 text-xs uppercase tracking-wider transition-colors ${
                side === s
                  ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                  : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="relative aspect-[11/8.5] w-full overflow-hidden bg-[var(--color-paper-deep)]">
        {src ? (
          <>
            <img src={src} alt={`${side} of strip`} className="flexagon-breathe h-full w-full object-contain" />
            <svg
              viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {triangles.map((points, index) => (
                <polygon
                  key={`${side}-${index}`}
                  points={points}
                  className="flexagon-triangle-wake"
                  style={{ animationDelay: `${index * 0.45}s` }}
                />
              ))}
            </svg>
          </>
        ) : (
          <div className="grid h-full w-full place-items-center font-display text-sm italic text-[var(--color-ink-soft)]">
            composing…
          </div>
        )}
        {busy && src && (
          <div className="absolute right-2 top-2 rounded-sm bg-[var(--color-ink)]/80 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-paper)]">
            updating
          </div>
        )}
      </div>

      <p className="text-xs leading-relaxed text-[var(--color-ink-soft)]">
        Each face is sliced into six 60° wedges and scattered across the strip — front triangles alternate
        face I and II; the back carries II, III, and the second halves of I. When folded into thirds, the
        scattered wedges meet up to recompose each hexagonal face.
      </p>
    </div>
  );
}

const PAGE_W = 3300;
const PAGE_H = 2550;
const DPI = 300;

function previewTriangles(side: Side) {
  const s = 1.7 * DPI;
  const stripW = 5.5 * s;
  const stripH = (s * Math.sqrt(3)) / 2;
  const ox = (PAGE_W - stripW) / 2;
  const oy = (PAGE_H - stripH) / 2;

  return STRIP.map((triangle) =>
    triangleVertices(triangle.index, s, ox, oy, side === "back")
      .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(" "),
  );
}
