"use client";

import { useState } from "react";
import Link from "next/link";
import { categories, HUB_LABEL, type Project } from "@/lib/projects";

export function ListView({ projects }: { projects: Project[] }) {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-16">
          {HUB_LABEL}
        </h1>
        {categories.map((cat) => {
          const inCategory = projects.filter((p) => p.categoryId === cat.id);
          if (inCategory.length === 0) return null;
          return (
            <section key={cat.id} className="mb-14">
              <h2 className="text-2xl font-semibold tracking-tight border-b border-black pb-2 mb-5">
                {cat.label}
              </h2>
              <ul className="flex flex-col">
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
      <Link
        href={`/project/${project.id}`}
        className="flex items-center gap-4 p-2 -mx-2 hover:bg-black hover:text-white transition-colors group"
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
        <span className="text-lg font-medium leading-snug break-keep">
          {project.title}
        </span>
      </Link>
    </li>
  );
}
