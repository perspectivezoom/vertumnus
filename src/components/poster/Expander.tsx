import { ChevronDown, ChevronUp } from 'lucide-react';
import { type ReactNode, useState } from 'react';

/** Base chrome for the rows in an Expander's list. */
export const ROW = 'flex items-center justify-between rounded px-3 py-1.5 text-sm';

/** Class for a clickable option row in an Expander's list, highlighted when active. */
export const optionClass = (active: boolean): string =>
  `${ROW} w-full ${active ? 'bg-green-50' : 'hover:bg-neutral-100'}`;

/**
 * A collapsible control: a labeled header showing the current value, which expands
 * to a list of rows (styled with `optionClass` / `ROW`). Owns its open/closed state.
 */
export function Expander({
  label,
  summary,
  children,
}: {
  label: string;
  summary: ReactNode;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
      >
        <span className="text-neutral-500">{label}</span>
        <span className="flex items-center gap-1 text-neutral-900 tabular-nums">
          {summary}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Capped and scrollable: the point of a control is to watch the poster change as you
          use it, and a list long enough to cover the chart defeats that. */}
      {expanded && (
        <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto overscroll-contain">
          {children}
        </ul>
      )}
    </div>
  );
}
