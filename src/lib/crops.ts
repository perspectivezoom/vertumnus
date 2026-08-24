import type { Produce } from '@/data/regions/schema';

/**
 * Which crops a poster shows, carried in the URL so a poster someone tuned is a link they can
 * send. Slugs rather than short ids or a bitmask: a bitmask is positional, so adding one crop
 * would silently reinterpret every link already shared, and short ids would be a second naming
 * system to invent and keep in step with the first. A name already identifies a crop.
 */

/** URL form of a crop name: `Tomatoes` → `tomatoes`, `Peppers, Bell` → `peppers-bell`. */
export function cropSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The crops a region shows unless a URL says otherwise. */
export function defaultCrops(items: readonly Produce[]): Produce[] {
  return items.filter((item) => item.default);
}

/**
 * The crops named by `slugs`, in the region's own order; the region's own default when nothing
 * is named.
 *
 * An absent parameter means the default set rather than everything — a bare `/sfbay` is the
 * poster's front door, and it should show what someone would expect to find at a market rather
 * than every crop we happen to have data for. Unknown slugs are ignored rather than treated as
 * an error, so a link that outlives a crop still resolves to a sensible poster, not a blank one.
 */
export function selectCrops(items: readonly Produce[], slugs: readonly string[]): Produce[] {
  if (slugs.length === 0) return defaultCrops(items);
  const wanted = new Set(slugs);
  const picked = items.filter((item) => wanted.has(cropSlug(item.name)));
  return picked.length > 0 ? picked : defaultCrops(items);
}

/**
 * The parameter value for a selection, or null when it is the region's own default.
 *
 * A selection that matches the default should leave no trace in the URL — the plain address
 * stays the shareable one, and a link only carries a selection when it means something.
 */
export function cropsParam(items: readonly Produce[], selected: readonly Produce[]): string | null {
  const chosen = selected.map((item) => cropSlug(item.name));
  const fallback = defaultCrops(items).map((item) => cropSlug(item.name));
  const same = chosen.length === fallback.length && chosen.every((slug, i) => slug === fallback[i]);
  return same ? null : chosen.join(',');
}
