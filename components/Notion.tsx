"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { primeProjectDetail, primeProjectPreview } from "@/lib/projectDetailClient";
import { trackSiteEvent } from "@/lib/tracking";
import {
  PROJECT_CATEGORY_PROPERTY,
  PROJECT_DATE_PROPERTY,
  PROJECT_LOADING_LABEL,
  ProjectPage,
  getProjectCategories,
  getProjectCoverUrl,
  getProjectTitle,
} from "@/lib/projectNotion";

type ProjectsProps = {
  initialData: ProjectPage[];
  initialError?: string | null;
};

export default function Projects({ initialData, initialError = null }: ProjectsProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<string | null>(null);
  const [coverLoadFailed, setCoverLoadFailed] = useState<Record<string, boolean>>({});
  const prefetchedProjectIds = useRef(new Set<string>());
  const data = initialData;
  const loadError = initialError;

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

  const prepareProjectDetail = (item: ProjectPage, shouldWarmData = false) => {
    primeProjectPreview(item);

    if (shouldWarmData) {
      primeProjectDetail(item);
    }

    if (prefetchedProjectIds.current.has(item.id)) {
      return;
    }

    prefetchedProjectIds.current.add(item.id);
    router.prefetch(`/project/${item.id}`);
  };

  const handleProjectClick = (item: ProjectPage) => {
    prepareProjectDetail(item, true);
    trackSiteEvent({
      clarityEvent: "project:card_click",
      gaEvent: "project_card_click",
      payload: {
        project_id: item.id,
        project_title: getProjectTitle(item),
        project_category: getProjectCategories(item)
          .map((tag) => tag.name)
          .join(", "),
      },
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
                      prefetch={false}
                      onMouseEnter={() => prepareProjectDetail(item, true)}
                      onFocus={() => prepareProjectDetail(item, true)}
                      onTouchStart={() => prepareProjectDetail(item, true)}
                      onClick={() => handleProjectClick(item)}
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
