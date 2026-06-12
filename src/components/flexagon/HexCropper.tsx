import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface HexCropperProps {
  open: boolean;
  src: string | null;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}

const OUT_SIZE = 1024;

export function HexCropper({ open, src, onCancel, onConfirm }: HexCropperProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!src) return setImg(null);
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => {
      setImg(i);
      // initial scale: cover the hex
      const stage = stageRef.current;
      if (stage) {
        const w = stage.clientWidth, h = stage.clientHeight;
        const s = Math.max(w / i.width, h / i.height) * 1.05;
        setScale(s);
        setTx(0);
        setTy(0);
      }
    };
    i.src = src;
  }, [src]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragging.current = { x: e.clientX - tx, y: e.clientY - ty };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setTx(e.clientX - dragging.current.x);
    setTy(e.clientY - dragging.current.y);
  }
  function onPointerUp() {
    dragging.current = null;
  }

  function handleConfirm() {
    if (!img || !stageRef.current) return;
    const stage = stageRef.current;
    const sw = stage.clientWidth, sh = stage.clientHeight;
    // Render at OUT_SIZE square
    const canvas = document.createElement("canvas");
    canvas.width = OUT_SIZE;
    canvas.height = OUT_SIZE;
    const ctx = canvas.getContext("2d")!;
    // paper background
    ctx.fillStyle = "#faf7ef";
    ctx.fillRect(0, 0, OUT_SIZE, OUT_SIZE);

    // hex clip (flat-top hex inscribed in square)
    const cx = OUT_SIZE / 2, cy = OUT_SIZE / 2;
    const r = OUT_SIZE / 2;
    ctx.save();
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 3;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.clip();

    // Map stage coords to canvas coords.
    const k = OUT_SIZE / Math.min(sw, sh);
    const drawW = img.width * scale * k;
    const drawH = img.height * scale * k;
    const dx = (OUT_SIZE - drawW) / 2 + tx * k;
    const dy = (OUT_SIZE - drawH) / 2 + ty * k;
    ctx.drawImage(img, dx, dy, drawW, drawH);
    ctx.restore();

    onConfirm(canvas.toDataURL("image/jpeg", 0.92));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-xl bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Crop within the hexagon</DialogTitle>
        </DialogHeader>
        <div
          ref={stageRef}
          className="relative mx-auto h-[420px] w-[420px] cursor-grab active:cursor-grabbing select-none overflow-hidden bg-[oklch(0.945_0.014_82)]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            WebkitMaskImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><polygon points='50,0 100,25 100,75 50,100 0,75 0,25' fill='black'/></svg>\")",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "100% 100%",
            maskImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><polygon points='50,0 100,25 100,75 50,100 0,75 0,25' fill='black'/></svg>\")",
            maskRepeat: "no-repeat",
            maskSize: "100% 100%",
          }}
        >
          {img && (
            <img
              src={img.src}
              draggable={false}
              alt=""
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: img.width * scale,
                height: img.height * scale,
                transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`,
                pointerEvents: "none",
              }}
            />
          )}
        </div>
        <div className="flex items-center gap-3 pt-2">
          <span className="label-eyebrow">Zoom</span>
          <input
            type="range"
            min={0.2}
            max={4}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="flex-1 accent-[var(--color-oxblood)]"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleConfirm} className="bg-[var(--color-oxblood)] text-[var(--color-paper)] hover:bg-[var(--color-oxblood)]/90">
            Use this crop
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
