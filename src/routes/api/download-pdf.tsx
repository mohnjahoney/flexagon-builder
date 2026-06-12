import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/download-pdf")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const base64 = String(form.get("base64") ?? "");
        const requestedName = String(form.get("filename") ?? "hexaflexagon.pdf");
        const mode = form.get("mode") === "inline" ? "inline" : "attachment";
        const filename = sanitizeFilename(requestedName);

        if (!base64 || base64.length > 24_000_000) {
          return new Response("Invalid PDF payload", { status: 400 });
        }

        try {
          const bytes = base64ToBytes(base64);
          return new Response(bytes, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `${mode}; filename="${filename}"`,
              "Cache-Control": "no-store",
            },
          });
        } catch {
          return new Response("Invalid PDF encoding", { status: 400 });
        }
      },
    },
  },
});

function sanitizeFilename(filename: string) {
  const safe = filename.replace(/[^a-z0-9._-]/gi, "-").replace(/-+/g, "-").slice(0, 80);
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe || "hexaflexagon"}.pdf`;
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}