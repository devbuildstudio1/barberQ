"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Bucket = "shop-images" | "barber-photos" | "avatars";

const LIMITS: Record<Bucket, number> = { "shop-images": 5 * 1024 * 1024, "barber-photos": 3 * 1024 * 1024, avatars: 2 * 1024 * 1024 };
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

interface ImageUploadProps {
  bucket: Bucket;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  label?: string;
  shape?: "square" | "wide" | "round";
  className?: string;
  disabled?: boolean;
}

/**
 * Uploads to Supabase Storage under `<user id>/<random>.<ext>` (storage RLS
 * only allows writes to the caller's own folder) and returns the public URL.
 */
export function ImageUpload({ bucket, value, onChange, label = "Upload image", shape = "wide", className, disabled }: ImageUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const toast = useToast();
  const inputId = React.useId();

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Unsupported file", "Please upload a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > LIMITS[bucket]) {
      toast.error("File too large", `Maximum size is ${Math.round(LIMITS[bucket] / 1024 / 1024)} MB.`);
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${userData.user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch {
      toast.error("Upload failed", "Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const frame = cn(
    "relative overflow-hidden border border-dashed border-border-strong bg-surface-sunken",
    shape === "wide" && "aspect-[16/9] w-full rounded-lg",
    shape === "square" && "size-32 rounded-lg",
    shape === "round" && "size-24 rounded-full",
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className={frame}>
        {value ? (
          <Image src={value} alt="" fill sizes="(max-width: 768px) 100vw, 600px" className="object-cover" />
        ) : (
          <label htmlFor={inputId} className="flex size-full cursor-pointer flex-col items-center justify-center gap-1 text-ink-500">
            <ImagePlus className="size-6" aria-hidden />
            {shape !== "round" ? <span className="text-xs font-medium">{label}</span> : null}
          </label>
        )}
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ALLOWED.join(",")}
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
        aria-label={label}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" loading={uploading} disabled={disabled} onClick={() => inputRef.current?.click()}>
          <Upload /> {value ? "Replace" : label}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" size="sm" disabled={disabled || uploading} onClick={() => onChange(null)}>
            <Trash2 /> Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
