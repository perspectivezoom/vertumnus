import { Section } from '@/src/components/about/AboutShell';

/**
 * Where the numbers come from and what was done to them.
 *
 * One section rather than two: a citation without its method is not much use — knowing the data
 * is USDA shipment volume tells you little until you know it was filtered to nearby districts
 * and voted on season by season.
 */
export function Sources() {
  return (
    <Section title="Sources">
      <p className="text-neutral-400 italic">
        To come: the USDA Market News reports each crop is derived from, the growing districts each
        region counts and why, how weekly shipment volume becomes peak, uncertain and available, and
        the provenance of the watercolour plates.
      </p>
    </Section>
  );
}
