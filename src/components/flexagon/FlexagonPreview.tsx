import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface FlexagonPreviewProps {
  faces: { face1: string | null; face2: string | null; face3: string | null };
}

const ORDER: Array<{ id: 1 | 2 | 3; numeral: "I" | "II" | "III" }> = [
  { id: 1, numeral: "I" },
  { id: 2, numeral: "II" },
  { id: 3, numeral: "III" },
];

export function FlexagonPreview({ faces }: FlexagonPreviewProps) {
  const [i, setI] = useState(0);
  const current = ORDER[i];
  const src = current.id === 1 ? faces.face1 : current.id === 2 ? faces.face2 : faces.face3;

  function step(d: 1 | -1) {
    setI((p) => (p + d + ORDER.length) % ORDER.length);
  }

  return (
    <div className="sheet flex flex-col items-center gap-5 p-8">
      <div className="flex w-full items-baseline justify-between">
        <span className="label-eyebrow">Preview · folded face</span>
        <span className="roman-numeral text-2xl">{current.numeral}</span>
      </div>

      <div className="relative aspect-square w-full max-w-[360px]">
        {/* hex frame */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <defs>
            <clipPath id="hex-clip">
              <polygon points="50,0 100,25 100,75 50,100 0,75 0,25" />
            </clipPath>
          </defs>
          {src ? (
            <image
              href={src}
              x="0"
              y="0"
              width="100"
              height="100"
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#hex-clip)"
            />
          ) : (
            <polygon
              points="50,0 100,25 100,75 50,100 0,75 0,25"
              fill="oklch(0.945 0.014 82)"
            />
          )}
          {/* triangle wedge rules */}
          <g stroke="oklch(0.30 0.02 60 / 0.35)" strokeWidth="0.3" fill="none">
            <line x1="50" y1="50" x2="50" y2="0" />
            <line x1="50" y1="50" x2="100" y2="25" />
            <line x1="50" y1="50" x2="100" y2="75" />
            <line x1="50" y1="50" x2="50" y2="100" />
            <line x1="50" y1="50" x2="0" y2="75" />
            <line x1="50" y1="50" x2="0" y2="25" />
            <polygon points="50,0 100,25 100,75 50,100 0,75 0,25" />
          </g>
        </svg>
        {!src && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center font-display text-sm italic text-[var(--color-ink-soft)]">
            face {current.numeral} not yet chosen
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <button onClick={() => step(-1)} className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors" aria-label="previous face">
          <ChevronLeft />
        </button>
        <div className="flex items-center gap-2">
          {ORDER.map((f, idx) => (
            <button
              key={f.id}
              onClick={() => setI(idx)}
              className={`h-2 w-2 rounded-full transition-all ${idx === i ? "bg-[var(--color-oxblood)] w-6" : "bg-[var(--color-hairline)]"}`}
              aria-label={`Show face ${f.numeral}`}
            />
          ))}
        </div>
        <button onClick={() => step(1)} className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors" aria-label="next face">
          <ChevronRight />
        </button>
      </div>
      <p className="text-center text-xs text-[var(--color-ink-soft)]">
        flex the printed flexagon to discover each face in turn
      </p>
    </div>
  );
}
