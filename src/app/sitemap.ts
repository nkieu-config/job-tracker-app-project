import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants/site";

// Only the pages a signed-out visitor can reach. The dashboard is behind auth,
// so listing it would advertise URLs that answer every crawler with a redirect.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/sign-in`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/sign-up`, changeFrequency: "yearly", priority: 0.5 },
  ];
}
