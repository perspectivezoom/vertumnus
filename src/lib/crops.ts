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

/**
 * The crops named by `slugs`, in the region's own order; everything when nothing is named.
 *
 * An absent parameter has to mean "all", not "none" — a bare `/sfbay` is the poster's front
 * door. Unknown slugs are ignored rather than treated as an error, so a link that outlives a
 * crop still resolves to a sensible poster instead of a blank one.
 */
export function selectCrops(items: readonly Produce[], slugs: readonly string[]): Produce[] {
  if (slugs.length === 0) return [...items];
  const wanted = new Set(slugs);
  const picked = items.filter((item) => wanted.has(cropSlug(item.name)));
  return picked.length > 0 ? picked : [...items];
}

/**
 * The parameter value for a selection, or null when it is the whole list.
 *
 * Selecting everything is the default, so it should leave no trace in the URL — the plain
 * address stays the shareable one, and a link only carries a selection if it means something.
 */
export function cropsParam(items: readonly Produce[], selected: readonly Produce[]): string | null {
  if (selected.length === items.length) return null;
  return selected.map((item) => cropSlug(item.name)).join(',');
}
