import { setQueryParam, useQueryParams } from '@/lib/queryParams';

/** Intro banner, open by default; dismisses to a floating button pinned bottom-right. */
export function Banner() {
  const { hideBanner } = useQueryParams();

  if (hideBanner) {
    return (
      <button
        type="button"
        onClick={() => setQueryParam('hideBanner', null)}
        aria-label="About Vertumnus"
        className="fixed right-4 bottom-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-green-700 font-serif text-lg text-white shadow-lg"
      >
        i
      </button>
    );
  }

  return (
    <aside className="fixed top-1/2 left-1/2 z-10 w-80 max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-neutral-200 bg-white p-6 shadow-xl">
      <button
        type="button"
        onClick={() => setQueryParam('hideBanner', 'true')}
        aria-label="Dismiss"
        className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:text-neutral-700"
      >
        ×
      </button>
      <h2 className="text-lg font-semibold text-neutral-900">Vertumnus</h2>
    </aside>
  );
}
