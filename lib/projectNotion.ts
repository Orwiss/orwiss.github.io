import {
  createNotionClient,
  getNotionDatabaseId,
  proxyNotionJson,
  replacePageCoversWithProxy,
  shouldProxyNotionInDevelopment,
  shouldUseRemoteNotionFallback,
} from "@/lib/notion";

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

export async function getProjectListData(): Promise<ProjectListData> {
  try {
    if (shouldProxyNotionInDevelopment() || shouldUseRemoteNotionFallback()) {
      const payload = await proxyNotionJson<ProjectPagePayload>("/api/notion", {
        next: { revalidate: 300 },
      });

      return {
        results: payload.results ?? [],
        error: null,
      };
    }

    const notion = createNotionClient();
    const response = await notion.databases.query({
      database_id: getNotionDatabaseId(),
    });

    return {
      results: replacePageCoversWithProxy(response.results as ProjectPage[]),
      error: null,
    };
  } catch (error) {
    console.error("Error fetching project list:", error);

    return {
      results: [],
      error: PROJECT_LIST_ERROR_LABEL,
    };
  }
}

async function fetchProjectBlockPayload(blockId: string) {
  if (shouldProxyNotionInDevelopment() || shouldUseRemoteNotionFallback()) {
    return proxyNotionJson<ProjectBlockPayload>(`/api/notion/block/${blockId}`);
  }

  const notion = createNotionClient();
  const response = await notion.blocks.children.list({ block_id: blockId });

  return {
    blocks: response.results as ProjectBlock[],
  };
}

async function hydrateProjectBlocks(blocks: ProjectBlock[]) {
  return Promise.all(
    blocks.map(async (block) => {
      if (block.type !== "column_list") {
        return block;
      }

      const columnListPayload = await fetchProjectBlockPayload(block.id);
      const columns = columnListPayload.blocks || [];

      const hydratedColumns = await Promise.all(
        columns.map(async (column) => {
          if (!column.has_children) {
            return column;
          }

          const childPayload = await fetchProjectBlockPayload(column.id);
          return {
            ...column,
            children: childPayload.blocks || [],
          };
        })
      );

      return {
        ...block,
        children: hydratedColumns,
      };
    })
  );
}

export async function getProjectDetailData(pageId: string): Promise<ProjectDetailData> {
  try {
    const payload = await fetchProjectPagePayload(pageId);
    const blocks = await hydrateProjectBlocks(payload.blocks || []);

    return {
      page: payload.page || null,
      blocks,
      error: null,
    };
  } catch (error) {
    console.error("Error fetching project detail:", error);
    return {
      page: null,
      blocks: [],
      error: PROJECT_DETAIL_ERROR_LABEL,
    };
  }
}
