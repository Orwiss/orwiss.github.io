"use client";

import { useState } from "react";
import { SmoothLink } from "./SmoothLink";
import { categories, HUB_LABEL, type Project } from "@/lib/projects";

export function ListView({ projects }: { projects: Project[] }) {
  return (
    <div className="h-full w-full overflow-y-auto">
      {/* Headers stay full-width centred at all sizes; only the project
          list within each category flows into 2 columns on wide
          viewports. lg: kicks in at 1024px — at that width each column
          has ~480px for cover + title + meta, comfortably wider than
          the cover (128px) + label. max-w grows to 6xl so two columns
          aren't squeezed. */}
      <div className="max-w-3xl lg:max-w-6xl mx-auto px-6 py-20">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-16">
          {HUB_LABEL}
        </h1>
        {categories.map((cat) => {
          // Newest year first within each category; projects without a
          // year sink to the bottom. Array#sort is stable in modern
          // engines so ties preserve Notion's incoming order.
          const inCategory = projects
            .filter((p) => p.categoryId === cat.id)
            .slice()
            .sort((a, b) => Number(b.year ?? 0) - Number(a.year ?? 0));
          if (inCategory.length === 0) return null;
          return (
            <section key={cat.id} className="mb-14">
              <h2 className="text-2xl font-semibold tracking-tight border-b border-black pb-2 mb-5">
                {cat.label}
              </h2>
              <ul className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">
                {inCategory.map((p) => (
                  <ProjectRow key={p.id} project={p} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ProjectRow({ project }: { project: Project }) {
  const [coverFailed, setCoverFailed] = useState(false);
  return (
    <li>
      <SmoothLink
        href={`/project/${project.id}`}
        className="flex items-center gap-4 p-2 -mx-2 hover:bg-[#39FF14] hover:text-black transition-colors group"
      >
        <div className="w-32 h-20 flex-shrink-0 border border-black bg-white overflow-hidden">
          {!coverFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/notion/cover/${project.id}`}
              alt=""
              loading="lazy"
              draggable={false}
              className="w-full h-full object-cover block"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div className="w-full h-full bg-black/[0.05] flex items-center justify-center">
              <span className="text-[0.6rem] opacity-50 font-mono">no cover</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-medium leading-snug break-keep">
            {project.title}
          </div>
          {(project.year || project.tags.length > 0) && (
            <div className="mt-1 text-xs opacity-60 flex flex-wrap gap-x-2 gap-y-0.5">
              {project.year ? <span>{project.year}</span> : null}
              {project.year && project.tags.length > 0 ? (
                <span aria-hidden>·</span>
              ) : null}
              {project.tags.length > 0 ? (
                <span className="truncate">{project.tags.join(" / ")}</span>
              ) : null}
            </div>
          )}
        </div>
      </SmoothLink>
    </li>
  );
}
