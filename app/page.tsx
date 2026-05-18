import { preload } from "react-dom";
import HomeClient from "./HomeClient";
import { getProjectListData } from "@/lib/projectNotion";
import { mapNotionToProjects } from "@/lib/projectMap";
import { getCoverBytes } from "@/lib/notionCovers";

// ISR: cache the rendered home for 1 hour. Notion content changes
// rarely (a few new projects per year), so 1hr is conservative-fresh.
// HomeClient also fires a background fetch to /api/projects during the
// MinLoader window — that runs ALWAYS-fresh, so even when this cached
// page is served, the user sees the latest Notion state after the
// loader fades. Net: fast TTFB + truly fresh data, with at most one
// extra Notion round-trip per visit (cache miss).
export const revalidate = 3600;

export default async function Home() {
  const { results } = await getProjectListData();
  const projects = mapNotionToProjects(results);

  // Stream <link rel="preload" as="image"> hints for every project's
  // cover thumbnail. Browser starts 28 parallel fetches as soon as
  // the HTML head arrives; by the time the user switches to ListView
  // or hovers a MindMap node, the cover is already in the browser
  // cache. Subsequent <img src="/api/notion/cover/[id]"> renders
  // collapse onto the preload request — no duplicate fetch.
  for (const p of projects) {
    preload(`/api/notion/cover/${p.id}`, { as: "image" });
  }

  // Pre-warm the SERVER cache (unstable_cache) for every cover in
  // parallel BEFORE sending the response. Adds ~1-3s to whichever
  // request triggers ISR regeneration (~once per hour), but every
  // visitor during the cache window gets cover responses straight
  // from cache — hover / list-view covers feel instant from the
  // first click. The previous after()-based variant left the warming
  // racing the browser's preload requests, so early clicks landed
  // on covers whose cache entry was still being populated.
  await Promise.all(
    projects.map((p) => getCoverBytes(p.id).catch(() => null)),
  );

  return <HomeClient projects={projects} />;
}
