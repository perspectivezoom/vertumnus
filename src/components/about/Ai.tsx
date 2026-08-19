import { Section } from '@/src/components/about/AboutShell';

/**
 * How the project was built alongside a model, and the record of it.
 *
 * The commentary is the author's own and unassisted; the transcript is the unedited session log,
 * which is why it can be searched rather than summarised.
 */
export function Ai() {
  return (
    <Section title="AI">
      <p className="text-neutral-400 italic">
        To come: commentary on building this with a model, and a searchable transcript of the
        sessions that produced it — including where the model reached something original, and where
        an assumption of its had to be corrected.
      </p>
    </Section>
  );
}
