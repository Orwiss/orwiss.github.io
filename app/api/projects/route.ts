import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/http";
import { mapNotionToProjects } from "@/lib/projectMap";
import { getProjectListData } from "@/lib/projectNotion";

// Returns the pre-mapped Project[] (id / title / categoryId / year /
// tags) — i.e. the same shape app/page.tsx renders the home with. The
// home is ISR-cached for low TTFB, so the client fires this endpoint
// during the MinLoader window to overwrite the cached projects with
// the latest Notion state. Always-fresh on the server (no cache).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { results, error } = await getProjectListData();
    if (error) {
      return NextResponse.json(
        { error },
        { status: 500, headers: noStoreHeaders },
      );
    }
    return NextResponse.json(
      { projects: mapNotionToProjects(results) },
      { headers: noStoreHeaders },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
