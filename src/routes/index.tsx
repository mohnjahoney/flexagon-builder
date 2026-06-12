import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileCheck2, Loader2, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacePicker } from "@/components/flexagon/FacePicker";
import { FlexagonPreview } from "@/components/flexagon/FlexagonPreview";
import { buildFlexagonPdf, type BuiltPdf, type PdfBuildStage } from "@/lib/flexagon/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hexaflexagon Atelier — compose & print" },
      { name: "description", content: "Upload or photograph three images, crop each within a hexagon, and download a fold-ready trihexaflexagon template." },
      { property: "og:title", content: "Hexaflexagon Atelier" },
      { property: "og:description", content: "Compose your own trihexaflexagon from three images and print a fold-ready template." },
    ],
  }),
  component: Index,
});

function Index() {
  const [face1, setFace1] = useState<string | null>(null);
  const [face2, setFace2] = useState<string | null>(null);
  const [face3, setFace3] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pdf, setPdf] = useState<BuiltPdf | null>(null);
  const [stage, setStage] = useState<PdfBuildStage | "ready" | null>(null);

  const hasAny = !!(face1 || face2 || face3);
  const hasAll = !!(face1 && face2 && face3);
  const pdfDataUrl = pdf ? `data:application/pdf;base64,${pdf.base64}` : "";

  async function build() {
    setBusy(true);
    setStage("rendering-strip");
    try {
      const built = await buildFlexagonPdf({ face1, face2, face3 }, "hexaflexagon.pdf", setStage);
      setPdf(built);
      setStage("ready");
      toast.success(`PDF ready — ${(built.sizeBytes / 1024).toFixed(0)} KB`);
    } catch (err) {
      console.error("[flexagon] PDF generation failed:", err);
      setStage(null);
      toast.error("Sorry — the PDF could not be generated. Check the console for details.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen">
      <Header />

      <section className="mx-auto max-w-6xl px-6 pt-10 md:pt-16">
        <p className="label-eyebrow">A small folding atelier · est. today</p>
        <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[1.05] md:text-7xl">
          Compose a flexagon from three quiet images.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--color-ink-soft)]">
          A trihexaflexagon is a strip of ten triangles, folded into a hexagon that hides two further faces inside itself.
          Bring three pictures — uploaded or taken with your camera — and we'll lay out a print-ready template for the bench.
        </p>
      </section>

      <section className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-6 px-6 md:grid-cols-3">
        <FacePicker numeral="I" caption="the face shown at rest" value={face1} onChange={setFace1} />
        <FacePicker numeral="II" caption="revealed on the first flex" value={face2} onChange={setFace2} />
        <FacePicker numeral="III" caption="the hidden third face" value={face3} onChange={setFace3} />
      </section>

      <section className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 px-6 pb-10 md:grid-cols-[1.1fr_1fr]">
        <FlexagonPreview faces={{ face1, face2, face3 }} />

        <div className="sheet flex flex-col gap-6 p-8">
          <div>
            <span className="label-eyebrow">Step the last</span>
            <h2 className="mt-2 font-display text-3xl">Build the template</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">
              We compose the PDF here in your browser and hand it back to you. Inspect it page by page below, then save
              or open it in a new tab to print.
            </p>
          </div>
          <div className="space-y-2 border-t border-[var(--color-hairline)] pt-5">
            <Row label="Face I" present={!!face1} />
            <Row label="Face II" present={!!face2} />
            <Row label="Face III" present={!!face3} />
          </div>

          <Button
            onClick={build}
            disabled={busy}
            className="mt-2 h-12 w-full rounded-sm bg-[var(--color-oxblood)] text-[var(--color-paper)] hover:bg-[var(--color-oxblood)]/90"
          >
            {busy ? <Loader2 className="animate-spin" /> : pdf ? <RefreshCw /> : <Download />}
            {busy
              ? "Composing…"
              : pdf
                ? "Rebuild PDF"
                : hasAll
                  ? "Build PDF template"
                  : hasAny
                    ? "Build — placeholders for missing faces"
                    : "Build — blank template"}
          </Button>

          <Link to="/how-to-fold" className="text-center text-xs text-[var(--color-ink-soft)] underline-offset-4 hover:underline">
            Read the folding instructions
          </Link>
        </div>
      </section>

      {pdf && (
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="sheet flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <span className="label-eyebrow">PDF · ready</span>
                <h3 className="mt-1 font-display text-2xl">Inspect &amp; save</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={pdf.url}
                  download={pdf.filename}
                  className="inline-flex h-10 items-center gap-2 rounded-sm bg-[var(--color-ink)] px-4 text-sm text-[var(--color-paper)] hover:bg-[var(--color-ink)]/90"
                >
                  <Download className="h-4 w-4" />
                  Download {pdf.filename}
                </a>
                <a
                  href={pdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-sm border border-[var(--color-hairline)] px-4 text-sm text-[var(--color-ink)] hover:bg-[var(--color-paper-deep)]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in new tab
                </a>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-[var(--color-ink-soft)]">
              If the download button doesn't trigger (some sandboxed previews block it), the "Open in new tab" link
              always works — your browser's PDF viewer has its own save button.
            </p>
            <div className="h-[80vh] w-full overflow-hidden rounded-sm border border-[var(--color-hairline)] bg-[var(--color-paper-deep)]">
              <iframe
                title="Flexagon PDF preview"
                src={pdf.url}
                className="h-full w-full"
              />
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}

function Row({ label, present }: { label: string; present: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-display">{label}</span>
      <span className={present ? "text-[var(--color-oxblood)]" : "text-[var(--color-ink-soft)]"}>
        {present ? "ready" : "not yet chosen"}
      </span>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-[var(--color-hairline)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-baseline gap-3">
          <span className="font-display text-xl">Hexaflexagon</span>
          <span className="label-eyebrow">Atelier</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-[var(--color-ink-soft)]">
          <Link to="/about" className="hover:text-[var(--color-ink)]">About</Link>
          <Link to="/how-to-fold" className="hover:text-[var(--color-ink)]">How to fold</Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--color-hairline)]">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-8 text-xs text-[var(--color-ink-soft)] md:flex-row md:items-center">
        <span>Hand-set in Fraunces &amp; Inter Tight · printed on imagined paper.</span>
        <span className="font-display italic">— a small bindery for paper toys</span>
      </div>
    </footer>
  );
}
