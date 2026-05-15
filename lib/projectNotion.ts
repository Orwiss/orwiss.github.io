import {
  createNotionClient,
  getNotionDataSourceId,
  proxyNotionJson,
  replacePageCoversWithProxy,
  shouldProxyNotionInDevelopment,
  shouldUseRemoteNotionFallback,
} from "@/lib/notion";

export type MultiSelectTag = {
  id: string;
  name: string;
  color?: string;
};

export type RichTextAnnotations = {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: string;
};

export type RichTextItem = {
  type?: "text" | "mention" | "equation";
  text?: { content: string; link?: { url: string } | null };
  mention?: { type: string; [key: string]: unknown };
  equation?: { expression: string };
  annotations?: RichTextAnnotations;
  plain_text: string;
  href?: string | null;
};

export type ProjectProperties = Record<
  string,
  {
    title?: RichTextItem[];
    date?: { start: string; end?: string | null };
    multi_select?: MultiSelectTag[];
    rich_text?: RichTextItem[];
    select?: { id: string; name: string; color?: string };
  }
>;

export type ProjectCover = {
  type?: "file" | "external";
  file?: { url: string };
  external?: { url: string };
};

export type ProjectPage = {
  id: string;
  properties: ProjectProperties;
  cover?: ProjectCover;
  icon?:
    | { type: "emoji"; emoji: string }
    | { type: "external"; external: { url: string } }
    | { type: "file"; file: { url: string } };
};

// Loose block shape — Notion's block payload differs per type, so we keep
// fields optional and let the renderer narrow per case. has_children + children
// are added by our hydration step (see hydrateBlocks).
export type ProjectBlock = {
  id: string;
  type: string;
  has_children?: boolean;
  children?: ProjectBlock[];
  // Per-type payloads — accessed dynamically by the renderer.
  [key: string]: unknown;
};

// Korean DB property names (must match the Notion database exactly).
export const PROJECT_TITLE_PROPERTY = "이름";
export const PROJECT_DATE_PROPERTY = "날짜";
export const PROJECT_CATEGORY_PROPERTY = "카테고리";
export const PROJECT_TOOLS_PROPERTY = "사용 도구";
export const PROJECT_PARTICIPANTS_PROPERTY = "참여자";

export const PROJECT_LIST_LABEL = "목록";
export const PROJECT_LOADING_LABEL = "로딩 중...";
export const PROJECT_LIST_ERROR_LABEL = "프로젝트 목록을 불러오지 못했습니다.";
export const PROJECT_DETAIL_ERROR_LABEL = "프로젝트 상세 정보를 불러오지 못했습니다.";

type ProjectPagePayload = {
  results?: ProjectPage[];
  page?: ProjectPage;
  blocks?: ProjectBlock[];
  error?: string;
};

type ProjectBlockPayload = {
  blocks?: ProjectBlock[];
  error?: string;
};

export type ProjectDetailData = {
  page: ProjectPage | null;
  blocks: ProjectBlock[];
  error: string | null;
};

export type ProjectListData = {
  results: ProjectPage[];
  error: string | null;
};

export function getProjectTitle(page: ProjectPage) {
  return (
    page.properties?.[PROJECT_TITLE_PROPERTY]?.title?.[0]?.plain_text ?? "No Name"
  );
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

// Container block types whose children are NOT returned by the initial
// blocks.children.list call — we must recursively fetch them ourselves.
// (Notion fetches one level at a time.)
const CONTAINER_TYPES = new Set([
  "column_list",
  "column",
  "toggle",
  "callout",
  "quote",
  "bulleted_list_item",
  "numbered_list_item",
  "to_do",
  "synced_block",
  "template",
]);

async function fetchProjectPagePayload(pageId: string) {
  if (shouldProxyNotionInDevelopment() || shouldUseRemoteNotionFallback()) {
    return proxyNotionJson<ProjectPagePayload>(`/api/notion/page/${pageId}`);
  }

  const notion = createNotionClient();
  const [pageResponse, blocksResponse] = await Promise.all([
    notion.pages.retrieve({ page_id: pageId }),
    notion.blocks.children.list({ block_id: pageId }),
  ]);

  return {
    page: pageResponse as ProjectPage,
    blocks: blocksResponse.results as ProjectBlock[],
  };
}

async function fetchProjectBlockPayload(blockId: string) {
  if (shouldProxyNotionInDevelopment() || shouldUseRemoteNotionFallback()) {
    return proxyNotionJson<ProjectBlockPayload>(`/api/notion/block/${blockId}`);
  }

  const notion = createNotionClient();
  const response = await notion.blocks.children.list({ block_id: blockId });
  return { blocks: response.results as ProjectBlock[] };
}

// Walk the block tree and fetch children for any block whose type is known
// to be a container and that reports has_children. Bounded by depth to avoid
// pathological recursion. Failures on individual child fetches are swallowed
// so one bad block cannot break the entire page render — the offending block
// just appears with no children.
async function hydrateBlocks(
  blocks: ProjectBlock[],
  depth = 0,
): Promise<ProjectBlock[]> {
  const MAX_DEPTH = 6;
  if (depth >= MAX_DEPTH) return blocks;

  return Promise.all(
    blocks.map(async (block) => {
      if (!block.has_children || !CONTAINER_TYPES.has(block.type)) {
        return block;
      }
      try {
        const childPayload = await fetchProjectBlockPayload(block.id);
        const hydrated = await hydrateBlocks(childPayload.blocks ?? [], depth + 1);
        return { ...block, children: hydrated };
      } catch (error) {
        console.warn(
          `[notion] failed to hydrate children of ${block.type} ${block.id}:`,
          error instanceof Error ? error.message : error,
        );
        return block;
      }
    }),
  );
}

export async function getProjectListData(): Promise<ProjectListData> {
  try {
    if (shouldProxyNotionInDevelopment() || shouldUseRemoteNotionFallback()) {
      // no-store on purpose: in dev we want fresh data; with Next's data
      // cache + revalidate, an early empty response would stick for the
      // revalidation window and the mind map would render hub-only.
      const payload = await proxyNotionJson<ProjectPagePayload>("/api/notion", {
        cache: "no-store",
      });
      return { results: payload.results ?? [], error: null };
    }

    const notion = createNotionClient();
    const dataSourceId = await getNotionDataSourceId();
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
    });
    return {
      results: replacePageCoversWithProxy(response.results as unknown as ProjectPage[]),
      error: null,
    };
  } catch (error) {
    console.error("Error fetching project list:", error);
    return { results: [], error: PROJECT_LIST_ERROR_LABEL };
  }
}

export async function getProjectDetailData(pageId: string): Promise<ProjectDetailData> {
  try {
    const payload = await fetchProjectPagePayload(pageId);
    const blocks = await hydrateBlocks(payload.blocks ?? []);
    return { page: payload.page ?? null, blocks, error: null };
  } catch (error) {
    console.error("Error fetching project detail:", error);
    return { page: null, blocks: [], error: PROJECT_DETAIL_ERROR_LABEL };
  }
}
