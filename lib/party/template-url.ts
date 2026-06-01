const BUCKET = "party-templates";

const LOCAL_PLACEHOLDERS: Record<string, string> = {
  "party-templates/placeholder-1.webp": "/party/placeholders/placeholder-1.svg",
  "party-templates/placeholder-2.webp": "/party/placeholders/placeholder-2.svg",
  "party-templates/placeholder-3.webp": "/party/placeholders/placeholder-3.svg",
  "placeholder-1.svg": "/party/placeholders/placeholder-1.svg",
  "placeholder-2.svg": "/party/placeholders/placeholder-2.svg",
  "placeholder-3.svg": "/party/placeholders/placeholder-3.svg",
  "placeholder-4.svg": "/party/placeholders/placeholder-4.svg",
  "placeholder-5.svg": "/party/placeholders/placeholder-5.svg",
  "placeholder-6.svg": "/party/placeholders/placeholder-6.svg",
  "placeholder-7.svg": "/party/placeholders/placeholder-7.svg",
  "placeholder-8.svg": "/party/placeholders/placeholder-8.svg",
};

export function getPartyTemplateUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;

  const local = LOCAL_PLACEHOLDERS[imagePath];
  if (local) return local;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;

  const objectPath = imagePath.startsWith(`${BUCKET}/`)
    ? imagePath.slice(BUCKET.length + 1)
    : imagePath;

  return `${base}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}
