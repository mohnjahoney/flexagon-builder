import { useEffect, useRef, useState } from "react";
import type { FaceImages } from "@/lib/flexagon/render";
import { extractTriangleImages, type TriangleImages } from "@/lib/flexagon/triangles";

interface TriangleArrayPanelProps {
  faces: FaceImages;
}

type FaceKey = keyof FaceImages;

const ROWS: Array<{ key: FaceKey; label: string }> = [
  { key: "face1", label: "Face I" },
  { key: "face2", label: "Face II" },
  { key: "face3", label: "Face III" },
];

async function loadTriangles(src: string | null): Promise<TriangleImages | null> {
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(extractTriangleImages(img));
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function TriangleArrayPanel({ faces }: TriangleArrayPanelProps) {
  const [rows, setRows] = useState<Record<FaceKey, TriangleImages | null>>({
    face1: null,
    face2: null,
    face3: null,
  });
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    Promise.all([
      loadTriangles(faces.face1),
      loadTriangles(faces.face2),
      loadTriangles(faces.face3),
    ]).then(([face1, face2, face3]) => {
      if (id !== requestId.current) return;
      setRows({ face1, face2, face3 });
    });
  }, [faces.face1, faces.face2, faces.face3]);

  return (
    <section className="sheet mx-auto mt-10 max-w-6xl px-6 py-8">
      <div>
        <span className="label-eyebrow">Temporary diagnostic</span>
        <h2 className="mt-2 font-display text-3xl">Extracted triangle arrays</h2>
        <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
          Array positions 0–5 are displayed as 1–6. The vertex nearest the original image center
          points up.
        </p>
      </div>

      <div className="mt-7 space-y-8">
        {ROWS.map((row) => (
          <div key={row.key} className="grid gap-3 md:grid-cols-[5rem_1fr] md:items-center">
            <h3 className="font-display text-lg">{row.label}</h3>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              {Array.from({ length: 6 }, (_, index) => {
                const triangle = rows[row.key]?.[index];
                return (
                  <figure key={index} className="min-w-0 text-center">
                    <div className="relative aspect-[2/1.732] w-full bg-[var(--color-paper-deep)]">
                      {triangle && (
                        <img
                          src={triangle.toDataURL("image/png")}
                          alt={`${row.label} triangle ${index + 1}`}
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                    <figcaption className="mt-1 font-mono text-xs text-[var(--color-ink-soft)]">
                      [{index}] → {index + 1}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
