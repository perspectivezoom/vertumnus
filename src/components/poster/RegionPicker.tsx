import { useNavigate, useParams } from 'react-router';

import { Expander, optionClass } from '@/src/components/poster/Expander';
import { defaultRegion, regions } from '@/data/regions';

/** Collapsible region control: the current region, expanding to a clickable list. */
export function RegionPicker() {
  const { region: activeId } = useParams();
  const navigate = useNavigate();
  const current = regions.find((r) => r.id === activeId) ?? defaultRegion;

  return (
    <Expander label="Region" summary={current.name}>
      {regions.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => navigate(`/${r.id}`)}
            className={optionClass(r.id === current.id)}
          >
            <span>{r.name}</span>
          </button>
        </li>
      ))}
    </Expander>
  );
}
