import { Article, Body, SectionTitle } from '@/src/components/about/Prose';

/**
 * How the project was built alongside a model, and the record of it.
 *
 * The commentary is the author's own and unassisted; the transcript is the unedited session log,
 * which is why it can be searched rather than summarised.
 */
export function Ai() {
  return (
    <Article>
      <SectionTitle>AI usage</SectionTitle>
      <Body>
        <p className="text-neutral-400 italic">
          To come: commentary on building this with a model. The conversation itself is in the AI
          transcript section.
        </p>
      </Body>
    </Article>
  );
}
