import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/feed", "/b/"],
        disallow: ["/admin/", "/api/", "/auth/", "/create", "/my-battles"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
