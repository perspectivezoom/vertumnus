import type { Region } from '@/data/types';
import { buildPoster } from '@/lib/poster/geometry';

interface PosterProps {
  region: Region;
}

export function Poster({ region }: PosterProps) {
  const model = buildPoster(region);

  return (
    <svg
      className="block h-auto w-full font-sans"
      viewBox={`0 0 ${model.width} ${model.height}`}
      role="img"
      aria-label={`In-season produce for ${region.name}`}
    >
      {model.months.map((m) => (
        <text key={m.label} className="fill-[#888] text-[11px]" x={m.x} y={24} textAnchor="middle">
          {m.label}
        </text>
      ))}

      {model.ribbons.map((r) => (
        <g key={r.name}>
          <path
            d={r.path}
            fill={r.color}
            stroke={r.color}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <text
            className="fill-white text-[12px] font-medium"
            x={r.labelX}
            y={r.labelY}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {r.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
