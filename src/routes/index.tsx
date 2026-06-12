import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacePicker } from "@/components/flexagon/FacePicker";
import { FlexagonPreview } from "@/components/flexagon/FlexagonPreview";
import { buildAndSaveFlexagonPdf } from "@/lib/flexagon/pdf";
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

  const hasAny = !!(face1 || face2 || face3);
  const hasAll = !!(face1 && face2 && face3);

  async function download() {
    setBusy(true);
    try {
      await buildAndSaveFlexagonPdf({ face1, face2, face3 }, "hexaflexagon.pdf");
    } catch (err) {
      console.error("[flexagon] PDF generation failed:", err);
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

      <section className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 px-6 pb-24 md:grid-cols-[1.1fr_1fr]">
        <FlexagonPreview faces={{ face1, face2, face3 }} />

        <div className="sheet flex flex-col gap-6 p-8">
          <div>
            <span className="label-eyebrow">Step the last</span>
            <h2 className="mt-2 font-display text-3xl">Print the template</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">
              The PDF prints across two landscape sheets — front and back — followed by a folding broadside.
              Cut along the solid line, crease every dashed line, fold into thirds, glue the marked tab.
            </p>
          </div>
          <div className="space-y-2 border-t border-[var(--color-hairline)] pt-5">
            <Row label="Face I" present={!!face1} />
            <Row label="Face II" present={!!face2} />
            <Row label="Face III" present={!!face3} />
          </div>

          <Button
            onClick={download}
            disabled={busy}
            className="mt-2 h-12 w-full rounded-sm bg-[var(--color-oxblood)] text-[var(--color-paper)] hover:bg-[var(--color-oxblood)]/90"
          >
            {busy ? <Loader2 className="animate-spin" /> : <Download />}
            {hasAll ? "Download PDF template" : hasAny ? "Download — placeholders for missing faces" : "Download — blank template"}
          </Button>

          <Link to="/how-to-fold" className="text-center text-xs text-[var(--color-ink-soft)] underline-offset-4 hover:underline">
            Read the folding instructions
          </Link>
        </div>
      </section>

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
