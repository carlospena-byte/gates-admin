import { useEffect, useState } from "react";
import { IconRotate, IconRotateClockwise, IconX, IconZoomIn, IconZoomOut, IconZoomReset } from "@tabler/icons-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const STEP = 0.25;

export interface ImageViewerDialogProps {
  src: string | null;
  title: string;
  onOpenChange: (open: boolean) => void;
  labels: { zoomIn: string; zoomOut: string; reset: string; rotateLeft: string; rotateRight: string; close: string };
}

/** Modal image viewer with zoom (buttons or wheel) and 90° rotation. */
export function ImageViewerDialog({ src, title, onOpenChange, labels }: ImageViewerDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [src]);

  const clamp = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  return (
    <Dialog open={!!src} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-3 p-4">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{title}</DialogDescription>

        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{title}</p>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" aria-label={labels.zoomOut} onClick={() => setZoom((z) => clamp(z - STEP))}>
              <IconZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <Button size="icon" variant="outline" aria-label={labels.zoomIn} onClick={() => setZoom((z) => clamp(z + STEP))}>
              <IconZoomIn className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" aria-label={labels.rotateLeft} onClick={() => setRotation((r) => r - 90)}>
              <IconRotate className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" aria-label={labels.rotateRight} onClick={() => setRotation((r) => r + 90)}>
              <IconRotateClockwise className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label={labels.reset}
              onClick={() => {
                setZoom(1);
                setRotation(0);
              }}
            >
              <IconZoomReset className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label={labels.close} onClick={() => onOpenChange(false)}>
              <IconX className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          className="flex flex-1 items-center justify-center overflow-auto rounded-md bg-muted"
          onWheel={(e) => setZoom((z) => clamp(z + (e.deltaY < 0 ? STEP : -STEP)))}
        >
          {src && (
            <img
              src={src}
              alt={title}
              draggable={false}
              className="max-h-full max-w-full select-none object-contain transition-transform duration-150"
              style={{ transform: `rotate(${rotation}deg) scale(${zoom})` }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
