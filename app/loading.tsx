// Route segment loading UI for the home page. App Router shows this
// during the initial Notion list fetch on cold hits; once data is in
// HomeClient renders the mindmap which itself fades in via the
// is-ready opacity gate inside MindMapInner — so the user goes:
//   loading… → blank (very brief) → mindmap fade-in
// rather than seeing nodes visibly snap into position.
export default function HomeLoading() {
  return (
    <main className="h-full w-full flex items-center justify-center">
      <div
        className="text-sm tracking-wide opacity-50 select-none"
        aria-label="Loading"
      >
        <span>loading</span>
        <span className="inline-block animate-pulse">…</span>
      </div>
    </main>
  );
}
