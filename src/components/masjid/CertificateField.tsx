import { useEffect, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  value: File | null;
  onChange: (file: File | null) => void;
};

export function CertificateField({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!value || !value.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onChange(file);
        }}
        className={`rounded-2xl border border-dashed p-6 text-center transition-colors ${
          dragging ? "border-primary bg-secondary" : "border-border bg-card"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        {value ? (
          <div className="flex flex-col items-center gap-3">
            {preview ? (
              <img
                src={preview}
                alt="مستخرج شهادة الميلاد"
                className="max-h-40 rounded-lg border border-border"
              />
            ) : (
              <FileText className="h-10 w-10 text-primary" />
            )}
            <span className="text-sm">{value.name}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <X className="h-4 w-4" />
              إزالة
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">
              يمكنكم رفع صورة واضحة أو ملف PDF لمستخرج شهادة الميلاد
            </p>
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              اختيار ملف
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
