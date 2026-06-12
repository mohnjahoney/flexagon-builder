
## Goal

A single-page web app that turns 3 user-supplied images into a print-and-fold trihexaflexagon. Users upload from disk or capture from camera, crop/zoom each image inside a hexagon, preview the three resulting faces in the browser, then download a PDF template that folds into a working flexagon.

## Aesthetic direction — "Atelier"

Light touch, but committed from the first paint. Reads like a small bookbindery's worktable, not a SaaS dashboard.

- **Palette**: warm off-white paper (`oklch(0.97 0.012 85)`), deep ink (`oklch(0.20 0.015 60)`), a single accent of oxblood/sealing-wax red (`oklch(0.46 0.14 25)`), muted graphite for rules and hairlines. No gradients, no glow, no purple.
- **Typography**: a serif display for headings (Fraunces or EB Garamond) paired with a quiet humanist sans for UI (Inter Tight or similar). Small caps and generous tracking on section labels. Load via `<link>` in `__root.tsx`; register family names in `@theme` in `src/styles.css`.
- **Texture**: a faint paper grain (subtle SVG noise as a fixed background layer at ~5% opacity) and hairline 1px rules instead of heavy borders. Cards are flat with a single soft drop shadow that mimics a sheet resting on a desk.
- **Detail flourishes**: numbered step headings ("I · II · III"), fold/cut lines previewed as actual dashed and solid hairlines, a small letterpress-style maker's mark in the footer. No emojis, no icon noise.

Goal is restraint and craft, not maximalism — easy to maintain, hard to mistake for a template.

## User flow

1. **Choose 3 images** — for each of Face I / II / III: "Upload" (file input) or "Use camera" (getUserMedia + capture to canvas). Camera falls back to upload if unavailable or denied.
2. **Crop each face** — modal with a hexagonal crop frame. User pans and zooms; the hexagon-shaped crop is what gets used.
3. **Preview** — three reconstructed hexagon faces shown together; a control cycles I → II → III to mimic the discovery of hidden faces.
4. **Download PDF** — print-ready Letter and A4, with the 10-triangle strip, dashed fold lines, solid cut outline, glue tab marked, and brief fold instructions on page two.

No accounts, no persistence — everything stays in the browser for the session.

## How the slicing works (technical section)

A trihexaflexagon is built from a strip of 10 equilateral triangles. When folded, it forms a hexagon with 3 discoverable faces. Each face is a hexagon made of 6 triangular wedges, and each wedge corresponds to one specific triangle on the strip with a specific rotation.

For each face image:
- Take the hexagonal crop.
- Cut it into 6 equilateral triangle wedges around the hexagon's center (60° each).
- Place each wedge into its assigned strip triangle, rotated so that when folded the wedges reassemble into the original hexagon.

The strip is two-sided: front carries wedges from Face I and some of Face II; back carries the rest of II and all of III. We use the standard published triangle-to-face mapping for a trihexaflexagon so the fold actually works.

Rendering uses an HTMLCanvasElement at 300 DPI. The same canvases are dropped into the PDF via `jspdf` (`addImage` for the front, new page for the back, third page for instructions).

## Tech

- TanStack Start, existing shadcn UI (Button, Dialog, Input, Card).
- Routes:
  - Replace placeholder in `src/routes/index.tsx` with the builder.
  - `src/routes/about.tsx` — what a hexaflexagon is + credits.
  - `src/routes/how-to-fold.tsx` — folding instructions, also embedded in the PDF.
  Each route gets its own `head()` with unique title/description/og.
- New modules:
  - `src/lib/flexagon/geometry.ts` — hex/triangle math, strip layout, triangle-to-face mapping.
  - `src/lib/flexagon/render.ts` — canvas compositor returning front + back canvases.
  - `src/lib/flexagon/pdf.ts` — jspdf builder.
  - `src/components/flexagon/HexCropper.tsx` — pan/zoom cropper with hex mask (pointer events + CSS transform; no extra dep).
  - `src/components/flexagon/CameraCapture.tsx` — getUserMedia + snapshot, graceful fallback to upload.
  - `src/components/flexagon/FacePicker.tsx` — per-face card with Upload / Camera and thumbnail.
  - `src/components/flexagon/FlexagonPreview.tsx` — SVG hexagon with I/II/III toggle.
- Design tokens added to `src/styles.css` under `@theme inline` (paper, ink, oxblood, graphite, hairline) plus a `--shadow-sheet` token. Fonts loaded via `<link>` in `__root.tsx`.
- New dep: `jspdf`. No image-processing libs needed beyond native Canvas.
- Fully client-side. No Cloud, no server functions.

## Out of scope

- Hexahexaflexagon (6 faces) — leave room behind a future type selector.
- Saving/sharing across sessions.
- Animated 3D fold simulation — flat face previews only.

## Deliverables checklist

- Atelier visual system in `src/styles.css` (tokens + font link) applied across the app.
- Builder page: three face slots, upload + camera, hex crop modal.
- In-browser preview cycling I/II/III.
- "Download PDF" producing a correct, foldable template at Letter and A4.
- Placeholder index replaced; About and How-to-Fold routes added with proper per-route metadata.
