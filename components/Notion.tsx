"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  PROJECT_CATEGORY_PROPERTY,
  PROJECT_DATE_PROPERTY,
  PROJECT_LIST_ERROR_LABEL,
  PROJECT_LOADING_LABEL,
  ProjectPage,
  getProjectCategories,
  getProjectCoverUrl,
  getProjectTitle,
} from "@/lib/projectNotion";

type ProjectListPayload = {
  results?: ProjectPage[];
  error?: string;
};

export default function Projects() {
  const [data, setData] = useState<ProjectPage[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [coverLoadFailed, setCoverLoadFailed] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      try {
        setLoadError(null);

        const response = await fetch("/api/notion", { cache: "no-store" });
        const payload = (await response.json()) as ProjectListPayload;

        if (!response.ok) {
          throw new Error(payload.error || PROJECT_LIST_ERROR_LABEL);
        }

        if (!cancelled) {
          setData(payload.results || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);

        if (!cancelled) {
          setData([]);
          setLoadError(getErrorMessage(error, PROJECT_LIST_ERROR_LABEL));
        }
      }
    };

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setCoverLoadFailed({});
  }, [data]);

  const markCoverAsFailed = (pageId: string) => {
    setCoverLoadFailed((previous) => {
      if (previous[pageId]) {
        return previous;
      }

      return {
        ...previous,
        [pageId]: true,
      };
    });
  };

  const tags = useMemo(
    () =>
      [
        ...new Set(
          data.flatMap((item) =>
            (item.properties?.[PROJECT_CATEGORY_PROPERTY]?.multi_select ?? []).map((tag) => tag.name)
          )
        ),
      ].sort(),
    [data]
  );

  const filteredData = filter
    ? data.filter((item) => getProjectCategories(item).some((tag) => tag.name === filter))
    : data;

  return (
    <div className="flex justify-center h-full">
      <div
        className="w-[70vw] h-full flex flex-col items-center overflow-y-auto overscroll-none"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="w-full">
          <div className="flex flex-col sm:flex-row gap-4 my-10 xl:my-20">
            {tags.map((tag) => (
              <button
                key={tag}
                className={`relative min-w-[120px] px-4 py-3 xl:px-6 rounded-full text-xs md:text-sm xl:text-lg font-light text-white border-0 hover:translate-y-[-4px] ${
                  filter === tag ? "bg-white/30" : "bg-transparent text-black"
                } pointer-events-auto`}
                onClick={() => setFilter(filter === tag ? null : tag)}
              >
                <div className="absolute inset-0 bg-white/10 glassEffect z-[-1] rounded-full" />
                {tag}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 w-full mb-20 pointer-events-auto">
            {loadError ? (
              <p className="text-gray-300 col-span-full text-center">{loadError}</p>
            ) : filteredData.length > 0 ? (
              filteredData
                .sort((left, right) => {
                  const leftDate = left.properties[PROJECT_DATE_PROPERTY]?.date?.start
                    ? new Date(left.properties[PROJECT_DATE_PROPERTY].date!.start)
                    : new Date(0);
                  const rightDate = right.properties[PROJECT_DATE_PROPERTY]?.date?.start
                    ? new Date(right.properties[PROJECT_DATE_PROPERTY].date!.start)
                    : new Date(0);
                  return rightDate.getTime() - leftDate.getTime();
                })
                .map((item) => {
                  const coverUrl = getProjectCoverUrl(item);
                  const showCoverFallback = !coverUrl || coverLoadFailed[item.id];

                  return (
                    <Link
                      key={item.id}
                      href={`/project/${item.id}`}
                      className="group relative aspect-[7/5] p-4 rounded-3xl cursor-pointer transition-transform hover:scale-[98%] flex items-center justify-center text-center overflow-hidden"
                    >
                      {!showCoverFallback ? (
                        <img
                          src={coverUrl}
                          alt=""
                          loading="lazy"
                          onError={() => markCoverAsFailed(item.id)}
                          className="absolute inset-0 w-full h-full object-cover rounded-3xl"
                          aria-hidden="true"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-white/10 glassEffect rounded-3xl" />
                      )}
                      <div className="absolute w-full h-full group-hover:bg-white/15 transition-opacity duration-500" />

                      <h3 className="relative z-10 text-lg md:text-xl lg:text-2xl 2xl:text-3xl font-semibold text-transparent group-hover:text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.6)] break-words leading-tight text-center">
                        {getProjectTitle(item)}
                      </h3>
                    </Link>
                  );
                })
            ) : (
              <p className="text-gray-300 col-span-full text-center">{PROJECT_LOADING_LABEL}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
