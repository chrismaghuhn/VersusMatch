import Image from "next/image";
import { cn } from "@/lib/utils";

type FeedImageProps = {
  src: string | null;
  alt: string;
  priority?: boolean;
  className?: string;
};

export function FeedImage({ src, alt, priority = false, className }: FeedImageProps) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center bg-[#141414] p-2 text-center text-sm font-black text-white/60",
          className
        )}
      >
        {alt}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={cn("object-cover", className)}
      sizes="(max-width: 768px) 50vw, 20vw"
      priority={priority}
      loading={priority ? undefined : "lazy"}
    />
  );
}
