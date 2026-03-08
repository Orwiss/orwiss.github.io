import { Client } from "@notionhq/client";

const NOTION_PROXY_ORIGIN =
  process.env.NOTION_DEV_PROXY_ORIGIN ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://orwiss.xyz";

type NotionCover =
  | {
      type?: "external";
      external?: { url?: string };
      file?: { url?: string };
    }
  | {
      type?: "file";
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
      (process.env.NOTION_TEMP_DB_ID ?? process.env.NOTION_DATABASE_ID)
  );
}

export function shouldProxyNotionInDevelopment() {
  return process.env.NODE_ENV !== "production" && !hasNotionConfig();
}

export function shouldUseRemoteNotionFallback() {
  return !hasNotionConfig() && !process.env.VERCEL_ENV;
}

export function getNotionProxyOrigin() {
  return NOTION_PROXY_ORIGIN;
}

type ProxyNotionRequestOptions = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

export async function proxyNotionRequest(
  pathname: string,
  options?: ProxyNotionRequestOptions
) {
  const proxyUrl = new URL(pathname, NOTION_PROXY_ORIGIN);
  const cacheOption =
    options?.cache ?? (typeof options?.next?.revalidate === "number" ? undefined : "no-store");

  const response = await fetch(proxyUrl, {
    ...options,
    ...(cacheOption ? { cache: cacheOption } : {}),
    headers: {
      Accept: "application/json",
      ...(options?.headers ?? {}),
    },
  });

  return {
    status: response.status,
    body: await response.text(),
    contentType: response.headers.get("content-type") ?? "application/json; charset=utf-8",
  };
}

export async function proxyNotionJson<T>(
  pathname: string,
  options?: ProxyNotionRequestOptions
) {
  const proxied = await proxyNotionRequest(pathname, options);

  if (proxied.status < 200 || proxied.status >= 300) {
    throw new Error(`Failed to proxy Notion request for ${pathname}.`);
  }

  return JSON.parse(proxied.body) as T;
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
      file: {
        ...page.cover.file,
        url: getNotionCoverProxyUrl(page.id),
      },
    },
  };
}

export function replacePageCoversWithProxy<T extends NotionPageLike>(pages: T[]) {
  return pages.map((page) => replacePageCoverWithProxy(page));
}

export function getCoverUrlFromPage(page: { cover?: NotionCover }) {
  if (!page.cover) {
    return null;
  }

  if (page.cover.type === "external") {
    return page.cover.external?.url ?? null;
  }

  if (page.cover.type === "file") {
    return page.cover.file?.url ?? null;
  }

  return null;
}

export function createNotionClient() {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error("NOTION_API_KEY is not set.");
  }

  return new Client({ auth: apiKey });
}

export function getNotionDatabaseId() {
  const databaseId =
    process.env.NOTION_TEMP_DB_ID ?? process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    throw new Error("A Notion database id is not configured.");
  }

  return databaseId;
}

export async function getNotionData() {
  try {
    const notion = createNotionClient();
    const response = await notion.databases.query({
      database_id: getNotionDatabaseId(),
    });
    return response.results;
  } catch (error) {
    console.error("Error fetching Notion data:", error);
    return [];
  }
}
