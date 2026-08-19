import { Section } from '@/src/components/about/AboutShell';

/** What the site is built on, and the notices that have to travel with it. */
export function Licenses() {
  return (
    <Section title="Licenses">
      <p className="text-neutral-400 italic">
        To come: the two typefaces under the SIL Open Font License, the runtime dependencies under
        MIT and ISC, and the USDA material — both the shipment data and the watercolours — in the US
        public domain.
      </p>
    </Section>
  );
}
