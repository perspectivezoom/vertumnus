/**
 * What Claude wrote, rendered as the Markdown it was written in.
 *
 * `markdown-to-jsx` rather than a hand-rolled subset: the log grows every session and will
 * eventually contain constructs nobody anticipated, and a renderer that silently mis-parses one
 * is a bug nobody notices because the page still looks fine. It produces React elements, so no
 * markup string is ever built and there is nothing to inject.
 *
 * Only a reader who opens the transcript ever loads it — that route is lazy, so this and its
 * ~28 KB stay out of the poster's bundle entirely (see src/App.tsx).
 *
 * Everything inherits the monospace and size of the bubble it sits in, so the styling here is
 * only what distinguishes one block from another. Code is the notable case: in a body that is
 * already monospace it cannot lean on the typeface, so it leans on a background instead.
 */
import Markdown from 'markdown-to-jsx';

const LINK = 'text-green-700 underline underline-offset-2 hover:text-green-900';
const HEADING = 'pt-1 font-semibold text-neutral-900';

/**
 * Raw HTML in the source is text, not markup.
 *
 * On by default, and dangerous for exactly this content: the log is full of code, and a bare
 * `<Foo bar>` in prose parses to an empty `<Foo>` element with the attribute silently dropped.
 * Not an injection — the tag filter handles that — but quiet data loss in a document whose only
 * purpose is to be an accurate record. Nothing here is ever meant to render as an element.
 */
const options = {
  disableParsingRawHTML: true,
  overrides: {
    // Rendered as paragraphs, not headings. A reply is a remark inside a page, not a document of
    // its own, and 74 of them open with `##` — as real headings those would land in the outline
    // above the page's, leaving a reader navigating by heading with a hundred false landmarks.
    h1: { component: 'p', props: { className: HEADING } },
    h2: { component: 'p', props: { className: HEADING } },
    h3: { component: 'p', props: { className: HEADING } },
    h4: { component: 'p', props: { className: HEADING } },
    ul: { props: { className: 'flex list-disc flex-col gap-1 pl-5' } },
    ol: { props: { className: 'flex list-decimal flex-col gap-1 pl-5' } },
    strong: { props: { className: 'font-semibold text-neutral-900' } },
    blockquote: {
      props: { className: 'border-l-2 border-neutral-300 pl-3 text-neutral-500 italic' },
    },
    hr: { props: { className: 'border-neutral-200' } },
    a: { props: { target: '_blank', rel: 'noreferrer', className: LINK } },
    code: { props: { className: 'rounded bg-neutral-100 px-1 py-0.5 text-neutral-800' } },
    // A fenced block wraps its <code> in a <pre>, and that inner element would otherwise keep the
    // inline pill styling above and draw a second background inside this one.
    pre: {
      props: {
        className:
          'overflow-x-auto rounded border border-neutral-200 bg-neutral-50 p-3 [&>code]:bg-transparent [&>code]:p-0',
      },
    },
    // `block` so the table can scroll: a table cannot overflow on its own, and the alternative
    // is the widest one on the page deciding how wide the conversation column is.
    table: { props: { className: 'block w-full overflow-x-auto border-collapse text-left' } },
    th: { props: { className: 'border-b border-neutral-300 px-2 py-1 font-semibold' } },
    td: { props: { className: 'border-b border-neutral-100 px-2 py-1 align-top' } },
  },
} as const;

export function TranscriptMarkdown({ text }: { text: string }) {
  return (
    // The class list goes on the renderer's own wrapper rather than a div around it: it emits one
    // element containing every block, so an outer flex container would have a single child to
    // space and the paragraphs would run together.
    //
    // `forceWrapper` because without it a reply of one paragraph is returned bare, and the
    // spacing would then depend on how much Claude happened to write.
    <Markdown
      options={{ ...options, wrapper: 'div', forceWrapper: true }}
      className="flex flex-col gap-2"
    >
      {text}
    </Markdown>
  );
}
