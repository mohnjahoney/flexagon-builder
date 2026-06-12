import { useRef, useState } from "react";
import { Camera, ImagePlus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HexCropper } from "./HexCropper";
import { CameraCapture } from "./CameraCapture";

interface FacePickerProps {
  numeral: "I" | "II" | "III";
  caption: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

export function FacePicker({ numeral, caption, value, onChange }: FacePickerProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [camOpen, setCamOpen] = useState(false);

  function openCrop(src: string) {
    setRawSrc(src);
    setCropOpen(true);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => openCrop(r.result as string);
    r.readAsDataURL(f);
    e.target.value = "";
  }

  return (
    <div className="sheet relative flex flex-col gap-4 p-6">
      <div className="flex items-baseline justify-between">
        <span className="roman-numeral text-3xl leading-none">{numeral}</span>
        <span className="label-eyebrow">Face</span>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[260px]">
        <div
          className="absolute inset-0 bg-[var(--color-paper-deep)]"
          style={{
            clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
          }}
        />
        {value ? (
          <img
            src={value}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)" }}
          />
        ) : (
          <div
            className="absolute inset-0 grid place-items-center text-[var(--color-ink-soft)]"
            style={{ clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)" }}
          >
            <span className="font-display text-sm italic">awaiting image</span>
          </div>
        )}
      </div>

      <p className="font-display text-center text-sm italic text-[var(--color-ink-soft)]">{caption}</p>

      <div className="flex flex-wrap justify-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <ImagePlus /> Upload
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCamOpen(true)}>
          <Camera /> Camera
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            <RefreshCw /> Reset
          </Button>
        )}
      </div>

      <HexCropper
        open={cropOpen}
        src={rawSrc}
        onCancel={() => setCropOpen(false)}
        onConfirm={(d) => { onChange(d); setCropOpen(false); }}
      />
      <CameraCapture
        open={camOpen}
        onCancel={() => setCamOpen(false)}
        onCapture={(d) => { setCamOpen(false); openCrop(d); }}
      />
    </div>
  );
}
