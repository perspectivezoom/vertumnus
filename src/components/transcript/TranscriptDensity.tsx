/**
 * How much of each turn to show.
 *
 * Two choices rather than one preset, because the useful combinations are not on a single axis:
 * a reader skimming their own prompts wants the replies gone, while one scanning for something
 * Claude said wants both shortened but present.
 */
import { Density, type Densities } from '@/src/components/transcript/selection';

export function TranscriptDensity({
  densities,
  onChange,
}: {
  densities: Densities;
  onChange: (next: Partial<Densities>) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-neutral-400">
      <Choice
        label="Prompts"
        value={densities.prompts}
        // Never hidden: a prompt is what an exchange is.
        options={[Density.Full, Density.Short]}
        onPick={(prompts) => onChange({ prompts })}
      />
      <Choice
        label="Responses"
        value={densities.responses}
        options={[Density.Full, Density.Short, Density.Hidden]}
        onPick={(responses) => onChange({ responses })}
      />
    </div>
  );
}

function Choice({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: Density;
  options: readonly Density[];
  onPick: (next: Density) => void;
}) {
  return (
    <span className="flex items-baseline gap-1">
      {label}
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onPick(option)}
          className={`rounded px-1.5 py-0.5 capitalize ${
            option === value
              ? 'bg-green-50 text-green-900'
              : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
          }`}
        >
          {option}
        </button>
      ))}
    </span>
  );
}
