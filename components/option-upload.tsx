"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X } from "lucide-react";

type OptionUploadProps = {
  label: string;
  name: string;
  textName: string;
  position: "A" | "B";
};

export function OptionUpload({ label, name, textName, position }: OptionUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPreview(null);
      setFileName(null);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Bild darf maximal 2MB groß sein.");
      event.target.value = "";
      return;
    }

    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
  }

  function clearFile(input: HTMLInputElement | null) {
    if (input) input.value = "";
    setPreview(null);
    setFileName(null);
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Option {position}</h3>
        {fileName && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground"
            onClick={() => clearFile(document.getElementById(name) as HTMLInputElement | null)}
          >
            <X className="h-4 w-4" />
            Entfernen
          </Button>
        )}
      </div>

      <Input name={textName} placeholder={`${label} (Text)`} required maxLength={80} />

      <label
        htmlFor={name}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-6 text-center transition hover:bg-secondary"
      >
        {preview ? (
          <div className="relative h-32 w-full overflow-hidden rounded-lg">
            <Image src={preview} alt="Preview" fill className="object-cover" unoptimized />
          </div>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Optional: Bild hochladen (max. 2MB)</span>
          </>
        )}
        <input
          id={name}
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}
