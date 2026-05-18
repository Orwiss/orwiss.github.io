import HomeClient from "./HomeClient";
import { getProjectListData } from "@/lib/projectNotion";
import { mapNotionToProjects } from "@/lib/projectMap";

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
  return <HomeClient projects={projects} />;
}
