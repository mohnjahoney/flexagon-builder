import { createFileRoute, Link } from "@tanstack/react-router";
import { PRINTED_FOLDING_INSTRUCTIONS_ENABLED } from "@/lib/flexagon/features";

export const Route = createFileRoute("/how-to-fold")({
  head: () => ({
    meta: [
      { title: "How to fold — Hexaflexagon Atelier" },
      {
        name: "description",
        content:
          "Step-by-step instructions for folding the trihexaflexagon template into a working paper toy.",
      },
      { property: "og:title", content: "Folding instructions" },
      {
        property: "og:description",
        content: "Cut, crease, fold, glue. Six steps to a working trihexaflexagon.",
      },
    ],
  }),
  component: HowToFold,
});

const STEPS = [
  {
    n: "I",
    t: "Cut",
    b: "Cut around the solid outline of the strip. The shape will be a long parallelogram of ten triangles.",
  },
  {
    n: "II",
    t: "Score every fold",
    b: "Press a firm crease along every dashed line, in both directions. Flatten the strip again.",
  },
  {
    n: "III",
    t: "Fold the first thirds",
    b: "With Face I up, fold the strip so the back-side wedges marked II and III come together. You'll be left with a shorter zig-zag.",
  },
  {
    n: "IV",
    t: "Roll it home",
    b: "Continue folding into thirds until the strip wraps into a hexagon showing only Face I.",
  },
  {
    n: "V",
    t: "Glue the tab",
    b: "A small amount of glue on the tab marked at the end of the strip joins the loop. Hold it for a minute, then let it dry.",
  },
  {
    n: "VI",
    t: "Flex",
    b: "Pinch two adjacent triangles upward into a peak; press the opposite side down; open the hexagon from its centre. A new face appears.",
  },
];

function HowToFold() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="label-eyebrow hover:text-[var(--color-ink)]">
        ← back to the bench
      </Link>
      <h1 className="mt-6 font-display text-5xl">How to fold.</h1>
      <p className="mt-4 text-[var(--color-ink-soft)]">
        Six unhurried steps.
        {PRINTED_FOLDING_INSTRUCTIONS_ENABLED &&
          " The same instructions are printed at the end of your PDF."}
      </p>

      <ol className="mt-10 space-y-8">
        {STEPS.map((s) => (
          <li
            key={s.n}
            className="grid grid-cols-[3rem_1fr] gap-5 border-t border-[var(--color-hairline)] pt-6"
          >
            <span className="roman-numeral font-display text-3xl leading-none">{s.n}</span>
            <div>
              <h2 className="font-display text-2xl">{s.t}</h2>
              <p className="mt-2 text-[var(--color-ink-soft)]">{s.b}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
