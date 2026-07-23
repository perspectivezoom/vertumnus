import { AnimatePresence, motion } from 'motion/react';

import { setQueryParam, useQueryParams } from '@/lib/queryParams';

// All banner timing derives from one morph duration.
const MORPH_S = 0.35;
// The card <-> icon box morph (position + size), shared by both states.
const boxMorph = { duration: MORPH_S, ease: 'easeInOut' } as const;
// The green fill + "i" stay hidden until the box has nearly landed (80% in),
// then fade in over the back half of the morph.
const revealLate = { delay: MORPH_S * 0.8, duration: MORPH_S * 0.5 };

/**
 * Intro banner, open by default as a centered card; dismisses to a floating button
 * pinned bottom-right. The two states share a `layoutId`, so Framer morphs the box
 * between center and corner — coupling their positions (travel + grow/shrink). The
 * green fill and "i" only fade in at the tail of the morph, so it reads as the card
 * travelling to the corner and *then* becoming the icon — not the icon appearing
 * up-front and sliding down.
 */
export function Banner() {
  const { hideBanner } = useQueryParams();

  return (
    <div className="pointer-events-none fixed inset-0 flex items-center justify-center p-6">
      <AnimatePresence initial={false}>
        {hideBanner ? (
          <motion.button
            key="icon"
            layoutId="banner"
            type="button"
            onClick={() => setQueryParam('hideBanner', null)}
            aria-label="Open controls"
            initial={{ backgroundColor: '#ffffff' }}
            animate={{ backgroundColor: '#15803d' }}
            transition={{ layout: boxMorph, backgroundColor: revealLate }}
            className="pointer-events-auto absolute right-4 bottom-4 flex h-10 w-10 items-center justify-center rounded-full font-serif text-lg text-white shadow-lg"
          >
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={revealLate}>
              i
            </motion.span>
          </motion.button>
        ) : (
          <motion.aside
            key="card"
            layoutId="banner"
            transition={{ layout: boxMorph }}
            className="pointer-events-auto relative w-80 max-w-[90vw] rounded-lg border border-neutral-200 bg-white p-6 shadow-xl"
          >
            <button
              type="button"
              onClick={() => setQueryParam('hideBanner', 'true')}
              aria-label="Dismiss"
              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:text-neutral-700"
            >
              ×
            </button>
            <h2 className="text-lg font-semibold text-neutral-900">Vertumnus</h2>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
