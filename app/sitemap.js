import { SITE_URL } from "../lib/site";
import { listMixes } from "../lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const mixes = await listMixes({ sort: "recent", limit: 1000 }).catch(() => []);
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/mezclas`, changeFrequency: "daily", priority: 0.8 },
    ...mixes.map((m) => ({ url: `${SITE_URL}/mix/${m.id}`, lastModified: new Date(m.created), changeFrequency: "weekly", priority: 0.6 })),
  ];
}
