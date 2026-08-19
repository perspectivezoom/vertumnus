import { Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { CropPicker } from '@/src/components/CropPicker';
import { PaperSizeSelector } from '@/src/components/PaperSizeSelector';
import { RegionPicker } from '@/src/components/RegionPicker';
import { useQueryParams, useSetQueryParams } from '@/src/lib/params';

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
  const setQueryParams = useSetQueryParams();

  return (
    <div className="pointer-events-none fixed inset-0 flex items-center justify-center p-6">
      <AnimatePresence initial={false}>
        {hideBanner ? (
          <motion.button
            key="icon"
            layoutId="banner"
            type="button"
            onClick={() => setQueryParams({ hideBanner: null })}
            aria-label="Open controls"
            initial={{ backgroundColor: '#ffffff' }}
            animate={{ backgroundColor: '#15803d' }}
            transition={{ layout: boxMorph, backgroundColor: revealLate }}
            className="pointer-events-auto absolute right-4 bottom-4 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-[filter] duration-150 hover:brightness-90"
          >
            <motion.span
              className="flex"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={revealLate}
            >
              <Info className="h-5 w-5" />
            </motion.span>
          </motion.button>
        ) : (
          <motion.aside
            key="card"
            layoutId="banner"
            transition={{ layout: boxMorph }}
            className="pointer-events-auto relative max-w-[90vw] rounded-lg border border-neutral-200 bg-white p-6 shadow-xl"
          >
            <button
              type="button"
              onClick={() => setQueryParams({ hideBanner: 'true' })}
              aria-label="Dismiss"
              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <X className="h-4 w-4" />
            </button>
            <BannerContent />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Lays out the banner's (growing) content: the intro, then the controls. */
function BannerContent() {
  return (
    <div className="min-w-[32rem] max-w-[36rem]">
      <Intro />
      <RegionPicker />
      <CropPicker />
      <PaperSizeSelector />
    </div>
  );
}

/** The banner's title and description. */
function Intro() {
  return (
    <>
      <h2 className="text-center text-lg font-semibold text-neutral-900">Vertumnus</h2>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
        Printable posters of what&rsquo;s in season at farmers&rsquo; markets. Data is specific to
        your region, with week-level granularity.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        Etymology: Vertumnus is the{' '}
        <a
          className="text-green-700 underline underline-offset-2 hover:text-green-900"
          href="https://en.wikipedia.org/wiki/Vertumnus"
          target="_blank"
          rel="noreferrer"
        >
          Roman god of seasons, change and plant growth
        </a>
        .
      </p>
    </>
  );
}
