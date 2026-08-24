import { Check } from 'lucide-react';

import type { Produce } from '@/data/regions/schema';
import { Expander, optionClass } from '@/src/components/poster/Expander';
import { cropSlug, cropsParam, defaultCrops } from '@/src/lib/crops';
import { useQueryParams, useRegion, useSetQueryParams } from '@/src/lib/params';

/**
 * Fewest crops the poster is designed to draw.
 *
 * The ridgeline divides the card's height between its rows, so a handful of crops stretch into
 * towers rather than reading as seasons. A URL can still name fewer — the chart renders it, and
 * it is simply not a layout we support.
 */
const MIN_CROPS = 5;

/**
 * Collapsible crop control: which produce the poster shows, in the poster's own order.
 *
 * Listed by earliest peak, the same order the chart reads down, so the control and the artwork
 * agree — hunting for a crop alphabetically in one and by season in the other would make the
 * two feel like different documents.
 */
export function CropPicker() {
  // The region's full list, not the poster's filtered one: this is the control that does the
  // filtering, so it has to show the crops currently switched off as well.
  const { items } = useRegion();
  const { crops } = useQueryParams();
  const setParams = useSetQueryParams();
  const chosen =
    crops.length > 0 ? new Set(crops) : new Set(defaultCrops(items).map((i) => cropSlug(i.name)));

  const toggle = (item: Produce): void => {
    const slug = cropSlug(item.name);
    const next = new Set(chosen);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    if (next.size < MIN_CROPS) return;
    const selected = items.filter((i) => next.has(cropSlug(i.name)));
    setParams({ crops: cropsParam(items, selected) });
  };

  const atFloor = chosen.size <= MIN_CROPS;
  const summary =
    chosen.size === items.length ? `All ${items.length}` : `${chosen.size} of ${items.length}`;

  return (
    <Expander label="Produce" summary={summary}>
      {items.map((item) => {
        const active = chosen.has(cropSlug(item.name));
        return (
          <CropRow
            key={item.name}
            item={item}
            active={active}
            // At the floor the ticked rows are what is holding the poster up, so they stop being
            // removable rather than silently ignoring the click.
            locked={active && atFloor}
            onToggle={() => toggle(item)}
          />
        );
      })}
    </Expander>
  );
}

/** One crop in the list: its ribbon colour, its name, and whether the poster is showing it. */
function CropRow({
  item,
  active,
  locked,
  onToggle,
}: {
  item: Produce;
  active: boolean;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        disabled={locked}
        title={locked ? `A poster needs at least ${MIN_CROPS} crops` : undefined}
        className={`${optionClass(active)} ${locked ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.name}
        </span>
        {active && <Check className="h-4 w-4 text-green-700" />}
      </button>
    </li>
  );
}
