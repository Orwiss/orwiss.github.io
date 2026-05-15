import { categories, type CategoryId, type Project } from "@/lib/projects";
import {
  type ProjectPage,
  getProjectTitle,
  getProjectCategories,
} from "@/lib/projectNotion";

function normalize(label: string): string {
  return label.trim().toLowerCase();
}

// Build lookup from Notion multi_select tag names → our CategoryId enum.
// The Notion property values are kept in lockstep with the labels declared
// in lib/projects.ts; case + whitespace are ignored for resilience.
const LABEL_TO_ID = new Map(categories.map((c) => [normalize(c.label), c.id]));

export function matchCategoryId(notionCategoryName: string): CategoryId | null {
  return LABEL_TO_ID.get(normalize(notionCategoryName)) ?? null;
}

export function mapNotionToProjects(pages: ProjectPage[]): Project[] {
  return pages.map((page) => {
    const tags = getProjectCategories(page);
    const matchedId = tags
      .map((t) => matchCategoryId(t.name))
      .find((id): id is CategoryId => id !== null);
    return {
      id: page.id,
      title: getProjectTitle(page),
      // Projects that have no recognised category fall through to "others"
      // so they still show up on the mind map.
      categoryId: matchedId ?? "others",
    };
  });
}
