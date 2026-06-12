import { useEffect, useRef, useState } from "react";
import { renderSheets, type FaceImages } from "@/lib/flexagon/render";

interface FlexagonPreviewProps {
  faces: FaceImages;
}

/**
 * Honest preview: renders the actual printed double-sided pages at preview
 * DPI so the user sees how each face is scattered as six 60° wedges across
 * the 10 triangles of the strip.
 */
export function FlexagonPreview({ faces }: FlexagonPreviewProps) {
  const [side, setSide] = useState<0 | 1>(0);
  const [urls, setUrls] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setBusy(true);
    let cancelled = false;
    (async () => {
      try {
        // Use a low preview DPI; we only need to look at it on a screen.
        const { previews } = await renderSheets(faces, { dpi: 150, layout: "double-sided" });
        if (cancelled || id !== reqId.current) return;
        setUrls(previews.map((c) => c.toDataURL("image/jpeg", 0.78)));
      } finally {
        if (!cancelled && id === reqId.current) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [faces.face1, faces.face2, faces.face3]);

  const src = urls?.[side] ?? null;

  return (
    <div className="sheet flex flex-col gap-5 p-8">
      <div className="flex w-full items-baseline justify-between">
        <span className="label-eyebrow">Preview · printed strip</span>
        <div className="flex items-center gap-1 rounded-sm border border-[var(--color-hairline)] p-0.5">
          {[
            { id: 0 as const, label: "front" },
            { id: 1 as const, label: "back" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSide(s.id)}
              className={`px-3 py-1 text-xs uppercase tracking-wider transition-colors ${
                side === s.id
                  ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                  : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative aspect-[11/8.5] w-full overflow-hidden bg-[var(--color-paper-deep)]">
        {src ? (
          <img src={src} alt={`page ${side + 1} of strip`} className="flexagon-breathe h-full w-full object-contain" />
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
        Each face is sliced into six 60° wedges and scattered across the strip. When folded into thirds, the wedges
        recompose each hexagonal face.
      </p>
    </div>
  );
}
