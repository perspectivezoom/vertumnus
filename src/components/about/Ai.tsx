import { AboutMarkdown } from '@/src/components/about/AboutMarkdown';
import source from '@/src/components/about/Ai.md' with { type: 'text' };
import { Article, HiringNotice, Notice } from '@/src/components/about/Prose';
import { useTitle } from '@/src/lib/title';

/**
 * How the project was built alongside a model, and the record of it.
 *
 * The commentary is the author's own and unassisted; the transcript is the unedited session log,
 * which is why it can be searched rather than summarised.
 */
export function Ai() {
  useTitle('ai usage');
  return (
    <Article>
      <Notice label="AI usage">
        <p>The copy on this page was handwritten from scratch.</p>
      </Notice>
      <AboutMarkdown>{source}</AboutMarkdown>
      <HiringNotice />
    </Article>
  );
}
