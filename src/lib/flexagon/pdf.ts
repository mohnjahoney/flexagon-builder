import { jsPDF } from "jspdf";
import { renderSheets, type FaceImages } from "./render";

export type PdfBuildStage = "rendering-strip" | "assembling-pages" | "encoding-file";

export interface BuiltPdf {
  blob: Blob;
  base64: string;
  filename: string;
  sizeBytes: number;
  previews: {
    front: string;
    back: string;
  };
}

/**
 * Build the trihexaflexagon PDF and return a Blob + object URL.
 *
 * We intentionally do NOT call `pdf.save()` here. In Lovable's sandboxed
 * preview iframe the synthetic anchor click that jsPDF performs is often
 * blocked silently — the file is generated but never reaches the user.
 * Returning the blob lets the caller hand the user an explicit
 * <a download>, an `iframe` preview, and an "open in new tab" link, all of
 * which work inside the sandbox.
 */
export async function buildFlexagonPdf(
  faces: FaceImages,
  filename = "hexaflexagon.pdf",
  onStage?: (stage: PdfBuildStage) => void,
): Promise<BuiltPdf> {
  onStage?.("rendering-strip");
  const { front, back } = await renderSheets(faces);

  onStage?.("assembling-pages");
  const pdf = new jsPDF({ orientation: "landscape", unit: "in", format: "letter" });
  const W = 11, H = 8.5;

  pdf.addImage(front.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, W, H);
  pdf.addPage("letter", "landscape");
  pdf.addImage(back.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, W, H);

  pdf.addPage("letter", "portrait");
  drawInstructions(pdf);

  onStage?.("encoding-file");
  const blob = pdf.output("blob");
  const base64 = await blobToBase64(blob);
  return {
    blob,
    base64,
    filename,
    sizeBytes: blob.size,
    previews: {
      front: front.toDataURL("image/jpeg", 0.82),
      back: back.toDataURL("image/jpeg", 0.82),
    },
  };
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function drawInstructions(pdf: jsPDF) {
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

  const steps = [
    "I.  Cut around the solid outline of the strip. Discard the surrounding paper.",
    "II. Crease every dashed fold line firmly in both directions, then flatten the strip again.",
    "III. With Face I (front) toward you, fold the strip so the back-side wedges marked II and III come together.",
    "IV. Continue folding into thirds until you are left with a hexagon showing Face I.",
    "V.  Apply a small amount of glue to the tab marked on the back and press it onto the corresponding triangle. Let dry.",
    "VI. To flex: pinch two adjacent triangles upward into a peak, then push the opposite side down and open the hexagon from the centre. A new face appears.",
  ];
  let y = 2.3;
  for (const s of steps) {
    const wrapped = pdf.splitTextToSize(s, 6.5);
    pdf.text(wrapped, 1, y);
    y += wrapped.length * 0.22 + 0.18;
  }

  pdf.setFontSize(9);
  pdf.setTextColor(120, 108, 92);
  pdf.text("Faces I · II · III cycle as you flex.  Made with care.", 1, 10.5);
}
