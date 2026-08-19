import { type ComponentProps, useEffect, useState } from 'react';

import { Expander, optionClass, ROW } from '@/src/components/poster/Expander';
import { convertLength, matchPaperSize, PAPER_SIZES, type Unit, UNITS } from '@/src/lib/paper';
import { useQueryParams, useSetQueryParams } from '@/src/lib/params';

/** Collapsible paper-size control: the current size, expanding to presets + a custom size. */
export function PaperSizeSelector() {
  const { w, h, unit } = useQueryParams();
  const setQueryParams = useSetQueryParams();
  const activeName = matchPaperSize(w, h, unit);

  return (
    <Expander
      label="Paper size"
      summary={`${activeName ?? 'Custom'} · ${formatNum(w)} × ${formatNum(h)} ${unit}`}
    >
      {PAPER_SIZES.map((size) => (
        <li key={size.name}>
          <button
            type="button"
            onClick={() =>
              setQueryParams({ w: String(size.w), h: String(size.h), unit: size.unit })
            }
            className={optionClass(activeName === size.name)}
          >
            <span>{size.name}</span>
            <span className="text-neutral-500 tabular-nums">
              {formatNum(size.w)} × {formatNum(size.h)} {size.unit}
            </span>
          </button>
        </li>
      ))}
      <CustomPaperRow w={w} h={h} unit={unit} active={activeName === null} />
    </Expander>
  );
}

/** The "Custom" row: width/height inputs that commit on blur/Enter, plus an in/cm toggle. */
function CustomPaperRow({
  w,
  h,
  unit,
  active,
}: {
  w: number;
  h: number;
  unit: Unit;
  active: boolean;
}) {
  const setQueryParams = useSetQueryParams();
  const [draftW, setDraftW] = useState(formatNum(w));
  const [draftH, setDraftH] = useState(formatNum(h));

  // Resync drafts when the size changes elsewhere (a preset click or a unit toggle).
  useEffect(() => {
    setDraftW(formatNum(w));
    setDraftH(formatNum(h));
  }, [w, h]);

  const commit = () => {
    const nextW = Number(draftW);
    const nextH = Number(draftH);
    if (Number.isFinite(nextW) && nextW > 0 && Number.isFinite(nextH) && nextH > 0) {
      setQueryParams({ w: String(nextW), h: String(nextH) });
    } else {
      setDraftW(formatNum(w));
      setDraftH(formatNum(h));
    }
  };

  return (
    <li className={`${ROW} ${active ? 'bg-green-50' : ''}`}>
      <span>Custom</span>
      <div className="flex items-center gap-1">
        <DimensionInput
          aria-label="Width"
          value={draftW}
          onChange={(event) => setDraftW(event.target.value)}
          onBlur={commit}
        />
        <span className="text-neutral-400">×</span>
        <DimensionInput
          aria-label="Height"
          value={draftH}
          onChange={(event) => setDraftH(event.target.value)}
          onBlur={commit}
        />
        <div
          role="group"
          aria-label="Measurement unit"
          className="ml-1 flex overflow-hidden rounded border border-neutral-300"
        >
          {UNITS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === unit}
              aria-label={option === 'in' ? 'Inches' : 'Centimeters'}
              onClick={() =>
                option !== unit &&
                setQueryParams({
                  unit: option,
                  w: String(convertLength(w, unit, option)),
                  h: String(convertLength(h, unit, option)),
                })
              }
              className={`px-2 py-0.5 text-sm ${option === unit ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}

function DimensionInput(props: ComponentProps<'input'>) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min="0"
      step="any"
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
      className="w-20 rounded border border-neutral-300 px-1 py-0.5 text-right text-sm text-neutral-700 tabular-nums"
      {...props}
    />
  );
}

function formatNum(value: number): string {
  return String(Math.round(value * 100) / 100);
}
