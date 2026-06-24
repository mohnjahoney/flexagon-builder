import QRCode from "qrcode";

export const STUDIO_PIQUE_QR_COLORS = {
  ink: "#10223d",
  paper: "#ffffff",
} as const;

type DrawQROptions = {
  x: number;
  y: number;
  size: number;
  sizePx?: number;
  margin?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  darkColor?: string;
  lightColor?: string;
  amount?: number;
  note?: string;
};

export async function drawQR(
  ctx: CanvasRenderingContext2D,
  value: string,
  service: "venmo" | "url" | "text",
  options: DrawQROptions,
) {
  let target = value;
  if (service === "venmo") {
    const username = value
      .trim()
      .replace(/^@/, "")
      .replace(/^venmo:/i, "");
    const url = new URL(`https://venmo.com/u/${username}`);
    if (typeof options.amount === "number") url.searchParams.set("amount", String(options.amount));
    if (options.note) url.searchParams.set("note", options.note);
    target = url.toString();
  }

  const canvas = document.createElement("canvas");
  const size = options.sizePx ?? Math.ceil(options.size);
  canvas.width = size;
  canvas.height = size;
  await QRCode.toCanvas(canvas, target, {
    width: size,
    margin: options.margin ?? 2,
    errorCorrectionLevel: options.errorCorrectionLevel ?? "M",
    color: {
      dark: options.darkColor ?? STUDIO_PIQUE_QR_COLORS.ink,
      light: options.lightColor ?? STUDIO_PIQUE_QR_COLORS.paper,
    },
  });
  ctx.drawImage(canvas, options.x, options.y, options.size, options.size);
  return canvas;
}
