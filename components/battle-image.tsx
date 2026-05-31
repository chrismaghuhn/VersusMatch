"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

type BattleImageProps = {
  src: string | null;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  placeholderClassName?: string;
};

export function BattleImage({
  src,
  alt,
  sizes = "(max-width: 768px) 100vw, 40vw",
  priority = false,
  className,
  placeholderClassName,
}: BattleImageProps) {
  const [useFallback, setUseFallback] = useState(false);

  if (!src) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center bg-[#141414] p-6 text-center text-2xl font-black text-white",
          placeholderClassName
        )}
      >
        {alt}
      </div>
    );
  }

  if (useFallback) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={cn("object-cover", className)}
      sizes={sizes}
      priority={priority}
      onError={() => setUseFallback(true)}
    />
  );
}
