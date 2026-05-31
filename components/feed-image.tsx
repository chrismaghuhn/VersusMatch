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
        aria-hidden
        className={cn(
          "flex h-full items-center justify-center bg-[#141414] bg-gradient-to-br from-white/[0.06] to-transparent",
          className
        )}
      >
        <span
          className="text-white/25"
          style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.04em" }}
        >
          ?
        </span>
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
