import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, FileCheck2, Loader2, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacePicker } from "@/components/flexagon/FacePicker";
import { FlexagonPreview } from "@/components/flexagon/FlexagonPreview";
import { buildFlexagonPdf, type BuiltPdf, type PdfBuildStage } from "@/lib/flexagon/pdf";
import type { PrintLayout } from "@/lib/flexagon/render";
import { toast } from "sonner";
import cat1 from "@/assets/test-cat-1.jpg";
import cat2 from "@/assets/test-cat-2.jpg";
import cat3 from "@/assets/test-cat-3.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hexaflexagon Atelier — compose & print" },
      { name: "description", content: "Upload three images, crop within a hexagon, and download a fold-ready trihexaflexagon template." },
      { property: "og:title", content: "Hexaflexagon Atelier" },
      { property: "og:description", content: "Compose your own trihexaflexagon from three images and print a fold-ready template." },
    ],
  }),
  component: Index,
});

function Index() {
  const [face1, setFace1] = useState<string | null>(cat1);
  const [face2, setFace2] = useState<string | null>(cat2);
  const [face3, setFace3] = useState<string | null>(cat3);
  const [layout, setLayout] = useState<PrintLayout>("double-sided");
  const [includeInstructions, setIncludeInstructions] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pdf, setPdf] = useState<BuiltPdf | null>(null);
  const [stage, setStage] = useState<PdfBuildStage | "ready" | null>(null);

  const faces = useMemo(() => ({ face1, face2, face3 }), [face1, face2, face3]);
  const hasAny = !!(face1 || face2 || face3);
  const hasAll = !!(face1 && face2 && face3);

  // Revoke object URLs whenever a new PDF replaces the old one (or on unmount).
  useEffect(() => {
    return () => {
      if (pdf?.url) URL.revokeObjectURL(pdf.url);
    };
  }, [pdf]);

  async function build() {
    if (busy) return;
    setBusy(true);
    setStage("rendering-strip");
    try {
      const built = await buildFlexagonPdf(faces, { layout, includeInstructions }, setStage);
      setPdf((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return built;
      });
      setStage("ready");
      toast.success(`PDF ready — ${(built.sizeBytes / 1024).toFixed(0)} KB · ${built.previews.length} page${built.previews.length > 1 ? "s" : ""}`);
    } catch (err) {
      console.error("[flexagon] PDF generation failed:", err);
      setStage(null);
      toast.error("Sorry — the PDF could not be generated. Check the console for details.");
    } finally {
      setBusy(false);
    }
  }

  function openPdfInNewTab(built: BuiltPdf) {
    const opened = window.open("", "_blank");
    if (!opened) {
      toast.error("The preview blocked the new tab. The PDF file is still ready to save locally.");
      return;
    }

    opened.opener = null;
    const safeName = built.filename.replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c] ?? c);
    opened.document.write(`<!doctype html><html><head><title>${safeName}</title><style>html,body{margin:0;height:100%;background:#faf7ef;font-family:system-ui,sans-serif}.bar{height:44px;display:flex;align-items:center;gap:12px;padding:0 14px;background:#2a2117;color:#faf7ef}.bar a{color:#faf7ef}embed{display:block;width:100%;height:calc(100% - 44px);border:0}</style></head><body><div class="bar"><strong>${safeName}</strong><a href="${built.dataUrl}" download="${safeName}">Download</a></div><embed src="${built.dataUrl}" type="application/pdf" /></body></html>`);
    opened.document.close();
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
        <FacePicker numeral="I" value={face1} onChange={setFace1} />
        <FacePicker numeral="II" value={face2} onChange={setFace2} />
        <FacePicker numeral="III" value={face3} onChange={setFace3} />
      </section>

      <section className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 px-6 pb-10 md:grid-cols-[1.1fr_1fr]">
        <FlexagonPreview faces={faces} />

        <div className="sheet flex flex-col gap-6 p-8">
          <div>
            <span className="label-eyebrow">Step the last</span>
            <h2 className="mt-2 font-display text-3xl">Build the template</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">
              Choose how you'll print, then we compose a 600 DPI PDF in your browser.
            </p>
          </div>

          <div className="space-y-2 border-t border-[var(--color-hairline)] pt-5">
            <Row label="Face I" present={!!face1} />
            <Row label="Face II" present={!!face2} />
            <Row label="Face III" present={!!face3} />
          </div>

          <LayoutToggle value={layout} onChange={setLayout} />

          <label className="flex items-start gap-3 border-t border-[var(--color-hairline)] pt-5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={includeInstructions}
              onChange={(e) => setIncludeInstructions(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--color-oxblood)]"
            />
            <span>
              <span className="font-display">Include folding instructions</span>
              <span className="ml-2 text-[var(--color-ink-soft)]">adds one portrait page at the end</span>
            </span>
          </label>

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
        </div>
      </section>

      {pdf && (
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="sheet flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <span className="label-eyebrow">PDF · ready · {pdf.layout}</span>
                <h3 className="mt-1 font-display text-2xl">Inspect &amp; save</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={pdf.url}
                  download={pdf.filename}
                  onClick={() => toast.message("Download requested. If Lovable's preview blocks it, this same link works when run locally.")}
                  className="inline-flex h-10 items-center gap-2 rounded-sm bg-[var(--color-ink)] px-4 text-sm text-[var(--color-paper)] hover:bg-[var(--color-ink)]/90"
                >
                  <Download className="h-4 w-4" />
                  Download {pdf.filename}
                </a>
                <button
                  type="button"
                  onClick={() => openPdfInNewTab(pdf)}
                  className="inline-flex h-10 items-center gap-2 rounded-sm border border-[var(--color-hairline)] px-4 text-sm text-[var(--color-ink)] hover:bg-[var(--color-paper-deep)]"
                >
                  <Printer className="h-4 w-4" />
                  Open in new tab
                </button>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-[var(--color-ink-soft)]">
              Proof images below are the exact rendered pages encoded into the PDF (600 DPI source, downscaled here for the screen).
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {pdf.previews.map((src, i) => (
                <ProofPage key={i} label={`Page ${i + 1}`} src={src} />
              ))}
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

function LayoutToggle({ value, onChange }: { value: PrintLayout; onChange: (v: PrintLayout) => void }) {
  const options: Array<{ id: PrintLayout; title: string; sub: string }> = [
    {
      id: "double-sided",
      title: "Double-sided",
      sub: "Two pages. Print duplex (long edge) so back aligns with front.",
    },
    {
      id: "single-sided",
      title: "Single-sided",
      sub: "One page. Cut a double-wide strip, fold in half along the seam.",
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-2 border-t border-[var(--color-hairline)] pt-5 sm:grid-cols-2">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-sm border p-3 text-left text-xs leading-relaxed transition-colors ${
              active
                ? "border-[var(--color-oxblood)] bg-[var(--color-paper-deep)]"
                : "border-[var(--color-hairline)] hover:border-[var(--color-ink-soft)]"
            }`}
          >
            <div className={`font-display text-sm ${active ? "text-[var(--color-oxblood)]" : ""}`}>{opt.title}</div>
            <div className="mt-1 text-[var(--color-ink-soft)]">{opt.sub}</div>
          </button>
        );
      })}
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
          <a href="/how-to-fold" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-ink)]">How to fold ↗</a>
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
