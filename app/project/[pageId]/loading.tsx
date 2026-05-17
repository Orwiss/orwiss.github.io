// Route segment loading UI — automatically shown by the App Router
// while ProjectDetailPage's server data fetch is in flight. Keeps the
// previous page (the mindmap) from sitting visible during navigation;
// the user sees this minimal placeholder instead, then the rendered
// detail page slots in cleanly.
//
// Visual: just a single Happiness Sans label with a slow-pulsing
// trailing dot. Deliberately understated — heavy splash screens make
// the wait feel longer; one quiet beat reads as "loading" without
// drawing attention to itself.
export default function ProjectLoading() {
  return (
    <main className="h-full w-full flex items-center justify-center">
      <div
        className="text-sm tracking-wide opacity-50 select-none"
        aria-label="Loading project"
      >
        <span>loading</span>
        <span className="inline-block animate-pulse">…</span>
      </div>
    </main>
  );
}
