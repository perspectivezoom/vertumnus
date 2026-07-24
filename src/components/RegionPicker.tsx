import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { defaultRegion, regions } from '@/data/regions';

/** Collapsible region control: the current region, expanding to a clickable list (mirrors PaperSizeSelector). */
export function RegionPicker() {
  const { region: activeId } = useParams();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const current = regions.find((r) => r.id === activeId) ?? defaultRegion;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
      >
        <span className="text-neutral-500">Region</span>
        <span className="flex items-center gap-1 text-neutral-900">
          {current.name}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {expanded && (
        <ul className="mt-1 space-y-0.5">
          {regions.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => navigate(`/${r.id}`)}
                className={`flex w-full items-center justify-between rounded px-3 py-1.5 text-sm ${
                  r.id === current.id ? 'bg-green-50' : 'hover:bg-neutral-100'
                }`}
              >
                <span>{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
