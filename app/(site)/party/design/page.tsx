import type { Metadata } from "next";
import { PartyDesignPreview } from "@/components/brutal/party/party-design-preview";

export const metadata: Metadata = {
  title: "Party Design Preview",
  robots: { index: false, follow: false },
};

export default function PartyDesignPage() {
  return <PartyDesignPreview />;
}
