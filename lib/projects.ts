export type CategoryId =
  | "generative-art"
  | "interactive-media"
  | "exhibition"
  | "data-visualization"
  | "frontend"
  | "research"
  | "others";

export type Category = {
  id: CategoryId;
  label: string;
};

export type Project = {
  id: string;
  title: string;
  categoryId: CategoryId;
  year: string | null;
  tags: string[];
};

export const HUB_LABEL = "Sunghun Park";

// The mind-map spine — categories are static structure. Project list comes
// from Notion at request time via lib/projectMap.
export const categories: Category[] = [
  { id: "generative-art", label: "Generative Art" },
  { id: "interactive-media", label: "Interactive Media" },
  { id: "exhibition", label: "Exhibition" },
  { id: "data-visualization", label: "Data Visualization" },
  { id: "frontend", label: "Frontend" },
  { id: "research", label: "Research" },
  { id: "others", label: "Others" },
];
