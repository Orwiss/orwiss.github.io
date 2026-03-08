export type MultiSelectTag = {
  id: string;
  name: string;
};

export type RichText = {
  plain_text: string;
};

export type ProjectProperties = Record<
  string,
  {
    title?: RichText[];
    date?: { start: string };
    multi_select?: MultiSelectTag[];
    rich_text?: RichText[];
  }
>;

export type ProjectPage = {
  id: string;
  properties: ProjectProperties;
  cover?: {
    type?: "file" | "external";
    file?: { url: string };
    external?: { url: string };
  };
};

export type ProjectBlock = {
  id: string;
  type: string;
  heading_1?: { rich_text: RichText[] };
  heading_2?: { rich_text: RichText[] };
  heading_3?: { rich_text: RichText[] };
  paragraph?: { rich_text: RichText[] };
  image?: { file?: { url: string }; caption?: string };
  video?: { external?: { url: string }; file?: { url: string }; type: string };
  link_preview?: { url: string };
  bookmark?: { url: string };
  numbered_list_item?: { rich_text: RichText[] };
  has_children?: boolean;
  children?: ProjectBlock[];
};

export const PROJECT_TITLE_PROPERTY = "\uC774\uB984";
export const PROJECT_DATE_PROPERTY = "\uB0A0\uC9DC";
export const PROJECT_CATEGORY_PROPERTY = "\uCE74\uD14C\uACE0\uB9AC";
export const PROJECT_TOOLS_PROPERTY = "\uC0AC\uC6A9 \uB3C4\uAD6C";
export const PROJECT_PARTICIPANTS_PROPERTY = "\uCC38\uC5EC\uC790";
export const PROJECT_LOADING_LABEL = "\uB85C\uB529 \uC911...";
export const PROJECT_LIST_LABEL = "\uBAA9\uB85D";
export const PROJECT_LIST_ERROR_LABEL =
  "\uD504\uB85C\uC81D\uD2B8 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.";
export const PROJECT_DETAIL_ERROR_LABEL =
  "\uD504\uB85C\uC81D\uD2B8 \uC0C1\uC138 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.";

export function getProjectTitle(page: ProjectPage) {
  return page.properties?.[PROJECT_TITLE_PROPERTY]?.title?.[0]?.plain_text ?? "No Name";
}

export function getProjectDateValue(page: ProjectPage) {
  return page.properties?.[PROJECT_DATE_PROPERTY]?.date?.start ?? null;
}

export function getProjectCategories(page: ProjectPage) {
  return page.properties?.[PROJECT_CATEGORY_PROPERTY]?.multi_select ?? [];
}

export function getProjectTools(page: ProjectPage) {
  return page.properties?.[PROJECT_TOOLS_PROPERTY]?.multi_select ?? [];
}

export function getProjectParticipants(page: ProjectPage) {
  return page.properties?.[PROJECT_PARTICIPANTS_PROPERTY]?.rich_text ?? [];
}

export function getProjectCoverUrl(page: ProjectPage) {
  return page.cover?.file?.url ?? page.cover?.external?.url ?? "";
}
