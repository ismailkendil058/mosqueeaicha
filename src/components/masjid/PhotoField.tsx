import { useEffect, useRef, useState } from "react";
import { Camera, FolderOpen, RotateCcw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  value: File | null;
  onChange: (file: File | null) => void;
};

export function PhotoField({ value, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const openCamera = async () => {
    setShot(null);
    setCameraError(null);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError("لا يمكن الوصول إلى الكاميرا. يمكنكم رفع الصورة من الجهاز.");
    }
  };

  const closeCamera = () => {
    stopStream();
    setCameraOpen(false);
    setShot(null);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setShot(canvas.toDataURL("image/jpeg", 0.9));
    stopStream();
  };

  const confirmShot = async () => {
    if (!shot) return;
    const blob = await (await fetch(shot)).blob();
    onChange(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
    closeCamera();
  };

  useEffect(() => stopStream, []);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-40 w-40 overflow-hidden rounded-3xl border border-primary/30 bg-secondary">
        {preview ? (
          <img src={preview} alt="صورة الطالب" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Camera className="h-8 w-8" />
            <span className="text-xs">صورة الطالب</span>
          </div>
        )}
        {preview && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute left-2 top-2 rounded-full bg-background/90 p-1 text-primary shadow"
            aria-label="إزالة الصورة"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <FolderOpen className="h-4 w-4" />
          رفع من الجهاز
        </Button>
        <Button type="button" variant="outline" onClick={openCamera}>
          <Camera className="h-4 w-4" />
          التقاط صورة الآن
        </Button>
      </div>

      <Dialog open={cameraOpen} onOpenChange={(o) => (o ? setCameraOpen(true) : closeCamera())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">التقاط صورة الطالب</DialogTitle>
          </DialogHeader>
          {cameraError ? (
            <p className="text-sm text-destructive">{cameraError}</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-ink">
              {shot ? (
                <img src={shot} alt="معاينة" className="w-full" />
              ) : (
                <video ref={videoRef} playsInline muted className="w-full" />
              )}
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {!shot && !cameraError && (
              <Button type="button" onClick={capture}>
                <Camera className="h-4 w-4" />
                التقاط
              </Button>
            )}
            {shot && (
              <>
                <Button type="button" variant="outline" onClick={openCamera}>
                  <RotateCcw className="h-4 w-4" />
                  إعادة المحاولة
                </Button>
                <Button type="button" onClick={confirmShot}>
                  <Check className="h-4 w-4" />
                  تأكيد
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
