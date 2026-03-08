import {
  PROJECT_DETAIL_ERROR_LABEL,
  type ProjectBlock,
  type ProjectPage,
} from "@/lib/projectNotion";

type ProjectPagePayload = {
  page?: ProjectPage;
  blocks?: ProjectBlock[];
  error?: string;
};

type ProjectBlockPayload = {
  blocks?: ProjectBlock[];
  error?: string;
};

export type CachedProjectDetail = {
  page: ProjectPage | null;
  blocks: ProjectBlock[];
  error: string | null;
};

const projectPreviewCache = new Map<string, ProjectPage>();
const projectDetailCache = new Map<string, CachedProjectDetail>();
const projectDetailPromiseCache = new Map<string, Promise<CachedProjectDetail>>();

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function fetchBlockChildren(blockId: string) {
  const response = await fetch(`/api/notion/block/${blockId}`);
  const payload = (await response.json()) as ProjectBlockPayload;

  if (!response.ok) {
    throw new Error(payload.error || PROJECT_DETAIL_ERROR_LABEL);
  }

  return payload.blocks ?? [];
}

async function fetchProjectDetail(pageId: string): Promise<CachedProjectDetail> {
  try {
    const response = await fetch(`/api/notion/page/${pageId}`);
    const payload = (await response.json()) as ProjectPagePayload;

    if (!response.ok) {
      throw new Error(payload.error || PROJECT_DETAIL_ERROR_LABEL);
    }

    const page = payload.page ?? projectPreviewCache.get(pageId) ?? null;
    const blocks = payload.blocks ?? [];
    const columnListBlocks = blocks.filter((block) => block.type === "column_list");

    const hydratedColumns = await Promise.all(
      columnListBlocks.map(async (block) => {
        const columns = await fetchBlockChildren(block.id);

        const children = await Promise.all(
          columns.map(async (column) => {
            if (!column.has_children) {
              return column;
            }

            return {
              ...column,
              children: await fetchBlockChildren(column.id),
            };
          })
        );

        return [block.id, children] as const;
      })
    );

    const columnMap = new Map(hydratedColumns);
    const result = {
      page,
      blocks: blocks.map((block) =>
        block.type === "column_list"
          ? {
              ...block,
              children: columnMap.get(block.id) ?? [],
            }
          : block
      ),
      error: null,
    } satisfies CachedProjectDetail;

    if (page) {
      projectPreviewCache.set(pageId, page);
    }

    projectDetailCache.set(pageId, result);
    return result;
  } catch (error) {
    const result = {
      page: projectPreviewCache.get(pageId) ?? null,
      blocks: [],
      error: getErrorMessage(error, PROJECT_DETAIL_ERROR_LABEL),
    } satisfies CachedProjectDetail;

    projectDetailCache.set(pageId, result);
    return result;
  } finally {
    projectDetailPromiseCache.delete(pageId);
  }
}

export function primeProjectPreview(page: ProjectPage) {
  projectPreviewCache.set(page.id, page);
}

export function getProjectPreview(pageId: string) {
  return projectPreviewCache.get(pageId) ?? null;
}

export function getCachedProjectDetail(pageId: string) {
  return projectDetailCache.get(pageId) ?? null;
}

export function loadProjectDetail(pageId: string) {
  const cached = projectDetailCache.get(pageId);
  if (cached?.blocks.length) {
    return Promise.resolve(cached);
  }

  const pending = projectDetailPromiseCache.get(pageId);
  if (pending) {
    return pending;
  }

  const promise = fetchProjectDetail(pageId);
  projectDetailPromiseCache.set(pageId, promise);
  return promise;
}

export function primeProjectDetail(page: ProjectPage) {
  primeProjectPreview(page);
  void loadProjectDetail(page.id);
}
