import { useEffect } from 'react';

/** What the tab, a bookmark and a history entry call this page. */
export function useTitle(page: string): void {
  useEffect(() => {
    document.title = `${page} · ${SITE}`;
  }, [page]);
}

const SITE = 'vertumnus';
