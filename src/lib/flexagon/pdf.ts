import { jsPDF } from "jspdf";
import { renderSheets, type FaceImages, type PrintLayout } from "./render";

export type PdfBuildStage = "rendering-strip" | "assembling-pages" | "encoding-file";

export interface BuiltPdf {
  blob: Blob;
  url: string; // object URL — caller must revoke when done
  dataUrl: string; // portable fallback for sandboxed preview/new-window handoff
  filename: string;
  sizeBytes: number;
  layout: PrintLayout;
  previews: string[]; // one data URL per page (downscaled)
}

export interface BuildOptions {
  layout?: PrintLayout;
  dpi?: number;
  filename?: string;
  includeInstructions?: boolean;
}

/**
 * Build the trihexaflexagon PDF.
 *
 * The Lovable preview iframe sometimes blocks `pdf.save()` (synthetic
 * anchor-click inside a sandboxed frame). We return both a Blob and an
 * object URL so the caller can attach the URL to a real <a download>
 * element — which the browser treats as a user-initiated download and lets
 * through reliably.
 */
export async function buildFlexagonPdf(
  faces: FaceImages,
  opts: BuildOptions = {},
  onStage?: (stage: PdfBuildStage) => void,
): Promise<BuiltPdf> {
  const layout: PrintLayout = opts.layout ?? "double-sided";
  const dpi = opts.dpi ?? 600;
  const includeInstructions = opts.includeInstructions ?? true;
  const filename = opts.filename ?? `hexaflexagon-${layout}.pdf`;

  onStage?.("rendering-strip");
  const { pages, previews } = await renderSheets(faces, { layout, dpi });

  onStage?.("assembling-pages");
  const pdf = new jsPDF({ orientation: "landscape", unit: "in", format: "letter" });
  const W = 11, H = 8.5;

  pages.forEach((canvas, i) => {
    if (i > 0) pdf.addPage("letter", "landscape");
    // High-quality JPEG keeps the file size sane while preserving photo detail.
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, W, H, undefined, "FAST");
  });

  if (includeInstructions) {
    pdf.addPage("letter", "portrait");
    drawInstructions(pdf, layout);
  }

  onStage?.("encoding-file");
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const dataUrl = pdf.output("datauristring");

  return {
    blob,
    url,
    dataUrl,
    filename,
    sizeBytes: blob.size,
    layout,
    previews: previews.map((c) => c.toDataURL("image/jpeg", 0.82)),
  };
}

function drawInstructions(pdf: jsPDF, layout: PrintLayout) {
  pdf.setFillColor(250, 247, 239);
  pdf.rect(0, 0, 8.5, 11, "F");
  pdf.setTextColor(40, 32, 24);

  pdf.setFont("times", "normal");
  pdf.setFontSize(28);
  pdf.text("How to Fold", 1, 1.3);

  pdf.setFontSize(11);
  pdf.setTextColor(80, 70, 58);
  pdf.text("Trihexaflexagon — Hexaflexagon Atelier", 1, 1.65);

  pdf.setDrawColor(180, 168, 148);
  pdf.line(1, 1.85, 7.5, 1.85);

  pdf.setFontSize(12);
  pdf.setTextColor(40, 32, 24);

  const common = [
    "I.  Print at 100% scale (no fit-to-page) on standard letter paper.",
    "II. Cut around the outline of the strip; discard the surrounding paper.",
    "III. Score and crease every dashed fold line firmly in both directions.",
  ];
  const layoutSteps = layout === "single-sided"
    ? [
        "IV. Fold the sheet along the centre seam so the long edges meet — you now have a two-sided strip.",
        "V.  Optional: glue the two halves together for sturdiness, then fold the strip into thirds until a hexagon appears.",
        "VI. Apply glue to the half-triangle tab and press it onto the matching triangle at the other end.",
      ]
    : [
        "IV. Two pages: print double-sided (long-edge binding) so the back lines up with the front.",
        "V.  Fold the strip into thirds until you are left with a hexagon showing Face I.",
        "VI. Apply glue to the half-triangle tab on the back and press it onto the matching triangle.",
      ];
  const tail = [
    "VII. To flex: pinch two adjacent triangles upward into a peak, then push the opposite side down and open the hexagon from the centre. A new face appears.",
  ];

  let y = 2.3;
  for (const s of [...common, ...layoutSteps, ...tail]) {
    const wrapped = pdf.splitTextToSize(s, 6.5);
    pdf.text(wrapped, 1, y);
    y += wrapped.length * 0.22 + 0.18;
  }

  pdf.setFontSize(9);
  pdf.setTextColor(120, 108, 92);
  pdf.text("Faces I · II · III cycle as you flex.  Made with care.", 1, 10.5);
}
