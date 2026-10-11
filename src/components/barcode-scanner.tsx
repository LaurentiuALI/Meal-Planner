"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Scanare EAN/UPC cu camera din spate. Pe iPhone merge în Safari doar pe HTTPS
 * (Tailscale serve) sau localhost; dacă nu există cameră, rămâne câmpul manual.
 */
export function BarcodeScanner({ open, onOpenChange, onCode }: { open: boolean; onOpenChange: (o: boolean) => void; onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!open) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
        const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]]]);
        const reader = new BrowserMultiFormatReader(hints);
        // Așteaptă montarea video-ului din dialog.
        while (!video.current && !cancelled) await new Promise((r) => setTimeout(r, 30));
        if (cancelled || !video.current) return;
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          video.current,
          (result) => {
            if (!result) return;
            navigator.vibrate?.(50);
            controls.stop();
            onCode(result.getText());
            onOpenChange(false);
          },
        );
        stop = () => controls.stop();
        if (cancelled) stop();
      } catch (e) {
        setError(e instanceof Error && e.name === "NotAllowedError" ? "Accesul la cameră a fost refuzat." : "Camera nu e disponibilă (e nevoie de HTTPS). Scrie codul manual.");
      }
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [open, onCode, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-4">
        <DialogHeader>
          <DialogTitle>Scanează codul de bare</DialogTitle>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : (
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video ref={video} className="aspect-[4/3] w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />
          </div>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) {
              onCode(manual.trim());
              onOpenChange(false);
            }
          }}
        >
          <Input inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="sau scrie codul" />
          <Button type="submit" variant="outline">
            Caută
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
