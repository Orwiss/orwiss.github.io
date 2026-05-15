import { Client } from "@notionhq/client";

const PROXY_ORIGIN =
  process.env.NOTION_DEV_PROXY_ORIGIN ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://orwiss.xyz";

type NotionCover =
  | {
      type?: "external" | "file";
      external?: { url?: string };
      file?: { url?: string };
    }
  | null
  | undefined;

type NotionPageLike = {
  id: string;
  cover?: NotionCover;
};

export function hasNotionConfig() {
  return Boolean(
    process.env.NOTION_API_KEY &&
      (process.env.NOTION_TEMP_DB_ID ?? process.env.NOTION_DATABASE_ID),
  );
}

// When local dev has no Notion token, transparently proxy to the production
// origin so we can develop against real data without sharing the integration key.
export function shouldProxyNotionInDevelopment() {
  return process.env.NODE_ENV !== "production" && !hasNotionConfig();
}

// Catches the same situation outside of dev (e.g. preview builds without env)
// where proxying to prod is still the only way to get data.
export function shouldUseRemoteNotionFallback() {
  return !hasNotionConfig() && !process.env.VERCEL_ENV;
}

export function getNotionProxyOrigin() {
  return PROXY_ORIGIN;
}

type ProxyOptions = RequestInit & {
  next?: { revalidate?: number };
};

export async function proxyNotionRequest(pathname: string, options?: ProxyOptions) {
  const url = new URL(pathname, PROXY_ORIGIN);
  const cache =
    options?.cache ??
    (typeof options?.next?.revalidate === "number" ? undefined : "no-store");
  const response = await fetch(url, {
    ...options,
    ...(cache ? { cache } : {}),
    headers: { Accept: "application/json", ...(options?.headers ?? {}) },
  });
  return {
    status: response.status,
    body: await response.text(),
    contentType:
      response.headers.get("content-type") ?? "application/json; charset=utf-8",
  };
}

export async function proxyNotionJson<T>(pathname: string, options?: ProxyOptions) {
  const proxied = await proxyNotionRequest(pathname, options);
  if (proxied.status < 200 || proxied.status >= 300) {
    throw new Error(`Failed to proxy Notion request for ${pathname}.`);
  }
  return JSON.parse(proxied.body) as T;
}

export function createNotionClient() {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error("NOTION_API_KEY is not set.");
  }
  return new Client({ auth: apiKey });
}

export function getNotionDatabaseId() {
  const id = process.env.NOTION_TEMP_DB_ID ?? process.env.NOTION_DATABASE_ID;
  if (!id) {
    throw new Error("A Notion database id is not configured.");
  }
  return id;
}

// Notion's 2025-09-03 API split databases into "databases" (containers) and
// "data sources" (queryable content). v5 of @notionhq/client removed
// databases.query — content queries now go through dataSources.query and need
// a data_source_id.
//
// Resolution order:
//   1. NOTION_DATA_SOURCE_ID env var (preferred, zero extra API calls)
//   2. Auto-derive: databases.retrieve(database_id) → first data_sources[].id,
//      cached in module scope for the function instance's lifetime.
let cachedDataSourceId: string | null = null;

export async function getNotionDataSourceId(): Promise<string> {
  const envId = process.env.NOTION_DATA_SOURCE_ID;
  if (envId) return envId;
  if (cachedDataSourceId) return cachedDataSourceId;

  const notion = createNotionClient();
  const db = (await notion.databases.retrieve({
    database_id: getNotionDatabaseId(),
  })) as { data_sources?: Array<{ id: string }> };

  const first = db.data_sources?.[0]?.id;
  if (!first) {
    throw new Error(
      "Notion database has no data sources. Configure NOTION_DATA_SOURCE_ID or run the 2025-09-03 API migration on the database.",
    );
  }
  cachedDataSourceId = first;
  return cachedDataSourceId;
}

export function getNotionCoverProxyUrl(pageId: string) {
  return `/api/notion/cover/${pageId}`;
}

export function replacePageCoverWithProxy<T extends NotionPageLike>(page: T): T {
  if (!page.cover || page.cover.type !== "file" || !page.cover.file?.url) {
    return page;
  }
  return {
    ...page,
    cover: {
      ...page.cover,
      file: { ...page.cover.file, url: getNotionCoverProxyUrl(page.id) },
    },
  };
}

export function replacePageCoversWithProxy<T extends NotionPageLike>(pages: T[]) {
  return pages.map((page) => replacePageCoverWithProxy(page));
}

export function getCoverUrlFromPage(page: { cover?: NotionCover }) {
  if (!page.cover) return null;
  if (page.cover.type === "external") return page.cover.external?.url ?? null;
  if (page.cover.type === "file") return page.cover.file?.url ?? null;
  return null;
}
