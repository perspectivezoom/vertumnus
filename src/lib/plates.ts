import cherry from '@/src/images/plates/sfbay/POM00004450.webp';
import grape from '@/src/images/plates/sfbay/POM00006232.webp';
import nectarine from '@/src/images/plates/sfbay/POM00005704.webp';
import peach from '@/src/images/plates/sfbay/POM00005136.webp';
import pear from '@/src/images/plates/sfbay/POM00007001.webp';
import persimmon from '@/src/images/plates/sfbay/POM00001088.webp';
import plum from '@/src/images/plates/sfbay/POM00004736.webp';

/**
 * A watercolour plate from the USDA Pomological Watercolor Collection.
 *
 * Painted for the Department of Agriculture between 1886 and 1942 to record fruit varieties, and
 * in the US public domain as government work. They are the same department that publishes the
 * shipment data the seasons are derived from, and each plate names the town its specimen came
 * from — so the art is of the region rather than merely decorating it.
 */
export interface Plate {
  /** NAL accession number; also the filename, so a plate can be traced back to the archive. */
  accession: string;
  src: string;
  /** What it shows and where the specimen was grown. */
  subject: string;
  origin: string;
  /**
   * The crop this plate depicts, exactly as the poster names it, when the poster has one.
   *
   * Stated rather than inferred from `subject`: the collection's names are singular specimens
   * ("Cherry") and a crop is a plural row ("Cherries"), and pairing them by string surgery would
   * be a rule that silently mismatches the first time a name does not follow the pattern.
   */
  crop?: string;
}

/**
 * Plates by region, most-wanted first — the solver takes them in order as it finds gaps, so the
 * strongest image lands in the largest space. Assets are filed by region to match, so a
 * region's imagery is a directory rather than a naming convention.
 *
 * Chosen for locality rather than looks: every one was painted from fruit grown in or near the
 * districts the region's data is filtered to, and the sheets carry the town in the artist's own
 * hand. Ordered by how much of its sheet the fruit fills, since a plate placed small wants a
 * subject that still reads at that size.
 */
export const PLATES: Record<string, readonly Plate[]> = {
  sfbay: [
    { accession: 'POM00006232', src: grape, subject: 'Grape', origin: 'Napa, CA', crop: 'Grapes' },
    {
      accession: 'POM00004736',
      src: plum,
      subject: 'Plum',
      origin: 'Vacaville, CA',
      crop: 'Plums',
    },
    {
      accession: 'POM00005136',
      src: peach,
      subject: 'Peach',
      origin: 'Morgan Hill, CA',
      crop: 'Peaches',
    },
    {
      accession: 'POM00004450',
      src: cherry,
      subject: 'Cherry',
      origin: 'Santa Clara, CA',
      crop: 'Cherries',
    },
    {
      accession: 'POM00005704',
      src: nectarine,
      subject: 'Nectarine',
      origin: 'Marysville, CA',
      crop: 'Nectarines',
    },
    {
      accession: 'POM00001088',
      src: persimmon,
      subject: 'Persimmon',
      origin: 'Chico, CA',
      crop: 'Persimmons',
    },
    // No pear on any poster yet; it fills a gap when the depicted plates run out.
    { accession: 'POM00007001', src: pear, subject: 'Pear', origin: 'Santa Clara, CA' },
  ],
};

/**
 * A region's plates, those depicting a crop on the poster first.
 *
 * A loose tie rather than a strict one: the collection has no plate for most crops, and the
 * gaps the solver finds have nothing to do with which crops are showing. So this is a
 * preference — pick a cherry when cherries are on the poster — and the remaining plates still
 * fill whatever space is left rather than leaving it bare.
 */
export function platesFor(regionId: string, shown: readonly { name: string }[]): readonly Plate[] {
  const names = new Set(shown.map((item) => item.name));
  const all = PLATES[regionId] ?? [];
  const depicted = all.filter((plate) => plate.crop !== undefined && names.has(plate.crop));
  const others = all.filter((plate) => !depicted.includes(plate));
  return [...depicted, ...others];
}

/** Every plate is a portrait scan of roughly this shape, which is what the solver fits gaps to. */
export const PLATE_ASPECT = 0.65;
