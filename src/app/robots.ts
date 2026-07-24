import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants/site";

// Everything behind sign-in is already unreachable to a crawler, but saying so
// keeps the dashboard's URL shapes out of search results entirely — and stops a
// crawler burning requests on routes that will only ever redirect it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
