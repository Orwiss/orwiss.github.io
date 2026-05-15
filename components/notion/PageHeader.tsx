import {
  type ProjectPage,
  getProjectTitle,
  getProjectDateValue,
  getProjectCategories,
  getProjectTools,
  getProjectParticipants,
} from "@/lib/projectNotion";

export function PageHeader({ page }: { page: ProjectPage }) {
  const title = getProjectTitle(page);
  const date = getProjectDateValue(page);
  // Display year only (first four chars of YYYY-MM-DD).
  const year = date ? date.slice(0, 4) : null;
  const categories = getProjectCategories(page);
  const tools = getProjectTools(page);
  const participants = getProjectParticipants(page);

  return (
    <header className="max-w-3xl mx-auto px-6 pt-20 pb-2">
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight break-keep leading-tight">
        {title}
      </h1>
      {year ? (
        <p className="mt-4 text-xs opacity-60 tracking-wide">{year}</p>
      ) : null}
      {participants.length > 0 && participants[0]?.plain_text ? (
        <p className="mt-3 text-sm whitespace-pre-wrap break-keep">
          {participants[0].plain_text}
        </p>
      ) : null}
      {(categories.length > 0 || tools.length > 0) ? (
        <div className="flex flex-wrap gap-1.5 mt-5">
          {categories.map((tag) => (
            <span
              key={`cat-${tag.id}`}
              className="border border-black px-2 py-0.5 text-[0.7rem] bg-black text-white"
            >
              {tag.name}
            </span>
          ))}
          {tools.map((tag) => (
            <span
              key={`tool-${tag.id}`}
              className="border border-black px-2 py-0.5 text-[0.7rem]"
            >
              {tag.name}
            </span>
          ))}
        </div>
      ) : null}
    </header>
  );
}
