import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/feed", "/b/"],
        disallow: ["/admin/", "/api/", "/auth/", "/create", "/my-battles"],
      },
    ],
    sitemap: getAppUrl("/sitemap.xml"),
  };
}
