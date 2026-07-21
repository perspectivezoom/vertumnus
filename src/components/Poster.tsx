import styles from '@/components/Poster.module.css';
import type { Region } from '@/data/types';
import { dimensions, LEVEL_FILL, monthTicks, spanRects } from '@/lib/poster/geometry';

interface PosterProps {
  region: Region;
}

export function Poster({ region }: PosterProps) {
  const d = dimensions(region.items.length);
  const months = monthTicks(d);

  return (
    <svg
      className={styles.poster}
      viewBox={`0 0 ${d.width} ${d.height}`}
      role="img"
      aria-label={`In-season produce for ${region.name}`}
    >
      {months.map((m) => (
        <text key={m.label} className={styles.month} x={m.x} y={d.gridTop - 18} textAnchor="middle">
          {m.label}
        </text>
      ))}

      {region.items.map((item, i) => {
        const y = d.gridTop + i * d.rowHeight;
        return (
          <g key={item.name}>
            <text className={styles.produce} x={8} y={y + d.rowHeight / 2}>
              {item.name}
            </text>
            {item.spans.map((s) =>
              spanRects(s.from, s.to, d).map((r) => (
                <rect
                  key={`${s.from}-${r.x}`}
                  x={r.x}
                  y={y + 8}
                  width={r.width}
                  height={d.rowHeight - 16}
                  rx={3}
                  fill={LEVEL_FILL[s.level]}
                />
              )),
            )}
          </g>
        );
      })}
    </svg>
  );
}
