import type { Metadata } from "next";
import { getAppUrl } from "@/lib/utils";

export function getMetadataBase(): URL {
  return new URL(getAppUrl("/"));
}

export const siteMetadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "MemeFight — A vs B Battles",
    template: "%s | MemeFight",
  },
  description: "Create shareable A-vs-B battles on memefight.lol and collect live votes.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    siteName: "MemeFight",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};
