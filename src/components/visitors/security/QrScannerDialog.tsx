/**
 * Full-screen-ish camera dialog that reads a visitor's QR. It only reports the
 * raw payload once and closes; deciding what the QR means lives in the caller.
 */

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/useI18n";

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (raw: string) => void;
}

export function QrScannerDialog({ open, onOpenChange, onScan }: QrScannerDialogProps) {
  const { t } = useI18n();
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    if (!open || !video) return;
    let handled = false;
    const scanner = new QrScanner(
      video,
      (result) => {
        if (handled) return;
        handled = true;
        onScanRef.current(result.data);
      },
      { preferredCamera: "environment", highlightScanRegion: true, returnDetailedScanResult: true, maxScansPerSecond: 10 },
    );
    scanner.start().catch(() => setCameraError(true));
    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, [open, video]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setCameraError(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("security.visits.scan.title")}</DialogTitle>
          <DialogDescription>{t("security.visits.scan.hint")}</DialogDescription>
        </DialogHeader>
        {cameraError ? (
          <p role="alert" className="rounded-gates-md bg-gates-subtle p-4 text-sm text-gates-text-primary">
            {t("security.visits.scan.cameraError")}
          </p>
        ) : (
          <video ref={setVideo} muted playsInline className="aspect-square w-full rounded-gates-md bg-black object-cover" />
        )}
      </DialogContent>
    </Dialog>
  );
}
