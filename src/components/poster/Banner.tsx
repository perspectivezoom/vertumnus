import { Info, Printer, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { CropPicker } from '@/src/components/poster/CropPicker';
import { RoundButton } from '@/src/components/poster/RoundButton';
import { PaperSizeSelector } from '@/src/components/poster/PaperSizeSelector';
import { RegionPicker } from '@/src/components/poster/RegionPicker';
import { useQueryParams, useSetQueryParams } from '@/src/lib/params';
import { HiringMessage } from '@/src/components/about/Prose';

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
    <div
      data-screen-only
      className="pointer-events-none fixed inset-0 flex items-center justify-center p-4 sm:p-6"
    >
      <AnimatePresence initial={false}>
        {hideBanner ? (
          <div key="icon" className="absolute right-4 bottom-4 flex items-center gap-2">
            <PrintButton />
            <motion.button
              layoutId="banner"
              type="button"
              onClick={() => setQueryParams({ hideBanner: null })}
              aria-label="Open controls"
              title="Open controls"
              initial={{ backgroundColor: '#ffffff' }}
              animate={{ backgroundColor: '#15803d' }}
              transition={{ layout: boxMorph, backgroundColor: revealLate }}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-[filter] duration-150 hover:brightness-90"
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
          </div>
        ) : (
          <motion.aside
            key="card"
            layoutId="banner"
            transition={{ layout: boxMorph }}
            // Bounded by its parent and scrollable inside that: a phone held sideways is
            // shorter than this card, and clipped controls would be unreachable.
            className="pointer-events-auto relative max-h-full max-w-full overflow-y-auto overscroll-contain rounded-lg border border-neutral-200 bg-white p-5 shadow-xl sm:max-w-[90vw] sm:p-6"
          >
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <PrintButton />
              <RoundButton onClick={() => setQueryParams({ hideBanner: 'true' })} label="Close">
                <X className="h-5 w-5" />
              </RoundButton>
            </div>
            <BannerContent />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Hands the poster to the browser's own print dialog.
 *
 * No custom dialog of its own: the reader already has one that knows their printers and paper,
 * and the poster is laid out in proportional units, so whatever they choose there is what it
 * scales to. The controls hide themselves for the print (see global.css).
 */
function PrintButton() {
  return (
    <RoundButton onClick={() => window.print()} label="Print poster">
      <Printer className="h-5 w-5" />
    </RoundButton>
  );
}

/**
 * Lays out the banner's (growing) content: the reading beside the controls.
 *
 * Two columns wherever there is room, since the card covers the poster it configures and a
 * stack of this is nearly twice as tall. Only a screen too narrow to divide gets the stack.
 */
function BannerContent() {
  return (
    // The width floor stops the card collapsing around short content, but is wider than a phone.
    <div className="flex w-full flex-col gap-4 sm:w-auto sm:min-w-[32rem] sm:max-w-[36rem] sm:flex-row sm:gap-6">
      <Intro />
      {/* Side by side, this column is the one under the floating buttons, so it starts below. */}
      <div className="flex flex-col gap-4 sm:flex-1 sm:pt-8">
        <RegionPicker />
        <CropPicker />
        <PaperSizeSelector />
      </div>
    </div>
  );
}

/** The banner's title and description. */
function Intro() {
  return (
    <div className="flex flex-col gap-3 sm:flex-1">
      {/* Stacked, the floating buttons are over this row; in columns they clear it. */}
      <h2 className="font-poster pr-24 text-lg font-semibold text-green-900 sm:pr-0">vertumnus</h2>
      <p className="text-xs leading-relaxed text-neutral-600">
        Printable posters of what&rsquo;s in season at your local farmers&rsquo; market. Produce
        data is specific to your region, with week-level granularity. Learn more{' '}
        <BannerLink href="/about">on the /about page</BannerLink>.
      </p>
      <p className="text-xs leading-relaxed text-neutral-600">
        vertumnus was wildly overengineered in a single 731 prompt Claude Opus 5 session over a 46
        day period. Read more at <BannerLink href="/about/ai">/about/ai</BannerLink>, or browse all
        prompts at <BannerLink href="/about/transcript">/about/transcript</BannerLink>.
      </p>
      <p className="text-xs leading-relaxed text-neutral-600">
        <HiringMessage />
      </p>
    </div>
  );
}

function BannerLink({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <a className="text-green-700 underline underline-offset-2 hover:text-green-900" href={href}>
      {children}
    </a>
  );
}
