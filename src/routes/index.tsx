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

          {stage && <BuildStages stage={stage} />}

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
                <PdfPostForm pdf={pdf} mode="attachment" />
                <PdfPostForm pdf={pdf} mode="inline" />
              </div>
            </div>
            <p className="text-xs leading-relaxed text-[var(--color-ink-soft)]">
              The empty PDF iframe is gone: these proof images are the exact rendered pages that are encoded into the PDF.
              Saving uses a top-level file response instead of a blocked blob URL or popup.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <ProofPage label="Page 1 · front" src={pdf.previews.front} />
              <ProofPage label="Page 2 · back" src={pdf.previews.back} />
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

function BuildStages({ stage }: { stage: PdfBuildStage | "ready" }) {
  const stages: Array<{ id: PdfBuildStage | "ready"; label: string }> = [
    { id: "rendering-strip", label: "Render strip" },
    { id: "assembling-pages", label: "Assemble pages" },
    { id: "encoding-file", label: "Encode file" },
    { id: "ready", label: "Ready" },
  ];
  const activeIndex = stages.findIndex((item) => item.id === stage);

  return (
    <div className="grid grid-cols-2 gap-2 border-t border-[var(--color-hairline)] pt-4 text-xs md:grid-cols-4">
      {stages.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2 text-[var(--color-ink-soft)]">
          <span
            className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${
              index <= activeIndex
                ? "border-[var(--color-oxblood)] bg-[var(--color-oxblood)] text-[var(--color-paper)]"
                : "border-[var(--color-hairline)]"
            }`}
          >
            {index < activeIndex || stage === "ready" ? "✓" : index + 1}
          </span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function PdfPostForm({ pdf, mode }: { pdf: BuiltPdf; mode: "attachment" | "inline" }) {
  const isDownload = mode === "attachment";

  return (
    <form action="/api/download-pdf" method="post" target={isDownload ? undefined : "_blank"}>
      <input type="hidden" name="filename" value={pdf.filename} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="base64" value={pdf.base64} />
      <button
        type="submit"
        className={`inline-flex h-10 items-center gap-2 rounded-sm px-4 text-sm ${
          isDownload
            ? "bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-ink)]/90"
            : "border border-[var(--color-hairline)] text-[var(--color-ink)] hover:bg-[var(--color-paper-deep)]"
        }`}
      >
        {isDownload ? <Download className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
        {isDownload ? `Download ${pdf.filename}` : "Open printable PDF"}
      </button>
    </form>
  );
}

function ProofPage({ label, src }: { label: string; src: string }) {
  return (
    <figure className="border border-[var(--color-hairline)] bg-[var(--color-paper-deep)] p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-[var(--color-ink-soft)]">
        <FileCheck2 className="h-4 w-4 text-[var(--color-oxblood)]" />
        <figcaption>{label}</figcaption>
      </div>
      <img src={src} alt={`${label} proof`} className="w-full bg-[var(--color-paper)]" />
    </figure>
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
